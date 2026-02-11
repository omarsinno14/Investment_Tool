-- enums
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'FORUM_MENTION';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'HUB_MENTION';

CREATE TYPE "HubPostType" AS ENUM ('DISCUSSION', 'OPPORTUNITY_IMPORT', 'NEWS_IMPORT');

-- hubs
CREATE TABLE "Hub" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "isPrivate" BOOLEAN NOT NULL DEFAULT false,
  "ownerUserId" TEXT NOT NULL,
  "inviteToken" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Hub_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Hub_slug_key" ON "Hub"("slug");
CREATE UNIQUE INDEX "Hub_name_key" ON "Hub"("name");
CREATE INDEX "Hub_name_idx" ON "Hub"("name");
CREATE INDEX "Hub_ownerUserId_idx" ON "Hub"("ownerUserId");
ALTER TABLE "Hub" ADD CONSTRAINT "Hub_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "HubMembership" (
  "id" TEXT NOT NULL,
  "hubId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'member',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HubMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HubMembership_hubId_userId_key" ON "HubMembership"("hubId","userId");
CREATE INDEX "HubMembership_userId_joinedAt_idx" ON "HubMembership"("userId","joinedAt");
ALTER TABLE "HubMembership" ADD CONSTRAINT "HubMembership_hubId_fkey" FOREIGN KEY ("hubId") REFERENCES "Hub"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HubMembership" ADD CONSTRAINT "HubMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "HubPost" (
  "id" TEXT NOT NULL,
  "hubId" TEXT NOT NULL,
  "authorUserId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "type" "HubPostType" NOT NULL DEFAULT 'DISCUSSION',
  "opportunityId" TEXT,
  "newsHeadline" TEXT,
  "newsUrl" TEXT,
  "newsSource" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "editedAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "HubPost_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HubPost_hubId_createdAt_idx" ON "HubPost"("hubId","createdAt");
CREATE INDEX "HubPost_authorUserId_createdAt_idx" ON "HubPost"("authorUserId","createdAt");
ALTER TABLE "HubPost" ADD CONSTRAINT "HubPost_hubId_fkey" FOREIGN KEY ("hubId") REFERENCES "Hub"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HubPost" ADD CONSTRAINT "HubPost_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HubPost" ADD CONSTRAINT "HubPost_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ContentMention" (
  "id" TEXT NOT NULL,
  "forumPostId" TEXT,
  "hubPostId" TEXT,
  "mentionedUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContentMention_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContentMention_mentionedUserId_createdAt_idx" ON "ContentMention"("mentionedUserId","createdAt");
CREATE INDEX "ContentMention_forumPostId_idx" ON "ContentMention"("forumPostId");
CREATE INDEX "ContentMention_hubPostId_idx" ON "ContentMention"("hubPostId");
ALTER TABLE "ContentMention" ADD CONSTRAINT "ContentMention_forumPostId_fkey" FOREIGN KEY ("forumPostId") REFERENCES "ForumPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentMention" ADD CONSTRAINT "ContentMention_hubPostId_fkey" FOREIGN KEY ("hubPostId") REFERENCES "HubPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentMention" ADD CONSTRAINT "ContentMention_mentionedUserId_fkey" FOREIGN KEY ("mentionedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
