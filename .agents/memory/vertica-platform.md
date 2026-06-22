---
name: Vertica platform conventions
description: Non-obvious conventions for the Vertica investment-scout pnpm monorepo (web + API + mobile).
---

# Vertica platform

## Palette (strict — no other colors)
Bourgeois Minimal: Espresso Black #15110D, Cashmere Beige #F4EFE6, Soft Taupe #D6C7B3, Muted Bronze #A7793D, Olive Wealth #4F5D3B, Cream Card #FFFDF8, Dusty Gray #A8A29E.
Use shadcn semantic tokens mapped to these (bg-background/text-foreground/bg-primary/bg-card/text-muted-foreground/border/text-destructive). Never hardcode tailwind colors like text-red-600.

## API route gotchas
**Why:** routes are mounted flat from userAccount.ts, so the `/user` vs `/auth` prefix is per-route, not consistent.
- Email verification lives under **/api/auth/verify-email/send** and **/api/auth/verify-email/confirm** (NOT /api/user/...). send returns `devToken` in non-prod.
- Verification (identity docs): GET/POST **/api/user/verification** — POST body `{docType, fileUrls[], note}`, returns request with status PENDING. GET returns `{requests[], identityVerified}`.
- Heartbeat (AppSession hours tracking): POST **/api/user/heartbeat** body `{platform,sessionId?}` → `{sessionId}`. Web wires this via useHeartbeat hook in AppShell (60s interval, visibility-gated).
- Support ticket: POST **/api/support** `{subject,message,category}`.

## Profile
- Main profile GET/POST is **routes/profile.ts** at /api/user/profile (NOT userAccount.ts). POST is a partial-update: each field guarded by `if (body.x !== undefined)`.
- Profile has dateOfBirth(DateTime?)/country/city. Settings must NOT let users self-set emailVerified/phoneVerified/identityVerified — those are server/admin controlled.

## Admin
- Seeded admin: admin@vertica.app. Admin endpoints under /api/admin/* are ADMIN-role gated. role is exposed at top level of /api/user/profile.

## Expo .expo-subdomain preview broken in path-routed multi-artifact repl
In a multi-artifact repl where the web app owns `router="path"` paths=["/"] on externalPort 80 and Expo is a separate path artifact (paths=["/mobile"], externalPort 3000), `$REPLIT_EXPO_DEV_DOMAIN` serves the WEB app (Vite, ~70KB) for ALL paths, never Metro. The canvas mobile preview + screenshot tool both load `$REPLIT_EXPO_DEV_DOMAIN`, so they show the web app or the dead `exp://` link.
**Why:** the `.expo` subdomain resolves to the root/default service (web at "/") and ignores path routing; the edge port→domain mapping does not honor 18547→3000 here. Metro is healthy — it IS reachable and renders at `$REPLIT_DEV_DOMAIN/mobile` (main domain, path-routed): shell + entry.bundle both 200.
**How to apply:** Do NOT keep restarting the expo workflow or re-registering the artifact — both were tried and neither refreshes the edge mapping. To view/verify the mobile app use `$REPLIT_DEV_DOMAIN/mobile`. Refreshing the edge port→domain mapping appears to need a full repl/environment restart (not a workflow restart), which the user/platform must trigger.

## Stale canvas preview iframes (white screen / 404 false alarms)
A reported "web is white" / "mobile is 404" in the canvas can be a stale iframe, NOT a server fault. The canvas iframe does NOT auto-reload when a workflow restarts; it keeps showing the last frame (e.g. a mid-edit broken bundle, or a pre-restart Expo 404).
**Why:** screenshots/curl from the agent hit fresh sessions and pass (200 + render), while the user's cached iframe still shows the old broken state.
**How to apply:** verify health first (curl localhost:80/<path> and the Expo domain → expect 200; screenshot logged-out AND reproduce logged-in via runTest since some crashes are auth-only). If healthy, restart the workflow then re-call presentArtifact for each artifact to force the iframe to reload. Expo web also needs a first-load Metro bundle (~10-30s) which can transiently error.
