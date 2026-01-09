import { NextResponse } from "next/server";

import { requireUserId } from "@/lib/auth-server";
import { getPrismaClient } from "@/lib/db";
import type { OpportunityAction } from "@prisma/client";

export async function GET(
  _req: Request,
  { params }: { params: { id?: string } }
) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    }

    const userId = await requireUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
      include: {
        createdByUser: {
          select: {
            id: true,
            email: true,
            profile: { select: { name: true, username: true, imageUrl: true, phone: true } },
          },
        },
      },
    });
    if (!opportunity) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const action = await prisma.opportunityAction.findUnique({
      where: { userId_opportunityId: { userId, opportunityId: id } },
    });

    const related = await prisma.opportunity.findMany({
      where: {
        id: { not: id },
        OR: [
          opportunity.source ? { source: opportunity.source } : undefined,
          opportunity.keywords.length
            ? { keywords: { hasSome: opportunity.keywords.slice(0, 5) } }
            : undefined,
          opportunity.tags?.length
            ? { tags: { hasSome: opportunity.tags.slice(0, 5) } }
            : undefined,
        ].filter(Boolean) as any,
      },
      orderBy: { fetchedAt: "desc" },
      take: 6,
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

    const relatedActions: OpportunityAction[] = related.length
      ? await prisma.opportunityAction.findMany({
          where: { userId, opportunityId: { in: related.map((r) => r.id) } },
        })
      : [];

    const relatedActionMap = new Map<string, OpportunityAction>(
      relatedActions.map((a) => [a.opportunityId, a])
    );

    return NextResponse.json({
      opportunity: { ...opportunity, action: action ?? null },
      related: related.map((r) => ({
        ...r,
        action: relatedActionMap.get(r.id) ?? null,
      })),
    });
  } catch (e) {
    console.error("Failed to fetch opportunity", e);
    return NextResponse.json({ error: "Failed to fetch opportunity" }, { status: 500 });
  }
}
