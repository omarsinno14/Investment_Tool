-- Add feed/profile indexes for scalability
CREATE INDEX IF NOT EXISTS "Opportunity_createdByUserId_fetchedAt_idx" ON "Opportunity"("createdByUserId", "fetchedAt");
CREATE INDEX IF NOT EXISTS "ForumPost_createdAt_idx" ON "ForumPost"("createdAt");
CREATE INDEX IF NOT EXISTS "ForumPost_userId_createdAt_idx" ON "ForumPost"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "ForumComment_postId_createdAt_idx" ON "ForumComment"("postId", "createdAt");
