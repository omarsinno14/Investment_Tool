import { randomBytes } from "node:crypto";
import { prisma } from "./db.js";

/**
 * Minimal DB-backed file storage for profile photos, covers, CVs and hub images.
 * Files live in Postgres (not on local disk) because autoscale instances are
 * ephemeral and don't share a filesystem. The table is created at startup.
 */

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
export const DOCUMENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export async function ensureStoredFilesTable(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "stored_files" (
      "id" varchar(48) PRIMARY KEY,
      "owner_id" text NOT NULL,
      "folder" varchar(32) NOT NULL DEFAULT 'misc',
      "filename" text,
      "mime_type" varchar(128) NOT NULL,
      "size" integer NOT NULL,
      "data" bytea NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now()
    );
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "stored_files_owner_idx" ON "stored_files" ("owner_id");`,
  );
}

export async function saveFile(input: {
  ownerId: string;
  folder: string;
  filename: string | null;
  mimeType: string;
  data: Buffer;
}): Promise<{ id: string; url: string }> {
  const id = randomBytes(16).toString("hex");
  const folder = input.folder.replace(/[^a-z0-9_-]/gi, "").slice(0, 32) || "misc";
  await prisma.$executeRaw`
    INSERT INTO "stored_files" ("id", "owner_id", "folder", "filename", "mime_type", "size", "data")
    VALUES (${id}, ${input.ownerId}, ${folder}, ${input.filename}, ${input.mimeType}, ${input.data.length}, ${input.data})
  `;
  return { id, url: `/api/files/${id}` };
}

export async function readFile(id: string) {
  const rows = await prisma.$queryRaw<
    { mime_type: string; filename: string | null; data: Buffer | Uint8Array }[]
  >`SELECT "mime_type", "filename", "data" FROM "stored_files" WHERE "id" = ${id} LIMIT 1`;
  const row = rows[0];
  if (!row) return null;
  return { mimeType: row.mime_type, filename: row.filename, data: Buffer.from(row.data) };
}
