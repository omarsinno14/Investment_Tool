import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type SocialUser = {
  id?: string;
  profile?: { name?: string | null; username?: string | null; imageUrl?: string | null; identityVerified?: boolean | null } | null;
} | null | undefined;

export function displayName(user: SocialUser, fallback = "Member") {
  return user?.profile?.username || user?.profile?.name || fallback;
}

export function profileHref(user: SocialUser) {
  const key = user?.profile?.username || user?.id;
  return key ? `/users/${key}` : "#";
}

function initials(user: SocialUser) {
  const source = user?.profile?.name || user?.profile?.username || "M";
  const parts = source.replace(/[^a-zA-Z0-9 ]/g, " ").trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "M") + (parts[1]?.[0] ?? "")).toUpperCase();
}

const SIZES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-sm",
  xl: "h-14 w-14 text-base",
} as const;

export function UserAvatar({
  user,
  size = "md",
  ring = false,
  className,
}: {
  user: SocialUser;
  size?: keyof typeof SIZES;
  /** Highlight ring, e.g. for unread or active state. */
  ring?: boolean;
  className?: string;
}) {
  return (
    <Avatar className={cn(SIZES[size], "shrink-0", ring && "ring-2 ring-primary ring-offset-2 ring-offset-background", className)}>
      <AvatarImage src={user?.profile?.imageUrl ?? undefined} alt={displayName(user)} className="object-cover" />
      <AvatarFallback className="bg-muted font-medium text-muted-foreground">{initials(user)}</AvatarFallback>
    </Avatar>
  );
}
