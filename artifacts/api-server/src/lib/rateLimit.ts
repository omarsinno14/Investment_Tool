/**
 * rateLimit.ts — shared rate limiters (Phase 15).
 *
 * In-memory limiters (per-process). Suitable for a single API instance; for
 * horizontal scaling swap the store for Redis. Keyed by client IP.
 */
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

const isProd = process.env.NODE_ENV === "production";

const json = (res: import("express").Response, message: string) =>
  res.status(429).json({ error: message });

/** Strict limiter for credential endpoints — brute-force protection. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  // Limit per IP + email so one IP can't lock out everyone, and one account
  // can't be hammered from many IPs.
  keyGenerator: (req) => {
    const email = String(req.body?.email ?? "").toLowerCase().trim();
    return `${ipKeyGenerator(req.ip ?? "")}:${email}`;
  },
  handler: (_req, res) =>
    json(res, "Too many attempts. Please wait a few minutes and try again."),
});

/** Limiter for account-creation / password-reset request endpoints. */
export const accountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isProd ? 15 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) =>
    json(res, "Too many requests. Please try again later."),
});

/** Broad limiter applied to the whole API surface as a safety net. */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isProd ? 300 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => json(res, "Rate limit exceeded. Slow down a little."),
});
