import NextAuth from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { applyRateLimitHeaders, rateLimit } from "@/lib/rate-limit";
import { getClientIp, getRequestId } from "@/lib/request-context";
import { jsonResponse } from "@/lib/api-response";

const handler = NextAuth(authOptions);

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  const ip = getClientIp(req);
  const limitResult = await rateLimit(`auth:ip:${ip}`, 30, 60);
  if (!limitResult.allowed) {
    const response = jsonResponse(req, { error: "Rate limit exceeded" }, 429, "auth", requestId);
    return applyRateLimitHeaders(response, 30, limitResult);
  }
  return handler(req);
}

export const GET = handler;
