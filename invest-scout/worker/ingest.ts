import cron from "node-cron";

function normalizeBase(base: string) {
  // Avoid localhost (can resolve to IPv6 / weird bindings in Codespaces)
  return base.replace("http://localhost:", "http://127.0.0.1:");
}

async function runOnce() {
  const token = process.env.ADMIN_INGEST_TOKEN ?? "";

  const rawBase =
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://127.0.0.1:3000";

  const base = normalizeBase(rawBase);
  const url = `${base}/api/admin/ingest`;

  console.log(new Date().toISOString(), "Calling:", url);

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  const ct = res.headers.get("content-type") ?? "";
  const body = ct.includes("application/json")
    ? await res.json().catch(() => ({}))
    : await res.text().catch(() => "");

  console.log(
    new Date().toISOString(),
    "Ingest:",
    res.status,
    ct.includes("application/json")
      ? body
      : `(non-JSON: ${ct || "unknown"}) ${String(body).slice(0, 180)}`
  );
}

async function main() {
  console.log("Worker started.");

  // every 10 minutes
  cron.schedule("*/10 * * * *", async () => {
    await runOnce();
  });

  // also run immediately at startup
  await runOnce();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
