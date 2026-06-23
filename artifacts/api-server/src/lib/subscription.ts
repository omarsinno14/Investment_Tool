/**
 * subscription.ts — subscription tiers, entitlements and premium gating (Phase 6/12/13).
 *
 * NOTE: Vertica never moves investment money. Paid tiers only unlock platform
 * access, visibility and tooling. Stripe (when connected) updates
 * Profile.subscriptionTier / subscriptionStatus; until then admins can set a
 * tier manually and these helpers gate features off whatever tier is stored.
 */
import type { SubscriptionStatus, SubscriptionTier } from "@prisma/client";
import type { Response } from "express";
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
  advancedFilters: boolean; // PLUS
  savedSearches: boolean; // PLUS
  dealAlerts: boolean; // PLUS
  portfolioTools: boolean; // PLUS
  personalizedNews: boolean; // PLUS
  privateDiscussions: boolean; // PLUS
  privateHubs: boolean; // ELITE
  premiumRooms: boolean; // ELITE
  earlyAccess: boolean; // ELITE
  exportReports: boolean; // ELITE
  verifiedBadgeRequest: boolean; // ELITE
  advancedAnalytics: boolean; // ELITE
  canPostOpportunities: boolean; // BUSINESS or ELITE
  sponsoredPlacement: boolean; // BUSINESS
  leadDashboard: boolean; // BUSINESS
}

export function entitlementsFor(tier: SubscriptionTier): Entitlements {
  // PLUS-level "general premium" features are shared by PLUS, ELITE and the
  // BUSINESS deal-poster track. ELITE-exclusive features (private hubs, premium
  // rooms, exports, verified badge, advanced analytics, early access) are
  // ELITE-only — BUSINESS is a sibling track, NOT a superset of ELITE, so it
  // must not inherit them (was a privilege-escalation bug when derived by rank).
  const plus = tierAtLeast(tier, "PLUS");
  const elite = tier === "ELITE";
  const business = tier === "BUSINESS";
  return {
    tier,
    savedOpportunityLimit: plus ? null : 10,
    advancedFilters: plus,
    savedSearches: plus,
    dealAlerts: plus,
    portfolioTools: plus,
    personalizedNews: plus,
    privateDiscussions: plus,
    privateHubs: elite,
    premiumRooms: elite,
    earlyAccess: elite,
    exportReports: elite,
    verifiedBadgeRequest: elite,
    advancedAnalytics: elite,
    canPostOpportunities: business || elite,
    sponsoredPlacement: business,
    leadDashboard: business,
  };
}

/**
 * Subscription statuses that grant paid access. Billing/Stripe webhooks are the
 * source of truth: a stored paid tier only counts while the subscription is
 * actually active (or trialing). PAST_DUE / CANCELED / NONE fall back to FREE so
 * a lapsed subscriber cannot keep using paid features.
 */
const ACTIVE_STATUSES: SubscriptionStatus[] = ["ACTIVE", "TRIALING"];

/** The tier to enforce against: the stored tier only if billing is active. */
export function effectiveTier(
  tier: SubscriptionTier | null | undefined,
  status: SubscriptionStatus | null | undefined,
): SubscriptionTier {
  if (!tier || tier === "FREE") return "FREE";
  return status && ACTIVE_STATUSES.includes(status) ? tier : "FREE";
}

/** Loads the user's stored tier from their profile (defaults to FREE). */
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
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { subscriptionTier: true, subscriptionStatus: true },
  });
  return entitlementsFor(
    effectiveTier(profile?.subscriptionTier, profile?.subscriptionStatus),
  );
}

/**
 * Server-side premium gate. Loads the user's role + tier and runs `check`
 * against their entitlements. ADMINs always pass. On failure it sends a 403
 * `upgrade_required` response and returns false, so callers do:
 *
 *   if (!(await ensureEntitled(res, userId, (e) => e.portfolioTools, {
 *     feature: "portfolioTools", message: "..." }))) return;
 *
 * This is the single source of truth for paid-feature access; gating lives on
 * the backend so a Free user cannot bypass it by calling the route directly.
 */
export async function ensureEntitled(
  res: Response,
  userId: string,
  check: (e: Entitlements) => boolean,
  opts: { feature: string; message: string },
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      profile: { select: { subscriptionTier: true, subscriptionStatus: true } },
    },
  });
  if (user?.role === "ADMIN") return true;
  const tier = effectiveTier(
    user?.profile?.subscriptionTier,
    user?.profile?.subscriptionStatus,
  );
  if (!check(entitlementsFor(tier))) {
    res.status(403).json({
      error: "upgrade_required",
      feature: opts.feature,
      message: opts.message,
    });
    return false;
  }
  return true;
}
