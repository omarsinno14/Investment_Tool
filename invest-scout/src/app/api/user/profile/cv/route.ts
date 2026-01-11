import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function getExtension(name: string, type: string) {
  const ext = path.extname(name).replace(".", "").toLowerCase();
  if (ext) return ext;
  if (type === "application/pdf") return "pdf";
  if (type === "application/msword") return "doc";
  if (type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  return "pdf";
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

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Only PDF or Word documents are allowed" }, { status: 400 });
    }

    const ext = getExtension(file.name, file.type);
    const filename = `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads", "cv");
    await fs.mkdir(dir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(dir, filename), buffer);

    const cvUrl = `/uploads/cv/${filename}`;
    await prisma.profile.upsert({
      where: { userId },
      create: { userId, cvUrl },
      update: { cvUrl },
    });

    return NextResponse.json({ cvUrl });
  } catch (e) {
    console.error("Failed to upload CV", e);
    return NextResponse.json({ error: "Failed to upload CV" }, { status: 500 });
  }
}
