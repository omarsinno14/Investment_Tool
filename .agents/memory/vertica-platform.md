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
