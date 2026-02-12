-- Vertica revamp: RBAC + admin approvals + real-estate personalization tags
DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AdminSignupRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "InterestType" ADD VALUE IF NOT EXISTS 'ASSET_CLASS';
ALTER TYPE "InterestType" ADD VALUE IF NOT EXISTS 'STRATEGY';
ALTER TYPE "InterestType" ADD VALUE IF NOT EXISTS 'REIT';
ALTER TYPE "InterestType" ADD VALUE IF NOT EXISTS 'CITY';
ALTER TYPE "InterestType" ADD VALUE IF NOT EXISTS 'SUBTOPIC';

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" "UserRole" NOT NULL DEFAULT 'USER';

ALTER TABLE "Opportunity"
  ADD COLUMN IF NOT EXISTS "cityTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "assetTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "strategyTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "keywordTags" TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE TABLE IF NOT EXISTS "AdminSignupRequest" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "AdminSignupRequest_email_key" ON "AdminSignupRequest"("email");
CREATE INDEX IF NOT EXISTS "AdminSignupRequest_status_createdAt_idx" ON "AdminSignupRequest"("status", "createdAt");

DO $$ BEGIN
  ALTER TABLE "AdminSignupRequest"
    ADD CONSTRAINT "AdminSignupRequest_decidedByUserId_fkey"
    FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
