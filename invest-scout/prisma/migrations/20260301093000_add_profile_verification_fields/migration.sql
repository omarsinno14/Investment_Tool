-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "identityVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Profile" ADD COLUMN     "expertiseTags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Profile" ADD COLUMN     "verifiedExpertiseTags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Profile" ADD COLUMN     "hidePostsFromNonFollowers" BOOLEAN NOT NULL DEFAULT false;
