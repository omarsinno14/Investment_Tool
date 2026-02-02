import path from "path";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";
import { jsonResponse, withTiming } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { MAX_IMAGE_SIZE_BYTES } from "@/lib/uploads";
import { uploadBuffer } from "@/lib/storage";
import { enqueueImageResize } from "@/lib/queue";
import { applyRateLimitHeaders, rateLimit } from "@/lib/rate-limit";
import { getClientIp, getRequestId } from "@/lib/request-context";

const ALLOWED_PREFIX = "image/";

function getExtension(name: string, type: string) {
  const ext = path.extname(name).replace(".", "").toLowerCase();
  if (ext) return ext;
  const fallback = type.split("/")[1]?.toLowerCase() ?? "png";
  return fallback;
}

export async function POST(req: Request) {
  return withTiming(async () => {
    const requestId = getRequestId(req);
    try {
      const prisma = getPrismaClient();
      if (!prisma) return jsonResponse(req, { error: "Database unavailable" }, 500, "profile.photo", requestId);

      const userId = await requireUserId();
      if (!userId) return jsonResponse(req, { error: "Unauthorized" }, 401, "profile.photo", requestId);

      const ip = getClientIp(req);
      const limitResult = await rateLimit(`upload:profile:ip:${ip}`, 20, 60);
      if (!limitResult.allowed) {
        const response = jsonResponse(req, { error: "Rate limit exceeded" }, 429, "profile.photo", requestId);
        return applyRateLimitHeaders(response, 20, limitResult);
      }

      const formData = await req.formData();
      const file = formData.get("file");
      if (!(file instanceof File)) {
        return jsonResponse(req, { error: "File missing" }, 400, "profile.photo", requestId);
      }
      if (!file.type.startsWith(ALLOWED_PREFIX)) {
        return jsonResponse(req, { error: "Only image uploads are allowed" }, 400, "profile.photo", requestId);
      }
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        return jsonResponse(req, { error: "File too large" }, 400, "profile.photo", requestId);
      }

      const ext = getExtension(file.name, file.type);
      const filename = `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploaded = await uploadBuffer(`profile/${filename}`, buffer, file.type);

      await prisma.profile.upsert({
        where: { userId },
        create: { userId, imageUrl: uploaded.url },
        update: { imageUrl: uploaded.url },
      });

      await enqueueImageResize({ key: uploaded.key, contentType: file.type });

      return jsonResponse(req, { imageUrl: uploaded.url }, 200, "profile.photo", requestId);
    } catch (e) {
      logger.error({ err: e, requestId }, "Failed to upload profile photo");
      return jsonResponse(req, { error: "Failed to upload profile photo" }, 500, "profile.photo", requestId);
    }
  }, req, "profile.photo");
}
