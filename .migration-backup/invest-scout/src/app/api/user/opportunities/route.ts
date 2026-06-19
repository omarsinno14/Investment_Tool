import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";
import { sanitizeProfanity } from "@/lib/profanity";

function toNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  if (!value.trim()) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return "";
  return value.trim();
}

export async function POST(req: Request) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const actor = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (actor?.role !== "ADMIN") return NextResponse.json({ error: "Only admins can post opportunities" }, { status: 403 });

    const formData = await req.formData();
    const title = sanitizeProfanity(toString(formData.get("title")));
    const summary = sanitizeProfanity(toString(formData.get("summary")));
    const details = sanitizeProfanity(toString(formData.get("details")));
    const benefits = sanitizeProfanity(toString(formData.get("benefits")));
    const askAmount = toNumber(formData.get("askAmount"));
    const askCurrency = toString(formData.get("askCurrency")) || "USD";
    const expectedRoiPercent = toNumber(formData.get("expectedRoiPercent"));
    const expectedRoiDurationMonths = toNumber(formData.get("expectedRoiDurationMonths"));
    const locationName = toString(formData.get("locationName"));
    const locationMapUrl = toString(formData.get("locationMapUrl"));
    const contactEmail = sanitizeProfanity(toString(formData.get("contactEmail")));
    const contactPhone = sanitizeProfanity(toString(formData.get("contactPhone")));
    const contactUsername = sanitizeProfanity(toString(formData.get("contactUsername")));
    const tagString = toString(formData.get("tags"));

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const tags = tagString
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const uploadDir = path.join(process.cwd(), "public", "uploads", "opportunities", userId);
    await fs.mkdir(uploadDir, { recursive: true });
    const imageUrls: string[] = [];

    const files = formData.getAll("images");
    for (const entry of files) {
      if (!(entry instanceof File)) continue;
      if (!entry.type.startsWith("image/")) {
        return NextResponse.json({ error: "Only image uploads are allowed" }, { status: 400 });
      }
      const ext = path.extname(entry.name).replace(".", "") || entry.type.split("/")[1] || "jpg";
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const buffer = Buffer.from(await entry.arrayBuffer());
      await fs.writeFile(path.join(uploadDir, filename), buffer);
      imageUrls.push(`/uploads/opportunities/${userId}/${filename}`);
    }

    const opportunity = await prisma.opportunity.create({
      data: {
        title,
        summary: summary || details || null,
        details: details || null,
        benefits: benefits || null,
        askAmount: askAmount ?? null,
        askCurrency,
        expectedRoiPercent,
        expectedRoiDurationMonths: expectedRoiDurationMonths ? Math.round(expectedRoiDurationMonths) : null,
        locationName: locationName || null,
        locationMapUrl: locationMapUrl || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        contactUsername: contactUsername || null,
        tags,
        imageUrl: imageUrls[0] ?? null,
        imageUrls,
        source: "Community post",
        createdByUserId: userId,
        publishedAt: new Date(),
        keywords: tags.slice(0, 10),
      },
    });

    return NextResponse.json({ opportunity });
  } catch (e) {
    console.error("Failed to create opportunity", e);
    return NextResponse.json({ error: "Failed to create opportunity" }, { status: 500 });
  }
}
