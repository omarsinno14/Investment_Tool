import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import prisma from "../lib/db";

const router: IRouter = Router();

const startedAt = Date.now();
const APP_VERSION = process.env.APP_VERSION ?? "1.0.0";

/** Liveness probe used by the platform — fast, no dependencies. */
router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

/**
 * Readiness/health endpoint. Reports database connectivity, uptime, and
 * version. Returns 503 when a dependency is unhealthy so monitors can react.
 */
router.get("/health", async (_req, res) => {
  let database: "ok" | "error" = "ok";
  let healthy = true;

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = "error";
    healthy = false;
  }

  res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "degraded",
    database,
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
  });
});

/** Version/build metadata. */
router.get("/version", (_req, res) => {
  res.json({
    version: APP_VERSION,
    node: process.version,
    environment: process.env.NODE_ENV ?? "development",
  });
});

export default router;
