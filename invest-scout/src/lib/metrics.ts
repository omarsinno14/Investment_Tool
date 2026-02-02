import client from "prom-client";

const globalForMetrics = globalThis as unknown as { metricsRegistered?: boolean };

if (!globalForMetrics.metricsRegistered) {
  client.collectDefaultMetrics({
    prefix: "invest_scout_",
  });
  globalForMetrics.metricsRegistered = true;
}

export const httpRequestDuration = new client.Histogram({
  name: "invest_scout_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["route", "method", "status"],
  buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5],
});

export const httpRequestErrors = new client.Counter({
  name: "invest_scout_http_request_errors_total",
  help: "HTTP request errors",
  labelNames: ["route", "method", "status"],
});

export async function getMetrics() {
  return client.register.metrics();
}
