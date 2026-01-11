import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";
import type { Opportunity, OpportunityAction } from "@prisma/client";
import { buildMatchContext, getMatchScore, shouldIncludeOpportunity } from "@/lib/match-score";

type OpportunityWithUser = Opportunity & {
  createdByUser?: {
    id: string;
    email: string;
    profile?: { name?: string | null; username?: string | null; imageUrl?: string | null } | null;
  } | null;
};

export async function GET(req: Request) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    }

    const userId = await requireUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const where =
      type === "headlines"
        ? { createdByUserId: null }
        : type === "community"
          ? { createdByUserId: { not: null } }
          : undefined;

    const interests = await prisma.interest.findMany({
      where: { userId },
      select: { value: true, type: true },
    });

    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { investAmount: true },
    });

    const money = await prisma.moneyManagement.findUnique({
      where: { userId },
      select: { locationCountry: true, locationRegion: true },
    });

    const context = buildMatchContext({
      interests,
      userCountry: money?.locationCountry ?? null,
      userRegion: money?.locationRegion ?? null,
      investAmount: profile?.investAmount ?? null,
    });

    const recent: OpportunityWithUser[] = await prisma.opportunity.findMany({
      where: where ? { ...where, archivedAt: null } : { archivedAt: null },
      orderBy: { fetchedAt: "desc" },
      take: 400,
      include: {
        createdByUser: {
          select: {
            id: true,
            email: true,
            profile: { select: { name: true, username: true, imageUrl: true } },
          },
        },
      },
    });

    const matched: OpportunityWithUser[] =
      type === "headlines"
        ? recent.filter((o) => shouldIncludeOpportunity(o, context)).slice(0, 200)
        : recent.filter((o) => shouldIncludeOpportunity(o, context)).slice(0, 200);

    const ids: string[] = matched.map((m: Opportunity) => m.id);

    const actions: OpportunityAction[] = await prisma.opportunityAction.findMany({
      where: { userId, opportunityId: { in: ids } },
    });

    const map = new Map<string, OpportunityAction>(
      actions.map((a: OpportunityAction) => [a.opportunityId, a])
    );

    const opportunities = matched.map((o: OpportunityWithUser) => ({
      ...o,
      action: map.get(o.id) ?? null,
      matchScore: getMatchScore(o, context),
    }));

    const now = Date.now();
    const sorted = opportunities.slice().sort((a: any, b: any) => {
      const aBoosted = a.boostedUntil ? new Date(a.boostedUntil).getTime() > now : false;
      const bBoosted = b.boostedUntil ? new Date(b.boostedUntil).getTime() > now : false;
      if (aBoosted !== bBoosted) return aBoosted ? -1 : 1;
      const scoreDiff = (b.matchScore ?? 0) - (a.matchScore ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      return new Date(b.fetchedAt ?? 0).getTime() - new Date(a.fetchedAt ?? 0).getTime();
    });

    return NextResponse.json({ opportunities: sorted });
  } catch (e) {
    console.error("Failed to fetch opportunities", e);
    return NextResponse.json({ error: "Failed to fetch opportunities" }, { status: 500 });
  }
}
