import { NextResponse } from "next/server";
import { getMetrics } from "@/lib/metrics";

export async function GET() {
  const body = await getMetrics();
  return new NextResponse(body, {
    status: 200,
    headers: { "Content-Type": "text/plain; version=0.0.4" },
  });
}
