-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'NEWS_BREAKING';

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "usernameLower" TEXT;

-- Backfill usernameLower and clear duplicates by case-insensitive match
WITH ranked AS (
  SELECT id,
         LOWER("username") AS uname,
         ROW_NUMBER() OVER (PARTITION BY LOWER("username") ORDER BY "createdAt", id) AS rn
  FROM "Profile"
  WHERE "username" IS NOT NULL
)
UPDATE "Profile"
SET "username" = NULL,
    "usernameLower" = NULL
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

UPDATE "Profile"
SET "usernameLower" = LOWER("username")
WHERE "username" IS NOT NULL;

ALTER TABLE "Profile" ADD CONSTRAINT "Profile_usernameLower_key" UNIQUE ("usernameLower");

-- AlterTable
ALTER TABLE "Message" ADD COLUMN "editedAt" TIMESTAMP(3);
ALTER TABLE "Message" ADD COLUMN "deletedAt" TIMESTAMP(3);
