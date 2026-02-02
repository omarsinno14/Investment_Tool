import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";
import { jsonResponse, withTiming } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { MAX_IMAGE_SIZE_BYTES } from "@/lib/uploads";
import { uploadBuffer } from "@/lib/storage";
import { enqueueImageResize } from "@/lib/queue";
import { applyRateLimitHeaders, rateLimit } from "@/lib/rate-limit";
import { getClientIp, getRequestId } from "@/lib/request-context";

export async function POST(req: Request) {
  return withTiming(async () => {
    const requestId = getRequestId(req);
    try {
      const prisma = getPrismaClient();
      if (!prisma) return jsonResponse(req, { error: "Database unavailable" }, 500, "profile.cover", requestId);

      const userId = await requireUserId();
      if (!userId) return jsonResponse(req, { error: "Unauthorized" }, 401, "profile.cover", requestId);

      const ip = getClientIp(req);
      const limitResult = await rateLimit(`upload:cover:ip:${ip}`, 20, 60);
      if (!limitResult.allowed) {
        const response = jsonResponse(req, { error: "Rate limit exceeded" }, 429, "profile.cover", requestId);
        return applyRateLimitHeaders(response, 20, limitResult);
      }

      const formData = await req.formData();
      const file = formData.get("file");
      if (!(file instanceof File) || !file.type.startsWith("image/")) {
        return jsonResponse(req, { error: "Upload a valid image" }, 400, "profile.cover", requestId);
      }
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        return jsonResponse(req, { error: "File too large" }, 400, "profile.cover", requestId);
      }

      const ext = file.name.split(".").pop() || file.type.split("/")[1] || "jpg";
      const filename = `cover-${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploaded = await uploadBuffer(`profile/${filename}`, buffer, file.type);

      await prisma.profile.upsert({
        where: { userId },
        create: { userId, coverPhotoUrl: uploaded.url },
        update: { coverPhotoUrl: uploaded.url },
      });

      await enqueueImageResize({ key: uploaded.key, contentType: file.type });

      return jsonResponse(req, { coverPhotoUrl: uploaded.url }, 200, "profile.cover", requestId);
    } catch (e) {
      logger.error({ err: e, requestId }, "Failed to upload cover photo");
      return jsonResponse(req, { error: "Failed to upload cover photo" }, 500, "profile.cover", requestId);
    }
  }, req, "profile.cover");
}
