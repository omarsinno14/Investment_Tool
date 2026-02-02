import { z } from "zod";
import { getPrismaClient } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { applyRateLimitHeaders, rateLimit } from "@/lib/rate-limit";
import { getClientIp, getRequestId } from "@/lib/request-context";
import { jsonResponse, withTiming } from "@/lib/api-response";
import { logger } from "@/lib/logger";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  return withTiming(async () => {
    const requestId = getRequestId(req);
    try {
      const prisma = getPrismaClient();
      if (!prisma) return jsonResponse(req, { error: "Database unavailable" }, 500, "register", requestId);

      const ip = getClientIp(req);
      const limitResult = await rateLimit(`register:ip:${ip}`, 10, 60);
      if (!limitResult.allowed) {
        const response = jsonResponse(req, { error: "Rate limit exceeded" }, 429, "register", requestId);
        return applyRateLimitHeaders(response, 10, limitResult);
      }

      const body = await req.json().catch(() => null);
      const parsed = schema.safeParse(body);

      if (!parsed.success) {
        return jsonResponse(req, { error: "Invalid input" }, 400, "register", requestId);
      }

      const email = parsed.data.email.toLowerCase().trim();
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return jsonResponse(req, { error: "Email already in use" }, 409, "register", requestId);
      }

      const passwordHash = await hashPassword(parsed.data.password);

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          profile: { create: {} },
        },
        select: { id: true, email: true },
      });

      return jsonResponse(req, { user }, 200, "register", requestId);
    } catch (e) {
      logger.error({ err: e, requestId }, "Failed to register");
      return jsonResponse(req, { error: "Failed to register" }, 500, "register", requestId);
    }
  }, req, "register");
}
