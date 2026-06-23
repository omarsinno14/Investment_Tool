/**
 * adminHealth.ts — Admin health monitoring unit (Phase 12, special ask).
 *
 * Aggregates the operational status of every subsystem with fault isolation:
 * each probe runs independently and a failure in one is reported as a degraded
 * subsystem rather than failing the whole report. The admin dashboard renders
 * each subsystem with an ok / warn / down status so faults can be located fast.
 */
import { Router } from "express";
import { prisma } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { requireAdmin } from "../lib/adminGuard.js";
import { emailConfigured } from "../lib/email.js";
import { getRecentErrors, getCounters } from "../lib/healthMetrics.js";

const router = Router();

type Status = "ok" | "warn" | "down";

interface Subsystem {
  key: string;
  label: string;
  status: Status;
  detail: string;
  meta?: Record<string, unknown>;
}

const processStartedAt = Date.now();

function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

async function probe<T>(fn: () => Promise<T>): Promise<{ ok: boolean; value?: T; error?: string }> {
  try {
    const value = await fn();
    return { ok: true, value };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "error" };
  }
}

router.get("/admin/health", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const subsystems: Subsystem[] = [];

  // 1. Database connectivity + latency.
  const dbStart = Date.now();
  const db = await probe(() => prisma.$queryRaw`SELECT 1`);
  const dbLatency = Date.now() - dbStart;
  subsystems.push({
    key: "database",
    label: "Database",
    status: db.ok ? (dbLatency > 800 ? "warn" : "ok") : "down",
    detail: db.ok ? `Connected (${dbLatency}ms)` : `Unreachable: ${db.error ?? "unknown"}`,
    meta: { latencyMs: dbLatency },
  });

  // 2. Email transport.
  const emailOk = emailConfigured();
  subsystems.push({
    key: "email",
    label: "Email delivery",
    status: emailOk ? "ok" : "warn",
    detail: emailOk
      ? "Resend API key configured"
      : "No email provider configured — emails are logged, not sent",
  });

  // 3. Payments.
  const stripeOk = stripeConfigured();
  subsystems.push({
    key: "payments",
    label: "Payments",
    status: stripeOk ? "ok" : "warn",
    detail: stripeOk
      ? "Stripe configured"
      : "Stripe not connected — paid plans run in dev-activation mode",
  });

  // 4. Required environment.
  const requiredEnv = ["DATABASE_URL", "SESSION_SECRET", "PORT"];
  const missingEnv = requiredEnv.filter((k) => !process.env[k]);
  subsystems.push({
    key: "environment",
    label: "Environment",
    status: missingEnv.length === 0 ? "ok" : "down",
    detail:
      missingEnv.length === 0
        ? "All required variables present"
        : `Missing: ${missingEnv.join(", ")}`,
    meta: { missing: missingEnv },
  });

  // 5. Background scheduler (cron).
  const cronOk = process.env.DISABLE_CRON !== "1";
  subsystems.push({
    key: "scheduler",
    label: "Background scheduler",
    status: cronOk ? "ok" : "warn",
    detail: cronOk ? "Weekly digest scheduler active" : "Scheduler disabled via DISABLE_CRON",
  });

  // 6. Operational backlogs (work waiting on admins). Probed independently.
  const backlog = await probe(async () => {
    const [pendingVerifications, openReports, openTickets, pendingApprovals, pendingDeals] =
      await Promise.all([
        prisma.verificationRequest.count({ where: { status: "PENDING" } }),
        prisma.report.count({ where: { resolvedAt: null } }),
        prisma.supportTicket.count({ where: { status: "OPEN" } }),
        prisma.adminSignupRequest.count({ where: { status: "PENDING" } }),
        prisma.opportunity.count({ where: { dealVerification: "PENDING" } }),
      ]);
    return { pendingVerifications, openReports, openTickets, pendingApprovals, pendingDeals };
  });
  if (backlog.ok && backlog.value) {
    const total =
      backlog.value.pendingVerifications +
      backlog.value.openReports +
      backlog.value.openTickets +
      backlog.value.pendingApprovals +
      backlog.value.pendingDeals;
    subsystems.push({
      key: "backlog",
      label: "Moderation backlog",
      status: total === 0 ? "ok" : total > 25 ? "warn" : "ok",
      detail:
        total === 0 ? "No items awaiting review" : `${total} item(s) awaiting admin review`,
      meta: backlog.value,
    });
  } else {
    subsystems.push({
      key: "backlog",
      label: "Moderation backlog",
      status: "down",
      detail: `Could not read backlog: ${backlog.error ?? "unknown"}`,
    });
  }

  // 7. Recent error rate (in-process telemetry).
  const counters = getCounters();
  const recentErrors = getRecentErrors(15);
  subsystems.push({
    key: "errors",
    label: "Server errors",
    status: counters.errorRate > 0.1 ? "down" : counters.errorCount > 0 ? "warn" : "ok",
    detail:
      counters.errorCount === 0
        ? "No errors recorded this session"
        : `${counters.errorCount} error(s), ${(counters.errorRate * 100).toFixed(1)}% of requests`,
    meta: { ...counters },
  });

  const worst: Status = subsystems.some((s) => s.status === "down")
    ? "down"
    : subsystems.some((s) => s.status === "warn")
      ? "warn"
      : "ok";

  res.json({
    overall: worst,
    checkedAt: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - processStartedAt) / 1000),
    version: process.env.APP_VERSION ?? "1.0.0",
    nodeEnv: process.env.NODE_ENV ?? "development",
    subsystems,
    recentErrors,
  });
});

router.get("/admin/health/errors", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;
  try {
    res.json({ errors: getRecentErrors(50) });
  } catch (e) {
    logger.error({ err: e }, "health errors read failed");
    res.status(500).json({ error: "Could not read errors" });
  }
});

export default router;
