/*
  Warnings:

  - You are about to drop the column `countries` on the `Opportunity` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[username]` on the table `Profile` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone]` on the table `Profile` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RiskTolerance" ADD VALUE 'EXTREMELY_LOW';
ALTER TYPE "RiskTolerance" ADD VALUE 'MEDIUM_HIGH';
ALTER TYPE "RiskTolerance" ADD VALUE 'EXTREMELY_HIGH';

-- AlterTable
ALTER TABLE "Opportunity" DROP COLUMN "countries",
ADD COLUMN     "askAmount" DOUBLE PRECISION,
ADD COLUMN     "benefits" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "contactUsername" TEXT,
ADD COLUMN     "createdByUserId" TEXT,
ADD COLUMN     "details" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "locationMapUrl" TEXT,
ADD COLUMN     "locationName" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "url" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "currency" TEXT,
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hideAgeFromNonFollowers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hideContactFromNonFollowers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hidePhotoFromNonFollowers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "occupation" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "username" TEXT;

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "opportunityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE INDEX "Message_fromUserId_idx" ON "Message"("fromUserId");

-- CreateIndex
CREATE INDEX "Message_toUserId_idx" ON "Message"("toUserId");

-- CreateIndex
CREATE INDEX "Message_opportunityId_idx" ON "Message"("opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "MoneyManagement_userId_key" ON "MoneyManagement"("userId");

-- CreateIndex
CREATE INDEX "MoneyManagement_userId_idx" ON "MoneyManagement"("userId");

-- CreateIndex
CREATE INDEX "MoneySnapshot_moneyManagementId_createdAt_idx" ON "MoneySnapshot"("moneyManagementId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_username_key" ON "Profile"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_phone_key" ON "Profile"("phone");

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyManagement" ADD CONSTRAINT "MoneyManagement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneySnapshot" ADD CONSTRAINT "MoneySnapshot_moneyManagementId_fkey" FOREIGN KEY ("moneyManagementId") REFERENCES "MoneyManagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
