-- Hub profile media
ALTER TABLE "Hub" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "Hub" ADD COLUMN IF NOT EXISTS "coverImageUrl" TEXT;

-- Extend report targets for hub moderation
DO $$
BEGIN
  ALTER TYPE "ReportTargetType" ADD VALUE IF NOT EXISTS 'HUB_POST';
  ALTER TYPE "ReportTargetType" ADD VALUE IF NOT EXISTS 'HUB_COMMENT';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Hub comments
CREATE TABLE IF NOT EXISTS "HubComment" (
  "id" TEXT PRIMARY KEY,
  "hubId" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HubComment_hubId_fkey" FOREIGN KEY ("hubId") REFERENCES "Hub"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "HubComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "HubPost"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "HubComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "HubComment_hubId_createdAt_idx" ON "HubComment"("hubId", "createdAt");
CREATE INDEX IF NOT EXISTS "HubComment_postId_createdAt_idx" ON "HubComment"("postId", "createdAt");
CREATE INDEX IF NOT EXISTS "HubComment_userId_createdAt_idx" ON "HubComment"("userId", "createdAt");

-- Hub reactions
CREATE TABLE IF NOT EXISTS "HubReaction" (
  "id" TEXT PRIMARY KEY,
  "hubId" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HubReaction_hubId_fkey" FOREIGN KEY ("hubId") REFERENCES "Hub"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "HubReaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "HubPost"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "HubReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "HubReaction_postId_userId_type_key" ON "HubReaction"("postId", "userId", "type");
CREATE INDEX IF NOT EXISTS "HubReaction_hubId_createdAt_idx" ON "HubReaction"("hubId", "createdAt");
CREATE INDEX IF NOT EXISTS "HubReaction_postId_createdAt_idx" ON "HubReaction"("postId", "createdAt");
CREATE INDEX IF NOT EXISTS "HubReaction_userId_createdAt_idx" ON "HubReaction"("userId", "createdAt");
