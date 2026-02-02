import { getRedisClient } from "@/lib/redis";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
};

export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const redis = getRedisClient();
  if (!redis) {
    return { allowed: true, remaining: limit, resetSeconds: windowSeconds };
  }

  const ttlKey = `rate:${key}`;
  const pipeline = redis.multi();
  pipeline.incr(ttlKey);
  pipeline.ttl(ttlKey);
  const [countResult, ttlResult] = (await pipeline.exec()) ?? [];
  const count = typeof countResult?.[1] === "number" ? countResult[1] : 1;
  let ttl = typeof ttlResult?.[1] === "number" ? ttlResult[1] : -1;
  if (ttl < 0) {
    await redis.expire(ttlKey, windowSeconds);
    ttl = windowSeconds;
  }

  const remaining = Math.max(0, limit - count);
  return {
    allowed: count <= limit,
    remaining,
    resetSeconds: ttl,
  };
}

export function applyRateLimitHeaders(response: Response, limit: number, result: RateLimitResult) {
  response.headers.set("X-RateLimit-Limit", String(limit));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set("X-RateLimit-Reset", String(result.resetSeconds));
  if (!result.allowed) {
    response.headers.set("Retry-After", String(result.resetSeconds));
  }
  return response;
}
