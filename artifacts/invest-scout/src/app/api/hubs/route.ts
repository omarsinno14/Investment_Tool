import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";
import { randomBytes } from "crypto";

const HUB_NAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9 _.-]{1,48}[a-zA-Z0-9]$/;

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function GET(req: Request) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const q = new URL(req.url).searchParams.get("q")?.trim();
    const where = q
      ? {
          name: { contains: q, mode: "insensitive" as const },
          OR: [{ isPrivate: false }, { memberships: { some: { userId } } }],
        }
      : {
          OR: [{ isPrivate: false }, { memberships: { some: { userId } } }],
        };

    const hubs = await prisma.hub.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        memberships: { select: { userId: true, role: true } },
        _count: { select: { memberships: true, posts: true } },
      },
      take: 40,
    });

    return NextResponse.json({
      hubs: hubs.map((hub) => ({
        ...hub,
        isMember: hub.memberships.some((m) => m.userId === userId),
      })),
    });
  } catch (e) {
    console.error("Failed to load hubs", e);
    return NextResponse.json({ error: "Failed to load hubs" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const actor = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (actor?.role !== "ADMIN") return NextResponse.json({ error: "Only admins can create/manage forums" }, { status: 403 });

    const body = await req.json().catch(() => null);
    const name = String(body?.name ?? "").trim();
    const description = String(body?.description ?? "").trim();
    const isPrivate = Boolean(body?.isPrivate);
    if (!name || !HUB_NAME_REGEX.test(name)) {
      return NextResponse.json({ error: "Hub name must be 3-50 chars and cannot start/end with spaces." }, { status: 400 });
    }

    const slugBase = slugify(String(body?.slug || name));
    if (!slugBase) return NextResponse.json({ error: "Invalid hub slug" }, { status: 400 });

    const existingName = await prisma.hub.findFirst({ where: { name: { equals: name, mode: "insensitive" } }, select: { id: true } });
    if (existingName) return NextResponse.json({ error: "Hub name already used" }, { status: 409 });

    const existingSlug = await prisma.hub.findUnique({ where: { slug: slugBase }, select: { id: true } });
    const slug = existingSlug ? `${slugBase}-${Math.random().toString(36).slice(2, 6)}` : slugBase;

    const hub = await prisma.hub.create({
      data: {
        name,
        slug,
        description: description || null,
        isPrivate,
        ownerUserId: userId,
        inviteToken: isPrivate ? randomBytes(12).toString("hex") : null,
        memberships: { create: { userId, role: "owner" } },
      },
    });

    return NextResponse.json({ hub });
  } catch (e) {
    console.error("Failed to create hub", e);
    return NextResponse.json({ error: "Failed to create hub" }, { status: 500 });
  }
}
