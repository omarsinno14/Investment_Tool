import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";

function toNumber(value: any) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toString(value: any) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export async function PATCH(req: Request, { params }: { params: { id?: string } }) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = params.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const opportunity = await prisma.opportunity.findUnique({ where: { id } });
    if (!opportunity) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (opportunity.createdByUserId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const title = toString(body.title);
    if (body.title !== undefined && !title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const tags =
      Array.isArray(body.tags)
        ? body.tags.map((t: string) => String(t).trim()).filter(Boolean)
        : toString(body.tags)
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);

    const archived =
      typeof body.archived === "boolean" ? body.archived : undefined;
    const repost = body.repost === true;
    const boost = body.boost;

    const boostBudget = boost && typeof boost.budget === "number" ? boost.budget : null;
    const boostDays = boost && typeof boost.days === "number" ? boost.days : null;
    const boostCurrency = boost && typeof boost.currency === "string" ? boost.currency : null;

    if (boost && (!boostBudget || !boostDays)) {
      return NextResponse.json({ error: "Boost budget and duration are required" }, { status: 400 });
    }

    const updated = await prisma.opportunity.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title } : {}),
        ...(body.summary !== undefined ? { summary: toString(body.summary) || null } : {}),
        ...(body.details !== undefined ? { details: toString(body.details) || null } : {}),
        ...(body.benefits !== undefined ? { benefits: toString(body.benefits) || null } : {}),
        ...(body.askAmount !== undefined ? { askAmount: toNumber(body.askAmount) } : {}),
        ...(body.askCurrency !== undefined
          ? { askCurrency: toString(body.askCurrency) || "USD" }
          : {}),
        ...(body.expectedRoiPercent !== undefined ? { expectedRoiPercent: toNumber(body.expectedRoiPercent) } : {}),
        ...(body.expectedRoiDurationMonths !== undefined
          ? {
              expectedRoiDurationMonths: toNumber(body.expectedRoiDurationMonths)
                ? Math.round(Number(body.expectedRoiDurationMonths))
                : null,
            }
          : {}),
        ...(body.locationName !== undefined ? { locationName: toString(body.locationName) || null } : {}),
        ...(body.locationMapUrl !== undefined ? { locationMapUrl: toString(body.locationMapUrl) || null } : {}),
        ...(body.contactEmail !== undefined ? { contactEmail: toString(body.contactEmail) || null } : {}),
        ...(body.contactPhone !== undefined ? { contactPhone: toString(body.contactPhone) || null } : {}),
        ...(body.contactUsername !== undefined ? { contactUsername: toString(body.contactUsername) || null } : {}),
        ...(body.tags !== undefined ? { tags } : {}),
        ...(archived !== undefined ? { archivedAt: archived ? new Date() : null } : {}),
        ...(repost ? { publishedAt: new Date(), archivedAt: null } : {}),
        ...(boost
          ? {
              boostedAt: new Date(),
              boostedUntil: new Date(Date.now() + Math.max(1, boostDays ?? 1) * 24 * 60 * 60 * 1000),
              boostedBudget: boostBudget,
              boostedCurrency: boostCurrency || "USD",
            }
          : {}),
      },
    });

    return NextResponse.json({ opportunity: updated });
  } catch (e) {
    console.error("Failed to update opportunity", e);
    return NextResponse.json({ error: "Failed to update opportunity" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id?: string } }) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = params.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const opportunity = await prisma.opportunity.findUnique({ where: { id } });
    if (!opportunity) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (opportunity.createdByUserId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.opportunity.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Failed to delete opportunity", e);
    return NextResponse.json({ error: "Failed to delete opportunity" }, { status: 500 });
  }
}
