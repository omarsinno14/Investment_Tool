import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";
import { sanitizeProfanity } from "@/lib/profanity";
import { decodeCursor, encodeCursor, paginationSchema } from "@/lib/pagination";
import { getCachedJson, setCachedJson } from "@/lib/cache";
import { applyRateLimitHeaders, rateLimit } from "@/lib/rate-limit";
import { getClientIp, getRequestId } from "@/lib/request-context";
import { jsonResponse, withTiming } from "@/lib/api-response";
import { withTimeout } from "@/lib/timeouts";
import { logger } from "@/lib/logger";
import { MAX_IMAGE_SIZE_BYTES, MAX_POST_BODY_LENGTH } from "@/lib/uploads";
import { uploadBuffer } from "@/lib/storage";
import { enqueueImageResize } from "@/lib/queue";
import { checkIdempotency } from "@/lib/idempotency";

export async function GET(req: Request) {
  return withTiming(async () => {
    const requestId = getRequestId(req);
    try {
      const prisma = getPrismaClient();
      if (!prisma) return jsonResponse(req, { error: "Database unavailable" }, 500, "forums", requestId);

      const userId = await requireUserId();
      if (!userId) return jsonResponse(req, { error: "Unauthorized" }, 401, "forums", requestId);

      const ip = getClientIp(req);
      const limitResult = await rateLimit(`forums:ip:${ip}`, 120, 60);
      if (!limitResult.allowed) {
        const response = jsonResponse(req, { error: "Rate limit exceeded" }, 429, "forums", requestId);
        return applyRateLimitHeaders(response, 120, limitResult);
      }

      const { searchParams } = new URL(req.url);
      const parsed = paginationSchema.safeParse({
        limit: searchParams.get("limit") ?? undefined,
        cursor: searchParams.get("cursor") ?? undefined,
      });
      if (!parsed.success) {
        return jsonResponse(req, { error: "Invalid pagination" }, 400, "forums", requestId);
      }

      const cursorPayload = decodeCursor(parsed.data.cursor);
      const cacheKey = `feed:forums:${userId}:${parsed.data.limit}:${cursorPayload?.id ?? "start"}`;
      const cached = await getCachedJson<{ posts: any[]; viewerId: string; nextCursor?: string }>(cacheKey);
      if (cached) {
        return jsonResponse(req, cached, 200, "forums", requestId);
      }

      const cursorFilter = cursorPayload
        ? {
            OR: [
              { createdAt: { lt: new Date(cursorPayload.ts) } },
              { createdAt: new Date(cursorPayload.ts), id: { lt: cursorPayload.id } },
            ],
          }
        : {};

      const posts = await withTimeout(
        prisma.forumPost.findMany({
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: parsed.data.limit,
          where: { archivedAt: null, ...cursorFilter },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: {
                    name: true,
                    username: true,
                    imageUrl: true,
                    emailVerified: true,
                    phoneVerified: true,
                    identityVerified: true,
                  },
                },
              },
            },
            comments: true,
            reactions: true,
            saves: true,
            reposts: true,
          },
        }),
        4000,
        "Forum feed timeout"
      );

      const viewerFollowing = await prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });
      const followingSet = new Set(viewerFollowing.map((f) => f.followingId));

      const sanitized = posts.map((post) => {
        if (post.userId === userId) return post;
        if (!followingSet.has(post.userId)) {
          return {
            ...post,
            user: {
              ...post.user,
              email: "",
              profile: {
                ...post.user.profile,
                name: null,
                username: null,
                imageUrl: null,
              },
            },
          };
        }
        return post;
      });

      const last = posts[posts.length - 1];
      const nextCursor = last
        ? encodeCursor({ id: last.id, ts: last.createdAt.toISOString() })
        : undefined;

      const payload = { posts: sanitized, viewerId: userId, nextCursor };
      await setCachedJson(cacheKey, payload, Number(process.env.FEED_CACHE_TTL_SECONDS || 30));

      return jsonResponse(req, payload, 200, "forums", requestId);
    } catch (e) {
      logger.error({ err: e, requestId }, "Failed to load forum posts");
      return jsonResponse(req, { error: "Failed to load forum posts" }, 500, "forums", requestId);
    }
  }, req, "forums");
}

export async function POST(req: Request) {
  return withTiming(async () => {
    const requestId = getRequestId(req);
    try {
      const prisma = getPrismaClient();
      if (!prisma) return jsonResponse(req, { error: "Database unavailable" }, 500, "forums.create", requestId);

      const userId = await requireUserId();
      if (!userId) return jsonResponse(req, { error: "Unauthorized" }, 401, "forums.create", requestId);

      const ip = getClientIp(req);
      const limitResult = await rateLimit(`forums:create:ip:${ip}`, 20, 60);
      if (!limitResult.allowed) {
        const response = jsonResponse(req, { error: "Rate limit exceeded" }, 429, "forums.create", requestId);
        return applyRateLimitHeaders(response, 20, limitResult);
      }

      const idempotencyKey = req.headers.get("idempotency-key");
      if (idempotencyKey) {
        const ok = await checkIdempotency(`forums:${userId}:${idempotencyKey}`, 300);
        if (!ok) {
          return jsonResponse(req, { error: "Duplicate request" }, 409, "forums.create", requestId);
        }
      }

      const formData = await req.formData();
      const title = sanitizeProfanity(String(formData.get("title") ?? "").trim());
      const body = sanitizeProfanity(String(formData.get("body") ?? "").trim());
      const tagString = String(formData.get("tags") ?? "").trim();

      if (!title || !body) {
        return jsonResponse(req, { error: "Title and body are required" }, 400, "forums.create", requestId);
      }
      if (body.length > MAX_POST_BODY_LENGTH) {
        return jsonResponse(req, { error: "Post body too long" }, 400, "forums.create", requestId);
      }

      const tags = tagString
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      let imageUrl: string | null = null;
      const file = formData.get("image");
      if (file instanceof File && file.type.startsWith("image/")) {
        if (file.size > MAX_IMAGE_SIZE_BYTES) {
          return jsonResponse(req, { error: "Image too large" }, 400, "forums.create", requestId);
        }
        const ext = file.name.split(".").pop() || file.type.split("/")[1] || "jpg";
        const filename = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        const uploaded = await uploadBuffer(`forums/${filename}`, buffer, file.type);
        imageUrl = uploaded.url;
        await enqueueImageResize({ key: uploaded.key, contentType: file.type });
      }

      const post = await prisma.forumPost.create({
        data: {
          userId,
          title,
          body,
          tags,
          imageUrl,
        },
      });

      return jsonResponse(req, { post }, 200, "forums.create", requestId);
    } catch (e) {
      logger.error({ err: e, requestId }, "Failed to create forum post");
      return jsonResponse(req, { error: "Failed to create forum post" }, 500, "forums.create", requestId);
    }
  }, req, "forums.create");
}
