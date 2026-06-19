import { Queue } from "bullmq";
import { getRedisClient } from "@/lib/redis";

const globalForQueue = globalThis as unknown as { imageQueue?: Queue };

export type ImageJobPayload = {
  key: string;
  contentType?: string;
};

export function getImageQueue(): Queue | null {
  const redis = getRedisClient();
  if (!redis) return null;

  if (!globalForQueue.imageQueue) {
    globalForQueue.imageQueue = new Queue("image-processing", {
      connection: redis,
    });
  }

  return globalForQueue.imageQueue;
}

export async function enqueueImageResize(payload: ImageJobPayload) {
  const queue = getImageQueue();
  if (!queue) return null;
  return queue.add("resize", payload, {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  });
}
