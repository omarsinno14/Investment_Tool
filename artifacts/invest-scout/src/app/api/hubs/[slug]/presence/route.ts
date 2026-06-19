import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-server";
import { getPrismaClient } from "@/lib/db";
import { getRedisClient } from "@/lib/redis";

const TTL_SECONDS = 70;

async function getHubForPresence(slug: string, userId: string) {
  const prisma = getPrismaClient();
  if (!prisma) return { error: NextResponse.json({ error: "Database unavailable" }, { status: 500 }) };
  const hub = await prisma.hub.findUnique({
    where: { slug },
    include: { memberships: { where: { userId } }, _count: { select: { memberships: true } } },
  });
  if (!hub) return { error: NextResponse.json({ error: "Hub not found" }, { status: 404 }) };
  const isMember = hub.memberships.length > 0;
  if (hub.isPrivate && !isMember) {
    return { error: NextResponse.json({ error: "Invite required" }, { status: 403 }) };
  }
  return { hub, isMember, prisma };
}

export async function POST(_: Request, context: { params: Promise<{ slug: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { slug } = await context.params;
  const result = await getHubForPresence(slug, userId);
  if ("error" in result) return result.error;

  const redis = getRedisClient();
  const hubId = result.hub.id;
  const now = Date.now();
  const key = `hub:${hubId}:online`;

  if (redis) {
    await redis.zadd(key, now + TTL_SECONDS * 1000, userId);
    await redis.zremrangebyscore(key, 0, now);
    await redis.expire(key, TTL_SECONDS + 20);
    const onlineNow = await redis.zcount(key, now, "+inf");
    return NextResponse.json({ onlineNow, members: result.hub._count.memberships });
  }

  return NextResponse.json({ onlineNow: 0, members: result.hub._count.memberships });
}

export async function GET(_: Request, context: { params: Promise<{ slug: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { slug } = await context.params;
  const result = await getHubForPresence(slug, userId);
  if ("error" in result) return result.error;

  const redis = getRedisClient();
  const hubId = result.hub.id;
  const now = Date.now();
  const key = `hub:${hubId}:online`;
  if (redis) {
    await redis.zremrangebyscore(key, 0, now);
    const onlineNow = await redis.zcount(key, now, "+inf");
    return NextResponse.json({ onlineNow, members: result.hub._count.memberships });
  }

  return NextResponse.json({ onlineNow: 0, members: result.hub._count.memberships });
}
