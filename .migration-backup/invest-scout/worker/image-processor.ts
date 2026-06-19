import { Worker } from "bullmq";
import sharp from "sharp";
import { getRedisClient } from "../src/lib/redis";
import { getObjectBuffer, uploadBuffer } from "../src/lib/storage";

const redis = getRedisClient();
if (!redis) {
  console.error("REDIS_URL is required to run the image worker.");
  process.exit(1);
}

const worker = new Worker(
  "image-processing",
  async (job) => {
    if (job.name !== "resize") return;
    const { key, contentType } = job.data as { key: string; contentType?: string };
    const buffer = await getObjectBuffer(key);
    const resized = await sharp(buffer)
      .resize({ width: 320, withoutEnlargement: true })
      .toBuffer();

    const thumbKey = key.replace(/^(.*)$/, "thumbnails/$1");
    await uploadBuffer(thumbKey, resized, contentType);
  },
  { connection: redis }
);

worker.on("failed", (job, err) => {
  console.error("Image job failed", job?.id, err);
});
