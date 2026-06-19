import { NextResponse } from "next/server";
import { getRequestId } from "@/lib/request-context";
import { httpRequestDuration, httpRequestErrors } from "@/lib/metrics";

export function jsonResponse(
  req: Request,
  data: unknown,
  status = 200,
  routeLabel = "unknown",
  requestId?: string
) {
  const resolvedRequestId = requestId ?? getRequestId(req);
  const response = NextResponse.json(data, { status });
  response.headers.set("x-request-id", resolvedRequestId);
  if (status >= 400) {
    httpRequestErrors.labels(routeLabel, req.method, String(status)).inc();
  }
  return response;
}

export async function withTiming<T>(fn: () => Promise<T>, req: Request, routeLabel: string) {
  const start = Date.now();
  const result = await fn();
  const durationSeconds = (Date.now() - start) / 1000;
  const status = (result as { status?: number })?.status ?? 200;
  httpRequestDuration.labels(routeLabel, req.method, String(status)).observe(durationSeconds);
  return result;
}
