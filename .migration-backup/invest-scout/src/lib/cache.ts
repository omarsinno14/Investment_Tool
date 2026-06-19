import { getRedisClient } from "@/lib/redis";

export async function getCachedJson<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  if (!redis) return null;
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setCachedJson<T>(key: string, value: T, ttlSeconds: number) {
  const redis = getRedisClient();
  if (!redis) return null;
  return redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
}

export async function deleteCached(key: string) {
  const redis = getRedisClient();
  if (!redis) return null;
  return redis.del(key);
}
