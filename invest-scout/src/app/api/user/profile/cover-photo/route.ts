import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";

export async function POST(req: Request) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || !file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Upload a valid image" }, { status: 400 });
    }

    const dir = path.join(process.cwd(), "public", "uploads", "profile");
    await fs.mkdir(dir, { recursive: true });
    const ext = path.extname(file.name).replace(".", "") || file.type.split("/")[1] || "jpg";
    const filename = `cover-${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(dir, filename), buffer);

    const coverPhotoUrl = `/uploads/profile/${filename}`;
    await prisma.profile.upsert({
      where: { userId },
      create: { userId, coverPhotoUrl },
      update: { coverPhotoUrl },
    });

    return NextResponse.json({ coverPhotoUrl });
  } catch (e) {
    console.error("Failed to upload cover photo", e);
    return NextResponse.json({ error: "Failed to upload cover photo" }, { status: 500 });
  }
}
