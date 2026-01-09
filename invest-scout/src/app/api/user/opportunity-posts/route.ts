import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { requireUserId } from "@/lib/auth-server";

function normalize(value: string) {
  return value.toLowerCase().trim();
}

export async function GET() {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const interests = await prisma.interest.findMany({
      where: { userId },
      select: { value: true },
    });
    const terms = interests.map((i) => normalize(i.value)).filter(Boolean);

    const posts = await prisma.opportunityPost.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        user: { select: { email: true, profile: { select: { username: true } } } },
      },
    });

    const matched = terms.length
      ? posts.filter((post) => {
          const hay = normalize(
            `${post.title} ${post.description} ${post.benefits ?? ""} ${post.tags.join(" ")}`
          );
          return terms.some((t) => t.length >= 2 && hay.includes(t));
        })
      : posts;

    return NextResponse.json({ posts: matched });
  } catch (e) {
    console.error("Failed to load opportunity posts", e);
    return NextResponse.json({ error: "Failed to load opportunity posts" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const userId = await requireUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();
    const tags = Array.isArray(body.tags) ? body.tags.map((t) => String(t).trim()).filter(Boolean) : [];

    if (!title || !description) {
      return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
    }

    const images = Array.isArray(body.images)
      ? body.images.map((img) => String(img).trim()).filter(Boolean).slice(0, 6)
      : [];

    const post = await prisma.opportunityPost.create({
      data: {
        userId,
        title,
        description,
        askAmount: typeof body.askAmount === "number" ? body.askAmount : null,
        benefits: body.benefits ? String(body.benefits) : null,
        tags,
        images,
        locationName: body.locationName ? String(body.locationName) : null,
        mapUrl: body.mapUrl ? String(body.mapUrl) : null,
        contactEmail: body.contactEmail ? String(body.contactEmail) : null,
        contactPhone: body.contactPhone ? String(body.contactPhone) : null,
        contactUsername: body.contactUsername ? String(body.contactUsername) : null,
      },
      include: {
        user: { select: { email: true, profile: { select: { username: true } } } },
      },
    });

    return NextResponse.json({ post });
  } catch (e) {
    console.error("Failed to create opportunity post", e);
    return NextResponse.json({ error: "Failed to create opportunity post" }, { status: 500 });
  }
}
