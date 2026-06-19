import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRedisClient } from "@/lib/redis";
import { withTimeout } from "@/lib/timeouts";

export async function GET() {
  const checks: Record<string, string> = {};

  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, 1500, "DB timeout");
    checks.database = "ok";
  } catch (err) {
    checks.database = "error";
  }

  const redis = getRedisClient();
  if (redis) {
    try {
      await withTimeout(redis.ping(), 1000, "Redis timeout");
      checks.redis = "ok";
    } catch (err) {
      checks.redis = "error";
    }
  } else {
    checks.redis = "disabled";
  }

  const ok = Object.values(checks).every((value) => value === "ok" || value === "disabled");
  return NextResponse.json({ status: ok ? "ok" : "degraded", checks }, { status: ok ? 200 : 503 });
}
