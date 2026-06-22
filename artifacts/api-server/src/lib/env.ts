import { logger } from "./logger";

interface EnvSpec {
  name: string;
  required: boolean;
  description: string;
}

const ENV_SPECS: EnvSpec[] = [
  {
    name: "DATABASE_URL",
    required: true,
    description: "PostgreSQL connection string used by Prisma.",
  },
  {
    name: "SESSION_SECRET",
    required: true,
    description: "Secret used to sign session cookies. Use a long random string.",
  },
  {
    name: "PORT",
    required: true,
    description: "Port the API server listens on.",
  },
  {
    name: "NODE_ENV",
    required: false,
    description: "Runtime environment: development | production.",
  },
  {
    name: "ALLOWED_ORIGINS",
    required: false,
    description: "Comma-separated list of additional allowed CORS origins.",
  },
  {
    name: "LOG_LEVEL",
    required: false,
    description: "Pino log level (info, debug, warn, error). Defaults to info.",
  },
  {
    name: "APP_VERSION",
    required: false,
    description: "Version string surfaced at /api/version and /api/health.",
  },
];

/**
 * Validates that all required environment variables are present before the
 * server boots. Fails fast with a clear, actionable message listing every
 * missing variable instead of crashing later with an opaque error.
 */
export function validateEnv(): void {
  const missing = ENV_SPECS.filter(
    (spec) => spec.required && !process.env[spec.name],
  );

  if (missing.length > 0) {
    for (const spec of missing) {
      logger.error(
        { variable: spec.name, description: spec.description },
        `Missing required environment variable: ${spec.name}`,
      );
    }
    throw new Error(
      `Missing required environment variable(s): ${missing
        .map((spec) => spec.name)
        .join(", ")}. See .env.example for the full list.`,
    );
  }

  logger.info(
    { count: ENV_SPECS.filter((s) => s.required).length },
    "Environment variables validated",
  );
}
