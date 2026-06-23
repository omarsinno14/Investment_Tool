---
name: deployment notes
description: Vertica production-deploy gotchas — session store, multi-service router, root-build vs per-artifact build.
---

# Vertica deployment

## Sessions must be Postgres-backed (not MemoryStore)
The API uses `express-session`. The default in-memory store **breaks on autoscale**:
autoscale runs multiple instances and scales to zero, so MemoryStore loses sessions
on every cold start and never shares them across instances → users randomly logged out.
Fix in place: `connect-pg-simple` store (`user_sessions` table, `createTableIfMissing`)
using a `pg` Pool on `DATABASE_URL`.
**Why:** deploymentTarget is `autoscale` in `.replit`.
**How to apply:** never revert session storage to the default; any new long-lived
server state in production must be DB-backed, not in-process.

## Deploy build is per-artifact, NOT root `pnpm run build`
Deployment runs each artifact's `[services.production.build]` from its
`.replit-artifact/artifact.toml`. The root `pnpm run build` builds ALL workspace
packages and **fails on `mockup-sandbox`** (its `vite.config.ts` throws when `PORT`
is unset). That failure is irrelevant to deployment — `mockup-sandbox` has no
`[services.production]` block, so production never builds it. Don't be alarmed by a
red root build; verify the real deploy commands instead:
`pnpm --filter @workspace/invest-scout run build` (web, static) and the api-server build.

## Production topology (application router, multi-service)
`.replit` has `router = "application"`, `deploymentTarget = "autoscale"`. One deployment
serves multiple artifacts by path: web (`invest-scout`) static at `/`, API
(`api-server`) process at `/api` (health `/api/healthz`, PORT 8080), mobile at `/mobile`.
Web calls the API via relative `/api/...`, but the browser STILL sends an `Origin`
header and the `cors` middleware enforces an allowlist — so the production origin
MUST be allowed or every API call throws 500. Allowlist (app.ts) must include
`.replit.app` (auto-assigned publish domain) and `verticainvest.com` (custom domain),
alongside the dev `.replit.dev`/`.repl.co`/localhost entries. `ALLOWED_ORIGINS` env
can add more. **Do not assume "same-origin ⇒ no CORS"** — the Origin header is sent
regardless and an unlisted origin returns 500, not a CORS warning.
Secrets (SESSION_SECRET, DATABASE_URL, PG*) are global → available in production.
`appUrl()` for emails reads `WEB_APP_URL` (fallback `PUBLIC_WEB_URL`).
