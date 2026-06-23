import { logger } from "./lib/logger";
import { validateEnv } from "./lib/env";

async function main(): Promise<void> {
  validateEnv();

  const rawPort = process.env["PORT"];
  const port = Number(rawPort);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  const { default: app } = await import("./app");

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");

    // Start background schedulers (weekly digest, etc).
    void import("./lib/cron").then(async ({ startCron }) => {
      const { prisma } = await import("./lib/db");
      startCron(prisma);
    });
  });
}

main().catch((err) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
