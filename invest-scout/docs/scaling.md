# Scaling & reliability notes

## Stateless API
- Sessions use JWT (NextAuth) and no server memory.
- Uploaded media is stored via `STORAGE_DRIVER`. Use `STORAGE_DRIVER=s3` in production.
- Rate limiting and caching rely on Redis (`REDIS_URL`).
- Use a managed Postgres pooler (e.g., PgBouncer) or limit connections per replica to avoid exhausting DB connections.

## Caching
- Feed responses (opportunities/forums) cached per-user with TTL (`FEED_CACHE_TTL_SECONDS`).
- Profile responses cached per viewer+target with TTL (`PROFILE_CACHE_TTL_SECONDS`).
- Invalidation: short TTL for safety; updates will refresh within TTL.

## Rate limiting (defaults)
- Login/auth: 30/min per IP
- Signup: 10/min per IP
- Feed/search/profile reads: 60-120/min per IP
- Post creation: 20/min per IP
- Comments: 60/min per IP
- Reactions: 120/min per IP
- Uploads: 10-20/min per IP

Configure by editing the rate limit values in routes or add env overrides if stricter limits are required.

## Graceful shutdown
`src/instrumentation.ts` registers SIGTERM/SIGINT handlers to close Prisma, Redis, and OpenTelemetry cleanly.

## Observability
- Structured JSON logs via Pino.
- Prometheus metrics at `/api/metrics`.
- Health endpoints: `/healthz` and `/readyz`.
- Optional OpenTelemetry traces via `OTEL_EXPORTER_OTLP_ENDPOINT`.

## Background jobs
- BullMQ queue `image-processing` in Redis.
- Worker `worker/image-processor.ts` generates 320px thumbnails asynchronously.

## Uploads
- Server uploads to S3/local. For direct-to-storage: `/api/uploads/presign`.
- Validate file size & mime type via env limits.
