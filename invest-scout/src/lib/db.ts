import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient | null;
  prismaError?: Error | null;
};

function createPrisma() {
  try {
    const client = new PrismaClient({
      log: ["error", "warn"],
    });

    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.prisma = client;
    }

    return client;
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    globalForPrisma.prismaError = err;
    console.error("Failed to initialize Prisma client", err);
    return null;
  }
}

/**
 * Lazily obtain the Prisma client without throwing during module evaluation.
 * Routes can return a JSON error instead of Next rendering an HTML error page
 * when the database URL/connection is missing or misconfigured.
 */
export function getPrismaClient() {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  if (globalForPrisma.prismaError) return null;

  globalForPrisma.prisma = createPrisma();
  return globalForPrisma.prisma ?? null;
}
