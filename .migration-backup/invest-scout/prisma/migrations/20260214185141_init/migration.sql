-- CreateEnum
CREATE TYPE "RiskTolerance" AS ENUM ('EXTREMELY_LOW', 'LOW', 'MEDIUM', 'MEDIUM_HIGH', 'HIGH', 'EXTREMELY_HIGH');

-- CreateEnum
CREATE TYPE "InterestType" AS ENUM ('ASSET_CLASS', 'STRATEGY', 'REIT', 'COUNTRY', 'CITY', 'SUBTOPIC', 'CUSTOM');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AdminSignupRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ActionState" AS ENUM ('NONE', 'SAVED', 'VERY_INTERESTED', 'INVESTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('MESSAGE', 'FOLLOW_REQUEST', 'FOLLOW_ACCEPTED', 'FORUM_REACTION', 'FORUM_COMMENT', 'OPPORTUNITY_MATCH', 'OPPORTUNITY_TRENDING', 'JOURNAL_INVITE', 'JOURNAL_INVITE_ACCEPTED', 'REPORT_RECEIVED', 'NEWS_BREAKING', 'FORUM_MENTION', 'HUB_MENTION');

-- CreateEnum
CREATE TYPE "HubPostType" AS ENUM ('DISCUSSION', 'OPPORTUNITY_IMPORT', 'NEWS_IMPORT');

-- CreateEnum
CREATE TYPE "FollowRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "TagSource" AS ENUM ('FORUM', 'OPPORTUNITY');

