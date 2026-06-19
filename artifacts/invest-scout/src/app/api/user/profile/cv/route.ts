import path from "path";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";
import { jsonResponse, withTiming } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { MAX_CV_SIZE_BYTES } from "@/lib/uploads";
import { uploadBuffer } from "@/lib/storage";
import { applyRateLimitHeaders, rateLimit } from "@/lib/rate-limit";
import { getClientIp, getRequestId } from "@/lib/request-context";

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function getExtension(name: string, type: string) {
  const ext = path.extname(name).replace(".", "").toLowerCase();
  if (ext) return ext;
  if (type === "application/pdf") return "pdf";
  if (type === "application/msword") return "doc";
  if (type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  return "pdf";
}

export async function POST(req: Request) {
  return withTiming(async () => {
    const requestId = getRequestId(req);
    try {
      const prisma = getPrismaClient();
      if (!prisma) return jsonResponse(req, { error: "Database unavailable" }, 500, "profile.cv", requestId);

      const userId = await requireUserId();
      if (!userId) return jsonResponse(req, { error: "Unauthorized" }, 401, "profile.cv", requestId);

      const ip = getClientIp(req);
      const limitResult = await rateLimit(`upload:cv:ip:${ip}`, 10, 60);
      if (!limitResult.allowed) {
        const response = jsonResponse(req, { error: "Rate limit exceeded" }, 429, "profile.cv", requestId);
        return applyRateLimitHeaders(response, 10, limitResult);
      }

      const formData = await req.formData();
      const file = formData.get("file");
      if (!(file instanceof File)) {
        return jsonResponse(req, { error: "File missing" }, 400, "profile.cv", requestId);
      }

      if (!ALLOWED_TYPES.has(file.type)) {
        return jsonResponse(req, { error: "Only PDF or Word documents are allowed" }, 400, "profile.cv", requestId);
      }
      if (file.size > MAX_CV_SIZE_BYTES) {
        return jsonResponse(req, { error: "File too large" }, 400, "profile.cv", requestId);
      }

      const ext = getExtension(file.name, file.type);
      const filename = `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploaded = await uploadBuffer(`cv/${filename}`, buffer, file.type);

      await prisma.profile.upsert({
        where: { userId },
        create: { userId, cvUrl: uploaded.url },
        update: { cvUrl: uploaded.url },
      });

      return jsonResponse(req, { cvUrl: uploaded.url }, 200, "profile.cv", requestId);
    } catch (e) {
      logger.error({ err: e, requestId }, "Failed to upload CV");
      return jsonResponse(req, { error: "Failed to upload CV" }, 500, "profile.cv", requestId);
    }
  }, req, "profile.cv");
}
