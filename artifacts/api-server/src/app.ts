import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { sessionMiddleware } from "./lib/session";
import { apiLimiter } from "./lib/rateLimit";
import { recordRequest, recordError } from "./lib/healthMetrics";

const app: Express = express();

// Behind the Replit proxy — required for secure cookies and correct client IPs
// (rate limiting keys off req.ip).
app.set("trust proxy", 1);

// Security headers. CSP is disabled (this is a JSON API, not an HTML origin),
// and CORP is relaxed so browser clients on other origins can read responses.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

const extraOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : [];

const defaultOrigins = ["http://localhost", "http://127.0.0.1"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const allowed =
        defaultOrigins.some((o) => origin.startsWith(o)) ||
        extraOrigins.some((o) => origin.startsWith(o)) ||
        origin.includes(".replit.dev") ||
        origin.includes(".repl.co") ||
        origin.includes(".picard.replit.dev") ||
        origin.includes(".replit.app") ||
        origin.includes("verticainvest.com");
      if (allowed) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin not allowed: ${origin}`), false);
      }
    },
    credentials: true,
  }),
);

app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(sessionMiddleware);

// Health telemetry — count every request and any 5xx response for the admin
// health monitoring unit. Cheap and synchronous.
app.use((req, res, next) => {
  recordRequest();
  res.on("finish", () => {
    if (res.statusCode >= 500) {
      recordError(`${req.method} ${req.path}`, `HTTP ${res.statusCode}`);
    }
  });
  next();
});

app.use("/api", apiLimiter, router);

// Centralized error handler — records the fault for the health unit, then
// returns a generic 500 (never leaks internals to clients).
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    recordError(`${req.method} ${req.path}`, err);
    logger.error({ err }, "Unhandled route error");
    if (res.headersSent) return;
    res.status(500).json({ error: "Internal server error" });
  },
);

export default app;
