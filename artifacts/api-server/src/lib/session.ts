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
// sessions across instances. The session table is auto-created on first boot.
const PgSession = connectPgSimple(session);
const sessionPool = new Pool({ connectionString: DATABASE_URL });

export const sessionMiddleware = session({
  store: new PgSession({
    pool: sessionPool,
    tableName: "user_sessions",
    createTableIfMissing: true,
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
