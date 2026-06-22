import type { PrismaClient } from "@prisma/client";

export type BadgeDefinition = {
  key: string;
  label: string;
  description: string;
};

export const BADGE_CATALOG: BadgeDefinition[] = [
  {
    key: "VERIFIED_IDENTITY",
    label: "Verified Identity",
    description: "Completed Vertica identity verification.",
  },
  {
    key: "FOUNDING_MEMBER",
    label: "Founding Member",
    description: "Among the earliest members of the Vertica circle.",
  },
  {
    key: "DEAL_MAKER",
    label: "Deal Maker",
    description: "Brought at least one deal to the room.",
  },
  {
    key: "CONNECTOR",
    label: "Connector",
    description: "Trusted by ten or more members who follow them.",
  },
  {
    key: "CONTRIBUTOR",
    label: "Contributor",
    description: "Started ten or more discussions in the forums.",
  },
  {
    key: "SCOUT",
    label: "Scout",
    description: "Saved ten or more deals while sourcing opportunities.",
  },
];

export const BADGE_MAP: Record<string, BadgeDefinition> = BADGE_CATALOG.reduce(
  (acc, badge) => {
    acc[badge.key] = badge;
    return acc;
  },
  {} as Record<string, BadgeDefinition>,
);

const FOUNDING_MEMBER_THRESHOLD = 100;

/**
 * Derives which catalog badges a user currently qualifies for, upserts the
 * corresponding UserBadge rows (best-effort), and returns the full list of the
 * user's badge keys. Never throws — returns whatever it can resolve.
 */
export async function computeAutoBadges(
  prisma: PrismaClient,
  userId: string,
): Promise<string[]> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        createdAt: true,
        profile: { select: { identityVerified: true } },
      },
    });
    if (!user) return [];

    const [followerCount, forumPostCount, dealCount, savedCount, earlierMembers] =
      await Promise.all([
        prisma.follow.count({ where: { followingId: userId } }),
        prisma.forumPost.count({ where: { userId } }),
        prisma.opportunity.count({ where: { createdByUserId: userId } }),
        prisma.opportunityAction.count({ where: { userId, state: "SAVED" } }),
        prisma.user.count({ where: { createdAt: { lt: user.createdAt } } }),
      ]);

    const qualified: string[] = [];
    if (user.profile?.identityVerified) qualified.push("VERIFIED_IDENTITY");
    if (earlierMembers < FOUNDING_MEMBER_THRESHOLD) qualified.push("FOUNDING_MEMBER");
    if (dealCount >= 1) qualified.push("DEAL_MAKER");
    if (followerCount >= 10) qualified.push("CONNECTOR");
    if (forumPostCount >= 10) qualified.push("CONTRIBUTOR");
    if (savedCount >= 10) qualified.push("SCOUT");

    if (qualified.length > 0) {
      await prisma.userBadge.createMany({
        data: qualified.map((badgeKey) => ({ userId, badgeKey })),
        skipDuplicates: true,
      });
    }

    const rows = await prisma.userBadge.findMany({
      where: { userId },
      select: { badgeKey: true },
      orderBy: { awardedAt: "asc" },
    });
    return rows.map((r) => r.badgeKey);
  } catch {
    return [];
  }
}
