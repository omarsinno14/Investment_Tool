import session from "express-session";

const SESSION_SECRET = process.env.SESSION_SECRET ?? "vertica-dev-secret-change-in-prod";

export const sessionMiddleware = session({
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
  }
}