-- CreateEnum
CREATE TYPE "ReportTargetType" AS ENUM ('USER', 'FORUM_POST', 'OPPORTUNITY', 'HUB_POST', 'HUB_COMMENT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "deactivatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "username" TEXT,
    "usernameLower" TEXT,
    "phone" TEXT,
    "imageUrl" TEXT,
    "coverPhotoUrl" TEXT,
    "websiteUrl" TEXT,
    "cvUrl" TEXT,
    "bio" TEXT,
    "occupation" TEXT,
    "currency" TEXT,
    "age" INTEGER,
    "familySituation" TEXT,
    "netWorth" DOUBLE PRECISION,
    "riskTolerance" "RiskTolerance" NOT NULL DEFAULT 'MEDIUM',
    "investAmount" DOUBLE PRECISION,
    "layoutPreference" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "identityVerified" BOOLEAN NOT NULL DEFAULT false,
    "expertiseTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "verifiedExpertiseTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hideAgeFromNonFollowers" BOOLEAN NOT NULL DEFAULT false,
    "hideContactFromNonFollowers" BOOLEAN NOT NULL DEFAULT false,
    "hidePhotoFromNonFollowers" BOOLEAN NOT NULL DEFAULT false,
    "hidePostsFromNonFollowers" BOOLEAN NOT NULL DEFAULT false,
    "hideFollowerCount" BOOLEAN NOT NULL DEFAULT false,
    "requiresFollowApproval" BOOLEAN NOT NULL DEFAULT false,
    "notifyMessages" BOOLEAN NOT NULL DEFAULT true,
    "notifyFollows" BOOLEAN NOT NULL DEFAULT true,
    "notifyOpportunities" BOOLEAN NOT NULL DEFAULT true,
    "notifyForums" BOOLEAN NOT NULL DEFAULT true,
    "notifyJournal" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "InterestType" NOT NULL,
    "value" TEXT NOT NULL,
    "parent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Interest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Follow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowRequest" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "status" "FollowRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Block" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "source" TEXT,
    "summary" TEXT,
    "imageUrl" TEXT,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "details" TEXT,
    "askAmount" DOUBLE PRECISION,
    "askCurrency" TEXT DEFAULT 'USD',
    "benefits" TEXT,
    "expectedRoiPercent" DOUBLE PRECISION,
    "expectedRoiDurationMonths" INTEGER,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "contactUsername" TEXT,
    "locationName" TEXT,
    "locationMapUrl" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "countryTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cityTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "assetTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "strategyTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "keywordTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdByUserId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),
    "boostedAt" TIMESTAMP(3),
    "boostedUntil" TIMESTAMP(3),
    "boostedBudget" DOUBLE PRECISION,
    "boostedCurrency" TEXT,
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSignupRequest" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "status" "AdminSignupRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedByUserId" TEXT,

    CONSTRAINT "AdminSignupRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityView" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "viewerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunityView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumPost" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForumPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hub" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "coverImageUrl" TEXT,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "ownerUserId" TEXT NOT NULL,
    "inviteToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hub_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HubMembership" (
    "id" TEXT NOT NULL,
    "hubId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HubMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "HubComment" (
    "id" TEXT NOT NULL,
    "hubId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HubComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HubReaction" (
    "id" TEXT NOT NULL,
    "hubId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HubReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentMention" (
    "id" TEXT NOT NULL,
    "forumPostId" TEXT,
    "hubPostId" TEXT,
    "mentionedUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentMention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumView" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "viewerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForumView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForumComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumReaction" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForumReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumSave" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForumSave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumRepost" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForumRepost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityAction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "state" "ActionState" NOT NULL DEFAULT 'NONE',
    "investedAmt" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpportunityAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "conversationId" TEXT,
    "body" TEXT NOT NULL,
    "opportunityId" TEXT,
    "readAt" TIMESTAMP(3),
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationParticipant" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "data" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TagFollow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "source" "TagSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TagFollow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoneyManagement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "incomeMonthly" DOUBLE PRECISION,
    "incomeYearly" DOUBLE PRECISION,
    "taxRate" DOUBLE PRECISION,
    "locationCountry" TEXT,
    "locationRegion" TEXT,
    "investmentsValue" DOUBLE PRECISION,
    "investmentsCashflow" DOUBLE PRECISION,
    "debts" DOUBLE PRECISION,
    "spendingDaily" DOUBLE PRECISION,
    "liabilities" DOUBLE PRECISION,
    "spendingWeekly" DOUBLE PRECISION,
    "spendingMonthly" DOUBLE PRECISION,
    "savingsCurrent" DOUBLE PRECISION,
    "dependents" INTEGER,
    "goalSavings" DOUBLE PRECISION,
    "goalInvestments" DOUBLE PRECISION,
    "goalNetWorth" DOUBLE PRECISION,
    "hideSensitive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoneyManagement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoneySnapshot" (
    "id" TEXT NOT NULL,
    "moneyManagementId" TEXT NOT NULL,
    "grossMonthly" DOUBLE PRECISION NOT NULL,
    "netMonthly" DOUBLE PRECISION NOT NULL,
    "spendingTotal" DOUBLE PRECISION NOT NULL,
    "netCashflow" DOUBLE PRECISION NOT NULL,
    "savingsCurrent" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoneySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "chartData" JSONB,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalCollaborator" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalInvite" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "status" "FollowRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetType" "ReportTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_username_key" ON "Profile"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_usernameLower_key" ON "Profile"("usernameLower");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_phone_key" ON "Profile"("phone");

-- CreateIndex
CREATE INDEX "Interest_userId_idx" ON "Interest"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Interest_userId_type_value_key" ON "Interest"("userId", "type", "value");

-- CreateIndex
CREATE INDEX "Follow_followerId_idx" ON "Follow"("followerId");

-- CreateIndex
CREATE INDEX "Follow_followingId_idx" ON "Follow"("followingId");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_followerId_followingId_key" ON "Follow"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "FollowRequest_followerId_idx" ON "FollowRequest"("followerId");

-- CreateIndex
CREATE INDEX "FollowRequest_followingId_idx" ON "FollowRequest"("followingId");

-- CreateIndex
CREATE UNIQUE INDEX "FollowRequest_followerId_followingId_key" ON "FollowRequest"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "Block_blockerId_idx" ON "Block"("blockerId");

-- CreateIndex
CREATE INDEX "Block_blockedId_idx" ON "Block"("blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "Block_blockerId_blockedId_key" ON "Block"("blockerId", "blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_url_key" ON "Opportunity"("url");

-- CreateIndex
CREATE INDEX "Opportunity_fetchedAt_idx" ON "Opportunity"("fetchedAt");

-- CreateIndex
CREATE INDEX "Opportunity_createdByUserId_fetchedAt_idx" ON "Opportunity"("createdByUserId", "fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdminSignupRequest_email_key" ON "AdminSignupRequest"("email");

-- CreateIndex
CREATE INDEX "AdminSignupRequest_status_createdAt_idx" ON "AdminSignupRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "OpportunityView_opportunityId_createdAt_idx" ON "OpportunityView"("opportunityId", "createdAt");

-- CreateIndex
CREATE INDEX "OpportunityView_viewerId_idx" ON "OpportunityView"("viewerId");

-- CreateIndex
CREATE INDEX "ForumPost_userId_idx" ON "ForumPost"("userId");

-- CreateIndex
CREATE INDEX "ForumPost_createdAt_idx" ON "ForumPost"("createdAt");

-- CreateIndex
CREATE INDEX "ForumPost_userId_createdAt_idx" ON "ForumPost"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Hub_slug_key" ON "Hub"("slug");

-- CreateIndex
CREATE INDEX "Hub_name_idx" ON "Hub"("name");

-- CreateIndex
CREATE INDEX "Hub_ownerUserId_idx" ON "Hub"("ownerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Hub_name_key" ON "Hub"("name");

-- CreateIndex
CREATE INDEX "HubMembership_userId_joinedAt_idx" ON "HubMembership"("userId", "joinedAt");

-- CreateIndex
CREATE UNIQUE INDEX "HubMembership_hubId_userId_key" ON "HubMembership"("hubId", "userId");

-- CreateIndex
CREATE INDEX "HubPost_hubId_createdAt_idx" ON "HubPost"("hubId", "createdAt");

-- CreateIndex
CREATE INDEX "HubPost_authorUserId_createdAt_idx" ON "HubPost"("authorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "HubComment_hubId_createdAt_idx" ON "HubComment"("hubId", "createdAt");

-- CreateIndex
CREATE INDEX "HubComment_postId_createdAt_idx" ON "HubComment"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "HubComment_userId_createdAt_idx" ON "HubComment"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "HubReaction_hubId_createdAt_idx" ON "HubReaction"("hubId", "createdAt");

-- CreateIndex
CREATE INDEX "HubReaction_postId_createdAt_idx" ON "HubReaction"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "HubReaction_userId_createdAt_idx" ON "HubReaction"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "HubReaction_postId_userId_type_key" ON "HubReaction"("postId", "userId", "type");

-- CreateIndex
CREATE INDEX "ContentMention_mentionedUserId_createdAt_idx" ON "ContentMention"("mentionedUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ContentMention_forumPostId_idx" ON "ContentMention"("forumPostId");

-- CreateIndex
CREATE INDEX "ContentMention_hubPostId_idx" ON "ContentMention"("hubPostId");

-- CreateIndex
CREATE INDEX "ForumView_postId_createdAt_idx" ON "ForumView"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "ForumView_viewerId_idx" ON "ForumView"("viewerId");

-- CreateIndex
CREATE INDEX "ForumComment_postId_idx" ON "ForumComment"("postId");

-- CreateIndex
CREATE INDEX "ForumComment_postId_createdAt_idx" ON "ForumComment"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "ForumComment_userId_idx" ON "ForumComment"("userId");

-- CreateIndex
CREATE INDEX "ForumReaction_postId_idx" ON "ForumReaction"("postId");

-- CreateIndex
CREATE INDEX "ForumReaction_userId_idx" ON "ForumReaction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ForumReaction_postId_userId_type_key" ON "ForumReaction"("postId", "userId", "type");

-- CreateIndex
CREATE INDEX "ForumSave_postId_idx" ON "ForumSave"("postId");

-- CreateIndex
CREATE INDEX "ForumSave_userId_idx" ON "ForumSave"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ForumSave_postId_userId_key" ON "ForumSave"("postId", "userId");

-- CreateIndex
CREATE INDEX "ForumRepost_postId_idx" ON "ForumRepost"("postId");

-- CreateIndex
CREATE INDEX "ForumRepost_userId_idx" ON "ForumRepost"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ForumRepost_postId_userId_key" ON "ForumRepost"("postId", "userId");

-- CreateIndex
CREATE INDEX "OpportunityAction_userId_state_idx" ON "OpportunityAction"("userId", "state");

-- CreateIndex
CREATE INDEX "OpportunityAction_opportunityId_idx" ON "OpportunityAction"("opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "OpportunityAction_userId_opportunityId_key" ON "OpportunityAction"("userId", "opportunityId");

-- CreateIndex
CREATE INDEX "Message_fromUserId_idx" ON "Message"("fromUserId");

-- CreateIndex
CREATE INDEX "Message_toUserId_idx" ON "Message"("toUserId");

-- CreateIndex
CREATE INDEX "Message_opportunityId_idx" ON "Message"("opportunityId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "Conversation_lastMessageAt_idx" ON "Conversation"("lastMessageAt");

-- CreateIndex
CREATE INDEX "ConversationParticipant_userId_idx" ON "ConversationParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationParticipant_conversationId_userId_key" ON "ConversationParticipant"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "TagFollow_userId_idx" ON "TagFollow"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TagFollow_userId_tag_source_key" ON "TagFollow"("userId", "tag", "source");

-- CreateIndex
CREATE UNIQUE INDEX "MoneyManagement_userId_key" ON "MoneyManagement"("userId");

-- CreateIndex
CREATE INDEX "MoneyManagement_userId_idx" ON "MoneyManagement"("userId");

-- CreateIndex
CREATE INDEX "MoneySnapshot_moneyManagementId_createdAt_idx" ON "MoneySnapshot"("moneyManagementId", "createdAt");

-- CreateIndex
CREATE INDEX "JournalEntry_ownerId_entryDate_idx" ON "JournalEntry"("ownerId", "entryDate");

-- CreateIndex
CREATE INDEX "JournalCollaborator_userId_idx" ON "JournalCollaborator"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "JournalCollaborator_entryId_userId_key" ON "JournalCollaborator"("entryId", "userId");

-- CreateIndex
CREATE INDEX "JournalInvite_toUserId_status_idx" ON "JournalInvite"("toUserId", "status");

-- CreateIndex
CREATE INDEX "JournalInvite_entryId_idx" ON "JournalInvite"("entryId");

-- CreateIndex
CREATE INDEX "Report_targetType_targetId_idx" ON "Report"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "Report_reporterId_idx" ON "Report"("reporterId");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interest" ADD CONSTRAINT "Interest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowRequest" ADD CONSTRAINT "FollowRequest_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowRequest" ADD CONSTRAINT "FollowRequest_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminSignupRequest" ADD CONSTRAINT "AdminSignupRequest_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityView" ADD CONSTRAINT "OpportunityView_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityView" ADD CONSTRAINT "OpportunityView_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hub" ADD CONSTRAINT "Hub_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubMembership" ADD CONSTRAINT "HubMembership_hubId_fkey" FOREIGN KEY ("hubId") REFERENCES "Hub"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubMembership" ADD CONSTRAINT "HubMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubPost" ADD CONSTRAINT "HubPost_hubId_fkey" FOREIGN KEY ("hubId") REFERENCES "Hub"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubPost" ADD CONSTRAINT "HubPost_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubPost" ADD CONSTRAINT "HubPost_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubComment" ADD CONSTRAINT "HubComment_hubId_fkey" FOREIGN KEY ("hubId") REFERENCES "Hub"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubComment" ADD CONSTRAINT "HubComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "HubPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubComment" ADD CONSTRAINT "HubComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubReaction" ADD CONSTRAINT "HubReaction_hubId_fkey" FOREIGN KEY ("hubId") REFERENCES "Hub"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubReaction" ADD CONSTRAINT "HubReaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "HubPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubReaction" ADD CONSTRAINT "HubReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentMention" ADD CONSTRAINT "ContentMention_forumPostId_fkey" FOREIGN KEY ("forumPostId") REFERENCES "ForumPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentMention" ADD CONSTRAINT "ContentMention_hubPostId_fkey" FOREIGN KEY ("hubPostId") REFERENCES "HubPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentMention" ADD CONSTRAINT "ContentMention_mentionedUserId_fkey" FOREIGN KEY ("mentionedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumView" ADD CONSTRAINT "ForumView_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ForumPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumView" ADD CONSTRAINT "ForumView_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumComment" ADD CONSTRAINT "ForumComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ForumPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumComment" ADD CONSTRAINT "ForumComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumReaction" ADD CONSTRAINT "ForumReaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ForumPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumReaction" ADD CONSTRAINT "ForumReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumSave" ADD CONSTRAINT "ForumSave_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ForumPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumSave" ADD CONSTRAINT "ForumSave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumRepost" ADD CONSTRAINT "ForumRepost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ForumPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumRepost" ADD CONSTRAINT "ForumRepost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityAction" ADD CONSTRAINT "OpportunityAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityAction" ADD CONSTRAINT "OpportunityAction_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagFollow" ADD CONSTRAINT "TagFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyManagement" ADD CONSTRAINT "MoneyManagement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneySnapshot" ADD CONSTRAINT "MoneySnapshot_moneyManagementId_fkey" FOREIGN KEY ("moneyManagementId") REFERENCES "MoneyManagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalCollaborator" ADD CONSTRAINT "JournalCollaborator_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalCollaborator" ADD CONSTRAINT "JournalCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalInvite" ADD CONSTRAINT "JournalInvite_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalInvite" ADD CONSTRAINT "JournalInvite_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalInvite" ADD CONSTRAINT "JournalInvite_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
