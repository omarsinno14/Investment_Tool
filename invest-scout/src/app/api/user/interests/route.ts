import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";
import { InterestType } from "@prisma/client";
import { cityToCountry, REAL_ESTATE_ASSET_CLASSES, REAL_ESTATE_COUNTRIES, REAL_ESTATE_REITS, REAL_ESTATE_STRATEGIES, REAL_ESTATE_SUBTOPICS } from "@/lib/real-estate";

const allowed = {
  ASSET_CLASS: new Set(REAL_ESTATE_ASSET_CLASSES),
  STRATEGY: new Set(REAL_ESTATE_STRATEGIES),
  REIT: new Set(REAL_ESTATE_REITS),
  COUNTRY: new Set(REAL_ESTATE_COUNTRIES),
  SUBTOPIC: new Set(REAL_ESTATE_SUBTOPICS),
};

export async function GET() {
  const prisma = getPrismaClient();
  if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const interests = await prisma.interest.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, select: { type: true, value: true, parent: true } });
  return NextResponse.json({ interests });
}

function isInterestType(value: unknown): value is InterestType {
  return typeof value === "string" && Object.values(InterestType).includes(value as InterestType);
}

export async function POST(req: Request) {
  const prisma = getPrismaClient();
  if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const interests = Array.isArray(body?.interests) ? body.interests : null;
  if (!interests) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const deduped: { type: InterestType; value: string; parent: string | null }[] = [];
  const seen = new Set<string>();

  for (const i of interests) {
    const typeRaw = String(i?.type ?? "").toUpperCase();
    if (!isInterestType(typeRaw)) continue;
    const type = typeRaw as InterestType;
    const value = String(i?.value ?? "").trim();
    if (!value) continue;

    if (type === "CITY") {
      const country = cityToCountry(value);
      if (!country) continue;
      const cityKey = `${type}:${value.toLowerCase()}`;
      if (!seen.has(cityKey)) {
        deduped.push({ type: "CITY", value, parent: country });
        seen.add(cityKey);
      }
      const countryKey = `COUNTRY:${country.toLowerCase()}`;
      if (!seen.has(countryKey)) {
        deduped.push({ type: "COUNTRY", value: country, parent: null });
        seen.add(countryKey);
      }
      continue;
    }

    if (type !== "CUSTOM" && type !== "COUNTRY" && !(allowed as any)[type]?.has(value)) continue;
    if (type === "COUNTRY" && !allowed.COUNTRY.has(value)) continue;

    const key = `${type}:${value.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push({ type, value: value.slice(0, 120), parent: i?.parent ? String(i.parent).slice(0, 120) : null });
  }

  await prisma.$transaction([
    prisma.interest.deleteMany({ where: { userId } }),
    ...(deduped.length ? [prisma.interest.createMany({ data: deduped.map((i) => ({ ...i, userId })) })] : []),
  ]);

  return NextResponse.json({ ok: true, interests: deduped });
}
