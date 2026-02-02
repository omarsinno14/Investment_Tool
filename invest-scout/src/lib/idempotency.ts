import { getRedisClient } from "@/lib/redis";

export async function checkIdempotency(key: string, ttlSeconds: number): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;
  const idKey = `idem:${key}`;
  const set = await redis.set(idKey, "1", "NX", "EX", ttlSeconds);
  return set === "OK";
}
