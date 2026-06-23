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
Web calls the API via relative `/api/...` (same-origin) so CORS is not triggered in prod.
Secrets (SESSION_SECRET, DATABASE_URL, PG*) are global → available in production.
`appUrl()` for emails reads `WEB_APP_URL` (fallback `PUBLIC_WEB_URL`).
