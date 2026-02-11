import type { PrismaClient } from "@prisma/client";

const MENTION_REGEX = /(^|\s)@([a-zA-Z0-9._]{3,20})\b/g;

export function extractMentionUsernames(input: string) {
  const found = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = MENTION_REGEX.exec(input)) !== null) {
    found.add(match[2].toLowerCase());
  }
  return Array.from(found);
}

export function renderMentionsAsLinks(input: string) {
  return input.replace(MENTION_REGEX, (all, prefix, username) => `${prefix}<a class="text-primary underline" href="/users/${username.toLowerCase()}">@${username}</a>`);
}

export async function resolveMentionedUsers(prisma: PrismaClient, text: string) {
  const usernames = extractMentionUsernames(text);
  if (!usernames.length) return [];

  const profiles = await prisma.profile.findMany({
    where: { usernameLower: { in: usernames } },
    select: { userId: true, username: true, usernameLower: true },
  });

  const map = new Map(profiles.map((p) => [p.usernameLower, p.userId]));
  return usernames.map((u) => map.get(u)).filter(Boolean) as string[];
}
