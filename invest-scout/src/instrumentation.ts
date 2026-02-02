import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/db";
import { closeRedisClient } from "@/lib/redis";

let sdk: NodeSDK | null = null;

export async function register() {
  if (process.env.NODE_ENV === "production" && !process.env.NEXTAUTH_SECRET) {
    logger.warn("NEXTAUTH_SECRET is not set; authentication tokens are insecure in production.");
  }
  if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    sdk = new NodeSDK({
      traceExporter: new OTLPTraceExporter(),
      instrumentations: [getNodeAutoInstrumentations()],
    });
    await sdk.start();
    logger.info("OpenTelemetry initialized");
  }

  const shutdown = async () => {
    logger.info("Shutting down gracefully");
    await prisma.$disconnect().catch(() => undefined);
    await closeRedisClient().catch(() => undefined);
    if (sdk) {
      await sdk.shutdown().catch(() => undefined);
    }
  };

  process.on("SIGTERM", () => {
    void shutdown();
  });
  process.on("SIGINT", () => {
    void shutdown();
  });
}
