import path from "path";
import { promises as fs } from "fs";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Readable } from "stream";

export type StorageDriver = "local" | "s3";

export type UploadResult = {
  key: string;
  url: string;
};

export type PresignedUpload = {
  key: string;
  uploadUrl: string;
  fileUrl: string;
};

const LOCAL_BASE = "uploads";

const globalForS3 = globalThis as unknown as { s3?: S3Client };

function getStorageDriver(): StorageDriver {
  return (process.env.STORAGE_DRIVER as StorageDriver) || "local";
}

function getS3Client(): S3Client {
  if (!globalForS3.s3) {
    globalForS3.s3 = new S3Client({
      region: process.env.S3_REGION || "us-east-1",
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      credentials: process.env.S3_ACCESS_KEY_ID
        ? {
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
          }
        : undefined,
    });
  }
  return globalForS3.s3;
}

function getBucketName() {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error("S3_BUCKET is not set");
  return bucket;
}

function getPublicUrl(key: string) {
  if (process.env.S3_PUBLIC_URL) {
    return `${process.env.S3_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
  }
  const region = process.env.S3_REGION || "us-east-1";
  const bucket = getBucketName();
  if (process.env.S3_ENDPOINT) {
    return `${process.env.S3_ENDPOINT.replace(/\/$/, "")}/${bucket}/${key}`;
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

export async function uploadBuffer(key: string, buffer: Buffer, contentType?: string): Promise<UploadResult> {
  const driver = getStorageDriver();
  if (driver === "s3") {
    const client = getS3Client();
    await client.send(
      new PutObjectCommand({
        Bucket: getBucketName(),
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );
    return { key, url: getPublicUrl(key) };
  }

  const localPath = path.join(process.cwd(), "public", LOCAL_BASE, key);
  await fs.mkdir(path.dirname(localPath), { recursive: true });
  await fs.writeFile(localPath, buffer);
  return { key, url: `/${LOCAL_BASE}/${key}` };
}

export async function getPresignedUpload(key: string, contentType?: string): Promise<PresignedUpload> {
  const driver = getStorageDriver();
  if (driver !== "s3") {
    throw new Error("Presigned uploads require STORAGE_DRIVER=s3");
  }
  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });
  return { key, uploadUrl, fileUrl: getPublicUrl(key) };
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const driver = getStorageDriver();
  if (driver === "s3") {
    const client = getS3Client();
    const response = await client.send(
      new GetObjectCommand({
        Bucket: getBucketName(),
        Key: key,
      })
    );
    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  const localPath = path.join(process.cwd(), "public", LOCAL_BASE, key);
  return fs.readFile(localPath);
}

export function getStorageUrl(key: string) {
  return getStorageDriver() === "s3" ? getPublicUrl(key) : `/${LOCAL_BASE}/${key}`;
}
