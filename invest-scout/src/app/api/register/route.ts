import { z } from "zod";
import { getPrismaClient } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { applyRateLimitHeaders, rateLimit } from "@/lib/rate-limit";
import { getClientIp, getRequestId } from "@/lib/request-context";
import { jsonResponse, withTiming } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { randomBytes } from "crypto";
import { sendEmailConfirmation } from "@/lib/email";

const USERNAME_REGEX = /^[a-zA-Z0-9._]{3,20}$/;
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const schema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  username: z.string().regex(USERNAME_REGEX),
  dob: z.string(),
  password: z.string().regex(PASSWORD_REGEX),
  confirmPassword: z.string().min(8),
});

function isAtLeast18(dob: string) {
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 18;
}

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
      if (parsed.data.password !== parsed.data.confirmPassword) {
        return jsonResponse(req, { error: "Passwords do not match" }, 400, "register", requestId);
      }
      if (!isAtLeast18(parsed.data.dob)) {
        return jsonResponse(req, { error: "You must be at least 18 years old to register" }, 400, "register", requestId);
      }

      const email = parsed.data.email.toLowerCase().trim();
      const username = parsed.data.username.trim();
      const usernameLower = username.toLowerCase();

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return jsonResponse(req, { error: "Email already in use" }, 409, "register", requestId);

      const existingUsername = await prisma.profile.findFirst({ where: { usernameLower }, select: { id: true } });
      if (existingUsername) {
        return jsonResponse(req, { error: "Username already in use" }, 409, "register", requestId);
      }

      const passwordHash = await hashPassword(parsed.data.password);
      const age = Math.max(18, new Date().getFullYear() - new Date(parsed.data.dob).getFullYear());

      const user = await prisma.user.create({
        data: {
          role: "USER",
          email,
          passwordHash,
          profile: {
            create: {
              name: `${parsed.data.firstName.trim()} ${parsed.data.lastName.trim()}`,
              username,
              usernameLower,
              age,
            },
          },
        },
        select: { id: true, email: true },
      });

      await sendEmailConfirmation({ to: email, name: parsed.data.firstName, token: randomBytes(16).toString("hex") });

      return jsonResponse(req, { user, requiresEmailConfirmation: true }, 200, "register", requestId);
    } catch (e) {
      logger.error({ err: e, requestId }, "Failed to register");
      return jsonResponse(req, { error: "Failed to register" }, 500, "register", requestId);
    }
  }, req, "register");
}
