import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required");
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Persist sessions in Postgres rather than the default in-memory store.
// Autoscale deployments run multiple instances and scale to zero, so an
// in-memory store would log users out on every cold start and fail to share
// sessions across instances. The session table is created at startup via
// ensureSessionTable().
const PgSession = connectPgSimple(session);
const sessionPool = new Pool({ connectionString: DATABASE_URL });

const SESSION_TABLE = "user_sessions";

// connect-pg-simple's `createTableIfMissing` reads a `table.sql` file from its
// package directory at runtime. esbuild bundles the server into a single file,
// so that asset is not present on disk in production and the table is never
// created — leaving every login unable to persist its session. Create the table
// ourselves with the schema connect-pg-simple expects, then disable the
// file-based path below.
export async function ensureSessionTable(): Promise<void> {
  await sessionPool.query(`
    CREATE TABLE IF NOT EXISTS "${SESSION_TABLE}" (
      "sid" varchar NOT NULL COLLATE "default",
      "sess" json NOT NULL,
      "expire" timestamp(6) NOT NULL,
      CONSTRAINT "${SESSION_TABLE}_pkey" PRIMARY KEY ("sid")
    );
  `);
  await sessionPool.query(
    `CREATE INDEX IF NOT EXISTS "IDX_${SESSION_TABLE}_expire" ON "${SESSION_TABLE}" ("expire");`,
  );
}

export const sessionMiddleware = session({
  store: new PgSession({
    pool: sessionPool,
    tableName: SESSION_TABLE,
    createTableIfMissing: false,
  }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: "lax",
  },
});

declare module "express-session" {
  interface SessionData {
    userId: string;
    userRole: string;
    sessionEpoch: number;
  }
}
