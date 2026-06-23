---
name: Vertica platform conventions
description: Non-obvious conventions for the Vertica investment-scout pnpm monorepo (web + API + mobile).
---

# Vertica platform

## Palette (strict — no other colors)
Bourgeois Minimal: Espresso Black #15110D, Cashmere Beige #F4EFE6, Soft Taupe #D6C7B3, Muted Bronze #A7793D, Olive Wealth #4F5D3B, Cream Card #FFFDF8, Dusty Gray #A8A29E.
Use shadcn semantic tokens mapped to these (bg-background/text-foreground/bg-primary/bg-card/text-muted-foreground/border/text-destructive). Never hardcode tailwind colors like text-red-600.
**Loading rule:** skeletons/loading states must be neutral `bg-muted` — NOT `bg-accent` (Muted Bronze reads as "orange" and is explicitly disallowed for loading). Mobile spinners use olive primary (fine).

## Compliance wording (hard constraint)
Never "guaranteed returns" — use projected/target/estimated. No real money movement/escrow/brokerage. Payments are only for subscriptions/ads/verification, never investment capital. No emojis in UI.

## API route gotchas
**Why:** routes are mounted flat (each router defines its own `/auth` vs `/user` prefix per-route), so prefixes are NOT consistent across the app.
- Registration is **POST /api/register** (routes/register.ts), NOT /api/auth/register. Body requires `email, password, confirmPassword, firstName, lastName, username, dob`. Register does NOT auto-login.
- Login/session/logout: **/api/auth/login**, **/api/auth/session**, **/api/auth/logout** (routes/auth.ts).
- Email verification: **/api/auth/verify-email/send** and **/api/auth/verify-email/confirm** (NOT /api/user/...). send returns `devToken` in non-prod.
- Identity verification (docs): GET/POST **/api/user/verification** — POST `{docType, fileUrls[], note}` → status PENDING. GET → `{requests[], identityVerified}`.
- Heartbeat (AppSession hours): POST **/api/user/heartbeat** `{platform,sessionId?}` → `{sessionId}`. Web wires via useHeartbeat in AppShell (60s, visibility-gated).
- Support: POST **/api/support** `{subject,message,category}`.

## Auth transport differences (web vs mobile)
**Why:** the two clients authenticate differently; mixing them up breaks requests.
- Web uses plain `fetch` with `credentials: "include"` (session cookie). There is NO apiFetch helper in web.
- Mobile uses `apiFetch` from `lib/api.ts`. Mobile screens use apiFetch + useState (NOT react-query hooks, despite QueryClient being present).
- **apiFetch (and plain fetch) do NOT throw on HTTP 4xx/5xx.** For optimistic UI (save/unsave bookmarks, toggles), you MUST check `if (!res.ok) throw` before treating it as success, or the catch-based rollback never fires and UI silently diverges from server truth.

## Privacy — never leak email in listing/search/feed payloads
**Why:** broad authenticated listing endpoints (search, discovery/suggested-follows, opportunity feed) are visible to any member; returning `email` exposes every member's address.
**How to apply:** user-select shapes used by opportunities/search/discovery must select only `id` + profile fields (name/username/imageUrl/identityVerified...), never `email`. Do not search users by email either (enables enumeration). Email is fine only on the viewer's own profile and admin-gated routes.

## Opportunity counts & sorting
- savesCount/interestedCount are COMPUTED from OpportunityAction (SAVED→saves; VERY_INTERESTED/INVESTED→interested), NOT denormalized columns.
- DealStatus enum {DRAFT,OPEN,CLOSING_SOON,FUNDED,CLOSED}; dealVerification = VerificationStatus enum.
- **Cursor pagination cannot be combined with count-based sorts** (mostSaved/highestInterest): counts aren't DB columns, so paginating by DB order then re-sorting in memory causes dupes/gaps. For those sorts, fetch a bounded window, sort in memory, return a single page with nextCursor=null.

## Notifications
- `lib/notify.ts` `notifyUser` is best-effort and failure-isolated (full try/catch, push best-effort, never throws) and preference-aware. Notification payload detail (link/title/actorId etc.) is stored in `Notification.data` JSON — there are no dedicated columns for those.

## Profile
- Main profile GET/POST is **routes/profile.ts** at /api/user/profile (NOT userAccount.ts). POST is partial-update: each field guarded by `if (body.x !== undefined)`.
- Profile has dateOfBirth(DateTime?)/country/city. Settings must NOT let users self-set emailVerified/phoneVerified/identityVerified — those are server/admin controlled.

## Admin
- Seeded admin: admin@vertica.app. Admin endpoints under /api/admin/* are ADMIN-role gated. `role` is exposed at top level of /api/user/profile. Admin actions are audit-logged (AuditLog model).

## Operational endpoints (plain Express JSON, NOT codegen)
GET /api/health (db $queryRaw SELECT 1 + uptime + version, 503 if db down), /api/version, /api/healthz (liveness) — in routes/health.ts. Env validated up front by lib/env.ts validateEnv() in index.ts (which dynamic-imports ./app so validation runs before scattered throws). Required: DATABASE_URL, SESSION_SECRET, PORT. .env.example at repo ROOT.

## Seed data
- prisma/seed.ts (`npx tsx prisma/seed.ts`) seeds FEATURED_HUBS + WORLD_COUNTRIES; POST /api/admin/seed-hubs (ADMIN-only, idempotent) seeds INVESTMENT_HUBS.
- prisma/seedOpportunities.ts (`npx tsx`) seeds ~20 realistic deals — the deal system is the product heart, so a near-empty Opportunity table should be re-seeded.

## Expo .expo-subdomain preview broken in path-routed multi-artifact repl
In a multi-artifact repl where the web app owns `router="path"` paths=["/"] on externalPort 80 and Expo is a separate path artifact (paths=["/mobile"], externalPort 3000), `$REPLIT_EXPO_DEV_DOMAIN` serves the WEB app for ALL paths, never Metro. The canvas mobile preview + screenshot tool both load `$REPLIT_EXPO_DEV_DOMAIN`, so they show the web app or a dead `exp://` link.
**Why:** the `.expo` subdomain resolves to the root/default service (web at "/") and ignores path routing; the edge port→domain mapping does not honor 18547→3000 here. Metro is healthy and renders at `$REPLIT_DEV_DOMAIN/mobile` (main domain, path-routed).
**How to apply:** do NOT keep restarting the expo workflow or re-registering the artifact (neither refreshes the edge mapping). To verify mobile use `$REPLIT_DEV_DOMAIN/mobile`. Refreshing the edge mapping needs a full repl/environment restart, which only the user/platform can trigger.

## Stale canvas preview iframes (white screen / 404 false alarms)
A reported "web is white" / "mobile is 404" in the canvas can be a stale iframe, NOT a server fault. The iframe does NOT auto-reload when a workflow restarts; it keeps the last frame.
**Why:** agent screenshots/curl hit fresh sessions and pass (200 + render) while the user's cached iframe shows the old broken state.
**How to apply:** verify health first (curl localhost:80/<path> and the Expo domain → expect 200; reproduce logged-in via runTest since some crashes are auth-only). If healthy, restart the workflow then re-call presentArtifact per artifact to force reload. Expo web also needs a first-load Metro bundle (~10-30s) which can transiently error.
