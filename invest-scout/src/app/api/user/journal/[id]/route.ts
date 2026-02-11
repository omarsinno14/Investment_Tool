import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";
import { hashPassword, verifyPassword } from "@/lib/password";
type Ctx = { params: { id: string } };

async function loadEntry(prisma: any, entryId: string, userId: string) {
  return prisma.journalEntry.findFirst({
    where: {
      id: entryId,
      OR: [{ ownerId: userId }, { collaborators: { some: { userId } } }],
    },
    include: {
      collaborators: { include: { user: { select: { id: true, email: true, profile: { select: { name: true, username: true } } } } } },
    },
  });
}

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = params.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const entry = await loadEntry(prisma, id, userId);
    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (entry.passwordHash && entry.ownerId !== userId) {
      const password = req.headers.get("x-entry-password") ?? "";
      const ok = password ? await verifyPassword(password, entry.passwordHash) : false;
      if (!ok) {
        return NextResponse.json({ error: "Password required" }, { status: 403 });
      }
    }

    return NextResponse.json({
      entry: {
        id: entry.id,
        title: entry.title,
        body: entry.body,
        entryDate: entry.entryDate,
        imageUrls: entry.imageUrls,
        chartData: entry.chartData,
        isOwner: entry.ownerId === userId,
        isLocked: Boolean(entry.passwordHash),
        collaborators: entry.collaborators.map((c: any) => ({
          id: c.user.id,
          email: c.user.email,
          profile: c.user.profile,
        })),
      },
    });
  } catch (e) {
    console.error("Failed to load journal entry", e);
    return NextResponse.json({ error: "Failed to load journal entry" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = params.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const entry = await loadEntry(prisma, id, userId);
    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const updates: any = {};
    if (body.title !== undefined) updates.title = String(body.title).trim() || null;
    if (body.body !== undefined) updates.body = String(body.body);
    if (body.entryDate !== undefined) updates.entryDate = new Date(body.entryDate);
    if (body.imageUrls !== undefined) updates.imageUrls = Array.isArray(body.imageUrls) ? body.imageUrls : [];
    if (body.chartData !== undefined) updates.chartData = body.chartData;

    if (body.password !== undefined && entry.ownerId === userId) {
      updates.passwordHash = body.password ? await hashPassword(String(body.password)) : null;
    }

    const updated = await prisma.journalEntry.update({
      where: { id: entry.id },
      data: updates,
    });

    return NextResponse.json({ entry: updated });
  } catch (e) {
    console.error("Failed to update journal entry", e);
    return NextResponse.json({ error: "Failed to update journal entry" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = params.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const entry = await prisma.journalEntry.findUnique({ where: { id } });
    if (!entry || entry.ownerId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.journalEntry.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Failed to delete journal entry", e);
    return NextResponse.json({ error: "Failed to delete journal entry" }, { status: 500 });
  }
}
