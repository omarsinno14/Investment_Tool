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

export function resolveBadge(key: string): BadgeDefinition {
  return BADGE_MAP[key] ?? { key, label: key, description: "" };
}
