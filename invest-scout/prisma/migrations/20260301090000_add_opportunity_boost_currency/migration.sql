-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN     "askCurrency" TEXT DEFAULT 'USD';
ALTER TABLE "Opportunity" ADD COLUMN     "expectedRoiPercent" DOUBLE PRECISION;
ALTER TABLE "Opportunity" ADD COLUMN     "expectedRoiDurationMonths" INTEGER;
ALTER TABLE "Opportunity" ADD COLUMN     "boostedAt" TIMESTAMP(3);
ALTER TABLE "Opportunity" ADD COLUMN     "boostedUntil" TIMESTAMP(3);
ALTER TABLE "Opportunity" ADD COLUMN     "boostedBudget" DOUBLE PRECISION;
ALTER TABLE "Opportunity" ADD COLUMN     "boostedCurrency" TEXT;
