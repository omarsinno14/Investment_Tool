---
name: Vertica paid-feature entitlement enforcement
description: How paid-plan gating works server-side, the tier matrix decision, and the status-as-source-of-truth rule.
---

# Paid-feature entitlement enforcement

Server-side gating lives in `lib/subscription.ts` and is the single source of
truth. `ensureEntitled(res, userId, check, {feature, message})` is the guard used
by routes (ADMIN bypasses; on fail sends `403 {error:"upgrade_required", feature,
message}`). `getUserEntitlements(userId)` is used for non-403 branching
(save-limit counting, news personalization).

## Tier matrix — BUSINESS is a SIBLING track, not a superset of ELITE
**Rule:** PLUS-level "general premium" features (advancedFilters, savedSearches,
dealAlerts, portfolioTools, personalizedNews, privateDiscussions, unlimited
saves) are granted to PLUS, ELITE and BUSINESS. ELITE-exclusive features
(privateHubs, premiumRooms, earlyAccess, exportReports, verifiedBadgeRequest,
advancedAnalytics) are ELITE-ONLY. Posting/sponsored/lead are BUSINESS (posting
also allowed for ELITE).
**Why:** plan cards make BUSINESS a $99 deal-poster track that does NOT list ELITE
perks. Deriving ELITE via `tierAtLeast(tier,"ELITE")` with `RANK[BUSINESS]=3 >
RANK[ELITE]=2` silently gave BUSINESS every ELITE feature — a privilege
escalation. Compute ELITE-exclusive flags with `tier === "ELITE"`, NOT rank.
**How to apply:** when adding a new entitlement, decide explicitly which of the
three buckets it belongs to; never assume a linear hierarchy. `tierAtLeast` is
only safe for the PLUS bucket.

## Subscription STATUS gates access, not just tier
**Rule:** a stored paid `subscriptionTier` only counts while
`subscriptionStatus` is ACTIVE or TRIALING. PAST_DUE / CANCELED / NONE fall back
to FREE. Implemented via `effectiveTier(tier, status)`, used by both
`ensureEntitled` and `getUserEntitlements`.
**Why:** Stripe webhooks are the intended source of truth; a lapsed subscriber
must not keep paid features just because the tier column still says PLUS.
**How to apply:** any new enforcement path must go through `effectiveTier` /
`getUserEntitlements` / `ensureEntitled`, never read `subscriptionTier` raw for
gating. The dev `/billing/activate` sets status ACTIVE, so it still works.

## Opportunity-save FK bug (pre-existing, separate concern)
`POST /opportunities/:id/action` with `state:"SAVED"` 500s
(`OpportunityAction_opportunityId_fkey`, P2003) when the id is a news-headline
that is NOT a real `Opportunity` row. The feed mixes real DB opportunities with
synthetic headline items. The save-limit gate sits before the upsert and is
unaffected; the FK violation is in the original upsert. Not an entitlement issue.
