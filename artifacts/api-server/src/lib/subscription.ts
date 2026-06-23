/**
 * subscription.ts — subscription tiers, entitlements and premium gating (Phase 6/12/13).
 *
 * NOTE: Vertica never moves investment money. Paid tiers only unlock platform
 * access, visibility and tooling. Stripe (when connected) updates
 * Profile.subscriptionTier / subscriptionStatus; until then admins can set a
 * tier manually and these helpers gate features off whatever tier is stored.
 */
import type { SubscriptionTier } from "@prisma/client";
import { prisma } from "./db.js";

export interface TierPlan {
  tier: SubscriptionTier;
  name: string;
  tagline: string;
  priceMonthly: number; // USD, 0 = free
  features: string[];
  highlighted?: boolean;
}

export const PLANS: TierPlan[] = [
  {
    tier: "FREE",
    name: "Member",
    tagline: "Discover the room.",
    priceMonthly: 0,
    features: [
      "Browse public opportunities",
      "Save up to 10 opportunities",
      "Join public hubs and forums",
      "Basic profile",
    ],
  },
  {
    tier: "PLUS",
    name: "Vertica Plus",
    tagline: "Serious discovery tools.",
    priceMonthly: 19,
    highlighted: true,
    features: [
      "Unlimited saved opportunities",
      "Advanced filters and saved searches",
      "Deal alerts by email",
      "Portfolio and watchlist tools",
      "Personalised news",
      "Private discussions",
    ],
  },
  {
    tier: "ELITE",
    name: "Vertica Elite",
    tagline: "The inner circle.",
    priceMonthly: 49,
    features: [
      "Everything in Plus",
      "Premium opportunity rooms",
      "Early access to new listings",
      "Verified investor badge request",
      "Advanced analytics and exports",
      "Private hubs",
    ],
  },
  {
    tier: "BUSINESS",
    name: "Business / Deal Poster",
    tagline: "List and raise interest.",
    priceMonthly: 99,
    features: [
      "Post opportunities",
      "Sponsored placement",
      "Lead and interest dashboard",
      "Company verification request",
      "Priority support",
    ],
  },
];

const RANK: Record<SubscriptionTier, number> = {
  FREE: 0,
  PLUS: 1,
  ELITE: 2,
  BUSINESS: 3,
};

export function planFor(tier: SubscriptionTier): TierPlan {
  return PLANS.find((p) => p.tier === tier) ?? PLANS[0]!;
}

export function tierLabel(tier: SubscriptionTier): string {
  return planFor(tier).name;
}

/** True when the user's tier is at least `required` in rank. */
export function tierAtLeast(
  tier: SubscriptionTier,
  required: SubscriptionTier,
): boolean {
  // BUSINESS is a sibling track to ELITE for posting, but ranks above PLUS for
  // general premium gating.
  return RANK[tier] >= RANK[required];
}

export interface Entitlements {
  tier: SubscriptionTier;
  savedOpportunityLimit: number | null; // null = unlimited
  advancedFilters: boolean;
  dealAlerts: boolean;
  portfolioTools: boolean;
  privateHubs: boolean;
  premiumRooms: boolean;
  earlyAccess: boolean;
  exportReports: boolean;
  canPostOpportunities: boolean;
}

export function entitlementsFor(tier: SubscriptionTier): Entitlements {
  const plus = tierAtLeast(tier, "PLUS");
  const elite = tierAtLeast(tier, "ELITE");
  return {
    tier,
    savedOpportunityLimit: plus ? null : 10,
    advancedFilters: plus,
    dealAlerts: plus,
    portfolioTools: plus,
    privateHubs: elite,
    premiumRooms: elite,
    earlyAccess: elite,
    exportReports: elite,
    canPostOpportunities: tier === "BUSINESS" || elite,
  };
}

/** Loads the user's tier from their profile (defaults to FREE). */
export async function getUserTier(
  userId: string,
): Promise<SubscriptionTier> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { subscriptionTier: true },
  });
  return profile?.subscriptionTier ?? "FREE";
}

export async function getUserEntitlements(
  userId: string,
): Promise<Entitlements> {
  return entitlementsFor(await getUserTier(userId));
}
