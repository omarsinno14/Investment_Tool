import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";

export async function GET() {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.profile.findUnique({ where: { userId } });
    return NextResponse.json({ profile });
  } catch (e) {
    console.error("Failed to load profile", e);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const cleanUsername = typeof body.username === "string" ? body.username.trim() : null;
    const cleanPhone =
      typeof body.phone === "string" ? body.phone.replace(/[^\d+]/g, "").trim() : null;

    const baseData = {
      name: body.name ?? null,
      username: cleanUsername || null,
      phone: cleanPhone || null,
      bio: body.bio ?? null,
      occupation: body.occupation ?? null,
      currency: body.currency ?? null,
      age: typeof body.age === "number" ? body.age : null,
      familySituation: body.familySituation ?? null,
      netWorth: typeof body.netWorth === "number" ? body.netWorth : null,
      riskTolerance: body.riskTolerance ?? "MEDIUM",
      investAmount: typeof body.investAmount === "number" ? body.investAmount : null,
      layoutPreference: body.layoutPreference ?? null,
      identityVerified: Boolean(body.identityVerified),
      expertiseTags: Array.isArray(body.expertiseTags) ? body.expertiseTags : [],
      verifiedExpertiseTags: Array.isArray(body.verifiedExpertiseTags) ? body.verifiedExpertiseTags : [],
      hideAgeFromNonFollowers: Boolean(body.hideAgeFromNonFollowers),
      hideContactFromNonFollowers: Boolean(body.hideContactFromNonFollowers),
      hidePhotoFromNonFollowers: Boolean(body.hidePhotoFromNonFollowers),
      hidePostsFromNonFollowers: Boolean(body.hidePostsFromNonFollowers),
      hideFollowerCount: Boolean(body.hideFollowerCount),
    };

    const profile = await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        imageUrl: body.imageUrl ?? null,
        coverPhotoUrl: body.coverPhotoUrl ?? null,
        cvUrl: body.cvUrl ?? null,
        ...baseData,
      },
      update: {
        ...baseData,
        ...(body.imageUrl ? { imageUrl: body.imageUrl } : {}),
        ...(body.coverPhotoUrl ? { coverPhotoUrl: body.coverPhotoUrl } : {}),
        ...(body.cvUrl ? { cvUrl: body.cvUrl } : {}),
      },
    });

    return NextResponse.json({ profile });
  } catch (e) {
    console.error("Failed to save profile", e);
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }
}
