/**
 * billing.ts — subscription status, plans and (dev) tier management (Phase 6/12).
 *
 * Vertica never moves investment money. Paid tiers unlock platform access only.
 * When Stripe is connected, checkout/webhooks update Profile.subscriptionTier;
 * until then a self-serve "activate" endpoint (gated to non-production) lets the
 * product be exercised end-to-end, and admins can set any tier at any time.
 */
import { Router } from "express";
import { z } from "zod";
import type { SubscriptionTier } from "@prisma/client";
import { prisma } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { requireAuth } from "../lib/adminGuard.js";
import {
  PLANS,
  planFor,
  tierLabel,
  entitlementsFor,
  getUserTier,
} from "../lib/subscription.js";
import { notifyUser } from "../lib/notify.js";
import { sendEmail } from "../lib/email.js";
import { paymentReceiptEmail } from "../lib/emailTemplates.js";

const router = Router();

const stripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);

/** Public plan catalogue + whether real checkout is available. */
router.get("/billing/plans", (_req, res) => {
  res.json({ plans: PLANS, stripeEnabled: stripeConfigured() });
});

/** Current user's subscription + entitlements. */
router.get("/billing/subscription", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: {
        subscriptionTier: true,
        subscriptionStatus: true,
        subscriptionRenewsAt: true,
      },
    });
    const tier = profile?.subscriptionTier ?? "FREE";
    res.json({
      tier,
      status: profile?.subscriptionStatus ?? "NONE",
      renewsAt: profile?.subscriptionRenewsAt ?? null,
      plan: planFor(tier),
      entitlements: entitlementsFor(tier),
      stripeEnabled: stripeConfigured(),
    });
  } catch (e) {
    logger.error({ err: e }, "billing/subscription error");
    res.status(500).json({ error: "Could not load subscription" });
  }
});

/** Payment history for the current user. */
router.get("/billing/history", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const events = await prisma.paymentEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ events });
  } catch (e) {
    logger.error({ err: e }, "billing/history error");
    res.status(500).json({ error: "Could not load payment history" });
  }
});

const TIERS: SubscriptionTier[] = ["FREE", "PLUS", "ELITE", "BUSINESS"];

const activateSchema = z.object({
  tier: z.enum(["PLUS", "ELITE", "BUSINESS"]),
});

/**
 * Self-serve activation. When Stripe is connected this is replaced by a
 * Checkout redirect; without Stripe (and outside production) it activates the
 * tier directly so the full premium experience is testable.
 */
router.post("/billing/activate", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  if (stripeConfigured()) {
    return res.status(409).json({
      error: "checkout_required",
      message: "Use Stripe Checkout to start a paid plan.",
    });
  }
  if (process.env.NODE_ENV === "production") {
    return res.status(503).json({
      error: "payments_unconfigured",
      message: "Payments are not yet enabled. Connect Stripe to subscribe.",
    });
  }

  const parsed = activateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid tier" });

  try {
    const tier = parsed.data.tier as SubscriptionTier;
    const renewsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.profile.update({
      where: { userId },
      data: {
        subscriptionTier: tier,
        subscriptionStatus: "ACTIVE",
        subscriptionRenewsAt: renewsAt,
      },
    });
    await prisma.paymentEvent.create({
      data: {
        userId,
        type: "SUBSCRIPTION_CREATED",
        tier,
        amount: planFor(tier).priceMonthly * 100,
        currency: "usd",
        status: "succeeded",
        reference: "dev-activation",
      },
    });

    // Notify + receipt (best-effort).
    await notifyUser(prisma, {
      recipientId: userId,
      type: "PAYMENT",
      title: `${tierLabel(tier)} is active`,
      body: "Your membership has been upgraded.",
      link: "/settings/billing",
    });
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, profile: { select: { notifyPayments: true } } },
    });
    if (user?.email && user.profile?.notifyPayments) {
      const tpl = paymentReceiptEmail({
        tierLabel: tierLabel(tier),
        amountLabel: `$${planFor(tier).priceMonthly}/mo`,
        reference: "dev-activation",
      });
      await sendEmail({ to: user.email, subject: tpl.subject, html: tpl.html, text: tpl.text });
    }

    return res.json({ ok: true, tier });
  } catch (e) {
    logger.error({ err: e }, "billing/activate error");
    return res.status(500).json({ error: "Could not activate plan" });
  }
});

/** Cancel — drops to FREE at period end (immediately in dev). */
router.post("/billing/cancel", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const tier = await getUserTier(userId);
    await prisma.profile.update({
      where: { userId },
      data: { subscriptionStatus: "CANCELED" },
    });
    await prisma.paymentEvent.create({
      data: { userId, type: "SUBSCRIPTION_CANCELED", tier, status: "canceled" },
    });
    res.json({ ok: true });
  } catch (e) {
    logger.error({ err: e }, "billing/cancel error");
    res.status(500).json({ error: "Could not cancel" });
  }
});

export { TIERS };
export default router;
