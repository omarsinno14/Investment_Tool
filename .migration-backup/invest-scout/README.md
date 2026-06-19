This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm install
npm run db:up
npm run prisma:migrate
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

### Local development notes

- The database is expected to be Postgres (see `docker-compose.yml`).
- Redis is required for rate limiting, caching, and queues (see `docker-compose.yml`).
- `npm run prisma:migrate` will apply new migrations and generate the Prisma client.
- If you only need Prisma types, `npm run prisma:generate` is sufficient.
- Run `npm run test:smoke` to validate core API auth guards without a running server.


## Vertica run checklist (cookies/secrets/url/db/prisma)

1. Create env file:

```bash
cp .env.example .env
```

2. Set strong secrets (required for auth cookies/session):

```bash
openssl rand -hex 32
```

- Put the value in `NEXTAUTH_SECRET`.
- Keep `NEXTAUTH_URL` and `APP_URL` identical (usually `http://localhost:3000` in dev).

3. Start Postgres + Redis:

```bash
npm run db:up
```

4. Validate env wiring before boot:

```bash
npm run env:check
```

5. Apply Prisma migrations + generate client:

```bash
npm run prisma:migrate
```

6. Seed super admin:

```bash
npm run prisma:seed
```

7. Start app:

```bash
npm run dev
```

If you need a clean DB reset:

```bash
docker compose down -v
npm run db:up
npm run prisma:migrate
npm run prisma:seed
```

## Production configuration

1. Copy `.env.example` to `.env` and set values via environment variables only (no secrets in Git).
2. Configure `DATABASE_URL`, `NEXTAUTH_SECRET`, and `REDIS_URL`.
3. For stateless uploads, set `STORAGE_DRIVER=s3` and configure S3 settings.
4. Run the image worker for background processing:

```bash
node --env-file .env worker/image-processor.ts
```

## Scaling & reliability

- Health endpoints: `/healthz` and `/readyz`.
- Metrics: `/api/metrics` (Prometheus format).
- Tracing: set `OTEL_EXPORTER_OTLP_ENDPOINT` to enable OpenTelemetry.
- Rate limits and cache TTLs are described in `docs/scaling.md`.
- DB index changes are documented in `docs/db-changes.md`.

## Load testing

See `docs/load-testing.md` for k6 scripts and how to run scenarios.

## News ingestion & freshness

- Sources are configured in `config/news-sources.json` (global + country-specific RSS feeds).
- Interest keyword mappings live in `config/interest-keywords.json`.
- Use env vars to override paths and defaults:
  - `NEWS_SOURCES_PATH`
  - `NEWS_INTEREST_KEYWORDS_PATH`
  - `NEWS_DEFAULT_COUNTRIES`
  - `NEWS_MAX_SOURCES`

**Freshness rule**: articles older than 6 months are rejected during ingestion and filtered out of queries. This cutoff is enforced in `/api/admin/ingest` and `/api/opportunities?type=headlines`.

To run ingestion locally:
```bash
ADMIN_INGEST_TOKEN=local-token npm run worker
# or call the endpoint directly
curl -H "Authorization: Bearer local-token" -X POST http://localhost:3000/api/admin/ingest
```

## Deployment notes

Recommended: Docker/Kubernetes with horizontal scaling for the Next.js API and separate worker replicas.
Use managed Postgres, managed Redis, and S3-compatible object storage in production. Ensure `STORAGE_DRIVER=s3` in production to keep API servers stateless.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
