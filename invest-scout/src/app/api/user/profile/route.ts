import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";

export async function GET() {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, role: true, profile: true },
    });
    return NextResponse.json({ profile: user?.profile ?? null, email: user?.email ?? null, role: user?.role ?? "USER" });
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
    const usernameLower = cleanUsername ? cleanUsername.toLowerCase() : null;
    const usernameRegex = /^[a-zA-Z0-9._]{3,20}$/;

    if (cleanUsername && !usernameRegex.test(cleanUsername)) {
      return NextResponse.json(
        { error: "Username must be 3-20 characters with letters, numbers, underscores, or dots." },
        { status: 400 }
      );
    }

    if (usernameLower) {
      const existing = await prisma.profile.findFirst({
        where: { usernameLower, userId: { not: userId } },
        select: { id: true },
      });
      if (existing) {
        return NextResponse.json({ error: "Username is already taken." }, { status: 409 });
      }
    }

    const baseData = {
      name: body.name ?? null,
      username: cleanUsername || null,
      usernameLower,
      phone: cleanPhone || null,
      bio: body.bio ?? null,
      occupation: body.occupation ?? null,
      websiteUrl: body.websiteUrl ?? null,
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
      requiresFollowApproval: Boolean(body.requiresFollowApproval),
      notifyMessages: body.notifyMessages !== undefined ? Boolean(body.notifyMessages) : true,
      notifyFollows: body.notifyFollows !== undefined ? Boolean(body.notifyFollows) : true,
      notifyOpportunities: body.notifyOpportunities !== undefined ? Boolean(body.notifyOpportunities) : true,
      notifyForums: body.notifyForums !== undefined ? Boolean(body.notifyForums) : true,
      notifyJournal: body.notifyJournal !== undefined ? Boolean(body.notifyJournal) : true,
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
