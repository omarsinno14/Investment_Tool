import { z } from "zod";
import { getPresignedUpload } from "@/lib/storage";
import { requireUserId } from "@/lib/auth-server";
import { jsonResponse, withTiming } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { applyRateLimitHeaders, rateLimit } from "@/lib/rate-limit";
import { getClientIp, getRequestId } from "@/lib/request-context";

const schema = z.object({
  folder: z.string().min(1),
  contentType: z.string().min(1),
  extension: z.string().min(1),
});

export async function POST(req: Request) {
  return withTiming(async () => {
    const requestId = getRequestId(req);
    try {
      const userId = await requireUserId();
      if (!userId) return jsonResponse(req, { error: "Unauthorized" }, 401, "uploads.presign", requestId);

      const ip = getClientIp(req);
      const limitResult = await rateLimit(`upload:presign:ip:${ip}`, 60, 60);
      if (!limitResult.allowed) {
        const response = jsonResponse(req, { error: "Rate limit exceeded" }, 429, "uploads.presign", requestId);
        return applyRateLimitHeaders(response, 60, limitResult);
      }

      const body = await req.json().catch(() => null);
      const parsed = schema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse(req, { error: "Invalid input" }, 400, "uploads.presign", requestId);
      }

      const { folder, contentType, extension } = parsed.data;
      const key = `${folder}/${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
      const presigned = await getPresignedUpload(key, contentType);

      return jsonResponse(req, presigned, 200, "uploads.presign", requestId);
    } catch (e) {
      logger.error({ err: e, requestId }, "Failed to create presigned upload");
      return jsonResponse(req, { error: "Failed to create presigned upload" }, 500, "uploads.presign", requestId);
    }
  }, req, "uploads.presign");
}
