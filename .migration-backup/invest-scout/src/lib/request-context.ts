import { randomUUID } from "crypto";

export function getRequestId(req: Request): string {
  return req.headers.get("x-request-id") || randomUUID();
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") || "unknown";
}
