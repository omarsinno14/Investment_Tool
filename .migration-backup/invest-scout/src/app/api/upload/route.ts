import { NextResponse } from "next/server";
import path from "path";
import { MAX_IMAGE_SIZE_BYTES } from "@/lib/uploads";
import { uploadBuffer } from "@/lib/storage";
import { requireSessionUser } from "@/lib/auth-server";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: Request) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Only admins can upload forum images" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file");
  const folder = String(formData.get("folder") ?? "general").replace(/[^a-zA-Z0-9/_-]/g, "");
  if (!(file instanceof File)) return NextResponse.json({ error: "File missing" }, { status: 400 });
  if (!ALLOWED.has(file.type)) return NextResponse.json({ error: "Only jpeg/png/webp allowed" }, { status: 400 });
  if (file.size > MAX_IMAGE_SIZE_BYTES) return NextResponse.json({ error: "File too large" }, { status: 400 });

  const ext = path.extname(file.name) || `.${file.type.split("/")[1] || "png"}`;
  const key = `${folder}/${user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const uploaded = await uploadBuffer(key, Buffer.from(await file.arrayBuffer()), file.type);
  return NextResponse.json({ url: uploaded.url });
}
