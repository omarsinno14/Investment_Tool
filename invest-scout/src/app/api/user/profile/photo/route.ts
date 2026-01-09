import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";

const ALLOWED_PREFIX = "image/";

function getExtension(name: string, type: string) {
  const ext = path.extname(name).replace(".", "").toLowerCase();
  if (ext) return ext;
  const fallback = type.split("/")[1]?.toLowerCase() ?? "png";
  return fallback;
}

export async function POST(req: Request) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File missing" }, { status: 400 });
    }
    if (!file.type.startsWith(ALLOWED_PREFIX)) {
      return NextResponse.json({ error: "Only image uploads are allowed" }, { status: 400 });
    }

    const ext = getExtension(file.name, file.type);
    const filename = `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads", "profile");
    await fs.mkdir(dir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(dir, filename), buffer);

    const imageUrl = `/uploads/profile/${filename}`;
    await prisma.profile.upsert({
      where: { userId },
      create: { userId, imageUrl },
      update: { imageUrl },
    });

    return NextResponse.json({ imageUrl });
  } catch (e) {
    console.error("Failed to upload profile photo", e);
    return NextResponse.json({ error: "Failed to upload profile photo" }, { status: 500 });
  }
}
