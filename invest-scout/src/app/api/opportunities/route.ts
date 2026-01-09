import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";
import type { Interest, Opportunity, OpportunityAction } from "@prisma/client";

type OpportunityWithUser = Opportunity & {
  createdByUser?: {
    id: string;
    email: string;
    profile?: { name?: string | null; username?: string | null; imageUrl?: string | null } | null;
  } | null;
};

function norm(s: string) {
  return s.toLowerCase();
}

export async function GET() {
  try {
    const prisma = getPrismaClient();
    if (!prisma) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    }

    const userId = await requireUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const interests: Pick<Interest, "value">[] = await prisma.interest.findMany({
      where: { userId },
      select: { value: true },
    });

    const terms: string[] = interests
      .map((i: Pick<Interest, "value">) => i.value.trim())
      .filter(Boolean)
      .map(norm);

    const recent: OpportunityWithUser[] = await prisma.opportunity.findMany({
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
      terms.length === 0
        ? recent.slice(0, 120)
        : recent
            .filter((o: OpportunityWithUser) => {
              const hay = norm(
                `${o.title ?? ""} ${o.summary ?? ""} ${o.details ?? ""} ${(o.tags ?? []).join(" ")}`
              );
              return terms.some((t: string) => t.length >= 2 && hay.includes(t));
            })
            .slice(0, 200);

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
    }));

    return NextResponse.json({ opportunities });
  } catch (e) {
    console.error("Failed to fetch opportunities", e);
    return NextResponse.json({ error: "Failed to fetch opportunities" }, { status: 500 });
  }
}
