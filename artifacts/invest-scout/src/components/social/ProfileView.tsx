import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import {
  Award,
  BadgeCheck,
  Ban,
  Briefcase,
  ChevronDown,
  FileText,
  Flag,
  Globe,
  Lock,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  PenSquare,
  Plus,
  Settings,
  Share2,
  Sparkles,
  ThumbsUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { resolveBadge } from "@/lib/badges";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import { RichText } from "./RichText";
import { UserAvatar, displayName, profileHref, type SocialUser } from "./UserAvatar";

type Person = NonNullable<SocialUser> & { id: string };

export type ProfilePayload = {
  user: {
    id: string;
    email?: string | null;
    createdAt?: string;
    profile?: {
      name?: string | null;
      username?: string | null;
      imageUrl?: string | null;
      coverPhotoUrl?: string | null;
      websiteUrl?: string | null;
      cvUrl?: string | null;
      bio?: string | null;
      occupation?: string | null;
      city?: string | null;
      country?: string | null;
      age?: number | null;
      identityVerified?: boolean;
      expertiseTags?: string[];
      verifiedExpertiseTags?: string[];
      reputation?: number | null;
    } | null;
    interests?: { type: string; value: string }[];
  };
  isSelf?: boolean;
  isFollowing?: boolean;
  isFollowedBy?: boolean;
  followRequestStatus?: string | null;
  isBlocked?: boolean;
  isBlockedBy?: boolean;
  followerCount?: number | null;
  followingCount?: number | null;
  postsHidden?: boolean;
  opportunities?: any[];
  forumPosts?: any[];
  mutualFollowers?: Person[];
  badges?: string[];
};

type Tab = "deals" | "threads" | "about";

export function useProfile(identifier: string | null) {
  const [data, setData] = useState<ProfilePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!identifier) return;
    const res = await fetch(`/api/users/${encodeURIComponent(identifier)}`, { credentials: "include" }).catch(() => null);
    if (res?.status === 401) {
      window.location.href = "/login";
      return;
    }
    const body = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      setError(body?.error ?? "This profile isn't available");
      return;
    }
    setError(null);
    setData(body);
  }

  useEffect(() => {
    setData(null);
    setError(null);
    load();
  }, [identifier]);

  return { data, setData, error, reload: load };
}

export function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="overflow-hidden rounded-2xl border bg-card">
        <Skeleton className="h-32 rounded-none sm:h-44" />
        <div className="space-y-3 px-5 pb-6">
          <Skeleton className="-mt-12 h-24 w-24 rounded-full border-4 border-card" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
      </div>
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  );
}

export function ProfileView({ data, onChange }: { data: ProfilePayload; onChange: () => void }) {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("deals");
  const [follow, setFollow] = useState({
    following: Boolean(data.isFollowing),
    requested: data.followRequestStatus === "PENDING",
    followers: data.followerCount,
  });
  const [listOpen, setListOpen] = useState<null | "followers" | "following">(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");

  useEffect(() => {
    setFollow({ following: Boolean(data.isFollowing), requested: data.followRequestStatus === "PENDING", followers: data.followerCount });
  }, [data]);

  const { user } = data;
  const p = user.profile ?? {};
  const isSelf = Boolean(data.isSelf);
  const blocked = Boolean(data.isBlocked || data.isBlockedBy);
  const deals = data.opportunities ?? [];
  const threads = data.forumPosts ?? [];
  const interests = user.interests ?? [];
  const expertise = p.expertiseTags ?? [];
  const verifiedExpertise = new Set(p.verifiedExpertiseTags ?? []);
  const location = [...new Set([p.city, p.country].filter(Boolean))].join(", ");
  const name = p.name || displayName(user);
  const handle = p.username;

  async function toggleFollow() {
    const prev = follow;
    const wasActive = follow.following || follow.requested;
    setFollow({
      following: false,
      requested: !wasActive,
      followers: prev.followers != null && prev.following ? prev.followers - 1 : prev.followers,
    });
    const res = await fetch("/api/user/follow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ userId: user.id }),
    }).catch(() => null);
    const body = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      setFollow(prev);
      toast.error(body?.error ?? "Couldn't update follow");
      return;
    }
    const nowFollowing = Boolean(body.following);
    setFollow({
      following: nowFollowing,
      requested: body.followRequestStatus === "PENDING",
      followers:
        prev.followers == null ? null : prev.followers + (nowFollowing && !prev.following ? 1 : !nowFollowing && prev.following ? -1 : 0),
    });
  }

  async function toggleBlock() {
    if (!window.confirm(data.isBlocked ? `Unblock ${displayName(user)}?` : `Block ${displayName(user)}? They won't be able to follow or message you.`)) return;
    const res = await fetch("/api/user/block", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ userId: user.id }),
    }).catch(() => null);
    if (!res?.ok) {
      toast.error("Couldn't update block");
      return;
    }
    onChange();
  }

  async function submitReport() {
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ targetType: "USER", targetId: user.id, reason: reportReason }),
    }).catch(() => null);
    if (!res?.ok) {
      toast.error("Couldn't submit report");
      return;
    }
    toast.success("Thanks. Our team will review this profile.");
    setReportOpen(false);
    setReportReason("");
  }

  async function share() {
    const url = `${window.location.origin}/users/${handle || user.id}`;
    if (navigator.share) await navigator.share({ title: name, url }).catch(() => undefined);
    else {
      await navigator.clipboard.writeText(url).catch(() => undefined);
      toast.success("Profile link copied");
    }
  }

  const stats: { label: string; value: number | null | undefined; onClick?: () => void }[] = [
    { label: deals.length === 1 ? "deal" : "deals", value: data.postsHidden ? null : deals.length, onClick: () => setTab("deals") },
    { label: threads.length === 1 ? "thread" : "threads", value: data.postsHidden ? null : threads.length, onClick: () => setTab("threads") },
    { label: follow.followers === 1 ? "follower" : "followers", value: follow.followers, onClick: () => setListOpen("followers") },
    { label: "following", value: data.followingCount, onClick: () => setListOpen("following") },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {blocked && (
        <div className="flex items-center gap-2 rounded-2xl border bg-card px-4 py-3 text-sm text-muted-foreground">
          <Ban className="h-4 w-4" />
          {data.isBlockedBy ? "This profile isn't available to you." : "You've blocked this member. Unblock them to interact again."}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="relative h-32 sm:h-44">
          {p.coverPhotoUrl ? (
            <img src={p.coverPhotoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/25 via-accent/15 to-secondary" aria-hidden />
          )}
        </div>

        <div className="px-4 pb-5 sm:px-6">
          <div className="flex items-end justify-between gap-3">
            <UserAvatar user={user} size="xl" className="-mt-12 h-24 w-24 border-4 border-card text-2xl sm:-mt-14 sm:h-28 sm:w-28" />
            <div className="hidden items-center gap-2 pt-3 sm:flex">
              <ProfileActions
                isSelf={isSelf}
                blocked={blocked}
                isBlocked={Boolean(data.isBlocked)}
                follow={follow}
                followsYou={Boolean(data.isFollowedBy)}
                messageHref={`/messages?partner=${encodeURIComponent(handle || user.id)}`}
                onFollow={toggleFollow}
                onShare={share}
                onBlock={toggleBlock}
                onReport={() => setReportOpen(true)}
              />
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <div>
              <h1 className="flex items-center gap-1.5 text-xl font-semibold tracking-tight sm:text-2xl">
                <span className="truncate">{name}</span>
                {p.identityVerified && (
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <BadgeCheck className="h-5 w-5 shrink-0 fill-primary text-primary-foreground" aria-label="Verified identity" />
                      </TooltipTrigger>
                      <TooltipContent>Identity verified by Vertica</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </h1>
              <div className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                {handle && <span>@{handle}</span>}
                {data.isFollowedBy && !isSelf && <span className="rounded-md bg-secondary px-1.5 py-0.5 text-xs font-medium">Follows you</span>}
              </div>
            </div>

            {(p.occupation || location) && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {p.occupation && (
                  <span className="inline-flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4" /> {p.occupation}
                  </span>
                )}
                {location && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" /> {location}
                  </span>
                )}
              </div>
            )}

            {p.bio && <RichText text={p.bio} className="block max-w-2xl text-[15px] leading-relaxed" />}

            {p.websiteUrl && (
              <a href={p.websiteUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                <Globe className="h-4 w-4" />
                {p.websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            )}

            <div className="flex flex-wrap gap-x-5 gap-y-1 pt-1 text-sm">
              {stats.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={s.value == null ? undefined : s.onClick}
                  disabled={s.value == null}
                  className="text-muted-foreground transition hover:text-foreground disabled:cursor-default disabled:hover:text-muted-foreground"
                >
                  {s.value == null ? (
                    <Lock className="mr-1 inline h-3.5 w-3.5" />
                  ) : (
                    <span className="font-semibold tabular-nums text-foreground">{s.value}</span>
                  )}{" "}
                  {s.label}
                </button>
              ))}
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Award className="h-4 w-4 text-accent" />
                <span className="font-semibold tabular-nums text-foreground">{p.reputation ?? 0}</span> reputation
              </span>
            </div>

            {(data.mutualFollowers?.length ?? 0) > 0 && <MutualLine people={data.mutualFollowers!} />}

            {(data.badges?.length ?? 0) > 0 && (
              <TooltipProvider delayDuration={150}>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {data.badges!.map((key) => {
                    const badge = resolveBadge(key);
                    return (
                      <Tooltip key={key}>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium">
                            <Award className="h-3 w-3 text-accent" /> {badge.label}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{badge.description}</TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </TooltipProvider>
            )}
          </div>

          <div className="mt-4 flex gap-2 sm:hidden">
            <ProfileActions
              isSelf={isSelf}
              blocked={blocked}
              isBlocked={Boolean(data.isBlocked)}
              follow={follow}
              followsYou={Boolean(data.isFollowedBy)}
              messageHref={`/messages?partner=${encodeURIComponent(handle || user.id)}`}
              onFollow={toggleFollow}
              onShare={share}
              onBlock={toggleBlock}
              onReport={() => setReportOpen(true)}
              stretch
            />
          </div>
        </div>

        <nav className="flex border-t">
          {([
            { key: "deals", label: "Deals" },
            { key: "threads", label: "Threads" },
            { key: "about", label: "About" },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "-mt-px flex-1 border-t-2 py-3 text-sm font-semibold transition sm:flex-none sm:px-8",
                tab === key ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </nav>
      </section>

      {tab === "deals" &&
        (data.postsHidden ? (
          <PrivateNotice />
        ) : deals.length === 0 ? (
          <Empty
            icon={Sparkles}
            title={isSelf ? "Share your first deal" : "No deals yet"}
            body={isSelf ? "Deals you bring to the room show up here." : `${displayName(user)} hasn't shared a deal yet.`}
            action={isSelf ? <Button size="sm" onClick={() => navigate("/opportunities")}><Plus className="h-4 w-4" /> Bring a deal</Button> : undefined}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {deals.map((deal) => (
              <DealTile key={deal.id} deal={deal} />
            ))}
          </div>
        ))}

      {tab === "threads" &&
        (data.postsHidden ? (
          <PrivateNotice />
        ) : threads.length === 0 ? (
          <Empty
            icon={MessageCircle}
            title={isSelf ? "Start a conversation" : "No threads yet"}
            body={isSelf ? "Threads you start in the community appear here." : `${displayName(user)} hasn't started a thread yet.`}
            action={isSelf ? <Button size="sm" onClick={() => navigate("/forums")}><PenSquare className="h-4 w-4" /> New thread</Button> : undefined}
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border bg-card">
            {threads.map((t) => (
              <Link key={t.id} href={`/forums/${t.id}`} className="block border-b px-4 py-3.5 transition last:border-b-0 hover:bg-muted/40 sm:px-5">
                <div className="text-xs text-muted-foreground">{timeAgo(t.createdAt)}</div>
                <div className="mt-0.5 font-semibold leading-snug">{t.title}</div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.body}</p>
                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5" /> {t._count?.reactions ?? 0}</span>
                  <span className="inline-flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> {t._count?.comments ?? 0}</span>
                </div>
              </Link>
            ))}
          </div>
        ))}

      {tab === "about" && (
        <div className="grid gap-3 md:grid-cols-2">
          <AboutCard
            title="Interests"
            action={isSelf ? { label: "Edit", href: "/interests" } : undefined}
            empty={isSelf ? "Add interests to personalize your deals and news." : "No interests shared."}
          >
            {interests.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {interests.map((i) => (
                  <span key={`${i.type}-${i.value}`} className="rounded-full bg-secondary px-3 py-1 text-sm">
                    {i.value}
                  </span>
                ))}
              </div>
            )}
          </AboutCard>
          <AboutCard title="Expertise" action={isSelf ? { label: "Edit", href: "/settings" } : undefined} empty="No expertise listed.">
            {expertise.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {expertise.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm">
                    {verifiedExpertise.has(tag) && <BadgeCheck className="h-3.5 w-3.5 text-primary" aria-label="Verified" />}
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </AboutCard>
          <AboutCard title="Details" empty="Nothing else shared.">
            {(p.age != null || p.cvUrl || user.createdAt || (isSelf && user.email)) && (
              <dl className="space-y-2 text-sm">
                {user.createdAt && (
                  <Row label="Member since">{new Date(user.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</Row>
                )}
                {p.age != null && <Row label="Age">{p.age}</Row>}
                {isSelf && user.email && <Row label="Email (only you)">{user.email}</Row>}
                {p.cvUrl && (
                  <Row label="CV">
                    <a href={p.cvUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                      <FileText className="h-4 w-4" /> View CV
                    </a>
                  </Row>
                )}
              </dl>
            )}
          </AboutCard>
        </div>
      )}

      <FollowListDialog identifier={handle || user.id} list={listOpen} onClose={() => setListOpen(null)} />

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report {displayName(user)}</DialogTitle>
          </DialogHeader>
          <Textarea value={reportReason} onChange={(e) => setReportReason(e.target.value)} placeholder="What seems wrong with this profile?" rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>Cancel</Button>
            <Button onClick={submitReport} disabled={!reportReason.trim()}>Submit report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProfileActions({
  isSelf,
  blocked,
  isBlocked,
  follow,
  followsYou,
  messageHref,
  onFollow,
  onShare,
  onBlock,
  onReport,
  stretch = false,
}: {
  isSelf: boolean;
  blocked: boolean;
  isBlocked: boolean;
  follow: { following: boolean; requested: boolean };
  followsYou: boolean;
  messageHref: string;
  onFollow: () => void;
  onShare: () => void;
  onBlock: () => void;
  onReport: () => void;
  stretch?: boolean;
}) {
  const grow = stretch ? "flex-1" : undefined;
  if (isSelf) {
    return (
      <>
        <Button variant="secondary" className={grow} asChild>
          <Link href="/settings"><Settings className="h-4 w-4" /> Edit profile</Link>
        </Button>
        <Button variant="secondary" className={grow} onClick={onShare}>
          <Share2 className="h-4 w-4" /> Share
        </Button>
      </>
    );
  }
  return (
    <>
      {follow.following ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" className={grow} disabled={blocked}>
              Following <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onFollow}>Unfollow</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : follow.requested ? (
        <Button variant="secondary" className={grow} onClick={onFollow} disabled={blocked}>Requested</Button>
      ) : (
        <Button className={grow} onClick={onFollow} disabled={blocked}>{followsYou ? "Follow back" : "Follow"}</Button>
      )}
      <Button variant="secondary" className={grow} asChild disabled={blocked}>
        <Link href={messageHref} aria-disabled={blocked} className={cn(blocked && "pointer-events-none opacity-50")}>
          <MessageCircle className="h-4 w-4" /> Message
        </Link>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon" aria-label="More options">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onShare}><Share2 className="mr-2 h-4 w-4" /> Share profile</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onBlock}><Ban className="mr-2 h-4 w-4" /> {isBlocked ? "Unblock" : "Block"}</DropdownMenuItem>
          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onReport}><Flag className="mr-2 h-4 w-4" /> Report</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

function MutualLine({ people }: { people: Person[] }) {
  const names = people.slice(0, 2).map((m) => displayName(m));
  const rest = people.length - names.length;
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <div className="flex -space-x-2">
        {people.slice(0, 3).map((m) => (
          <UserAvatar key={m.id} user={m} size="xs" className="border-2 border-card" />
        ))}
      </div>
      <span>
        Followed by <span className="font-medium text-foreground">{names.join(", ")}</span>
        {rest > 0 ? ` and ${rest} other${rest === 1 ? "" : "s"} you follow` : ""}
      </span>
    </div>
  );
}

function DealTile({ deal }: { deal: any }) {
  const image = deal.imageUrls?.[0];
  return (
    <Link href={`/opportunities/${deal.id}`} className="group overflow-hidden rounded-2xl border bg-card transition hover:border-primary/30">
      <div className="aspect-[16/9] bg-secondary">
        {image ? (
          <img src={image} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
        ) : (
          <div className="flex h-full items-center justify-center"><Sparkles className="h-6 w-6 text-muted-foreground" /></div>
        )}
      </div>
      <div className="space-y-1 p-4">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{(deal.categories ?? [])[0] ?? "Opportunity"}</div>
        <div className="line-clamp-2 font-semibold leading-snug group-hover:text-primary">{deal.title}</div>
        {deal.locationName && (
          <div className="inline-flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {deal.locationName}</div>
        )}
      </div>
    </Link>
  );
}

function AboutCard({ title, action, empty, children }: { title: string; action?: { label: string; href: string }; empty: string; children?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action && <Link href={action.href} className="text-sm font-medium text-primary hover:underline">{action.label}</Link>}
      </div>
      {children || <p className="text-sm text-muted-foreground">{empty}</p>}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

function Empty({ icon: Icon, title, body, action }: { icon: typeof Sparkles; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-foreground/70"><Icon className="h-6 w-6" /></div>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </div>
      {action}
    </div>
  );
}

function PrivateNotice() {
  return <Empty icon={Lock} title="Posts are private" body="Follow this member to see their deals and threads." />;
}

function FollowListDialog({ identifier, list, onClose }: { identifier: string; list: null | "followers" | "following"; onClose: () => void }) {
  const [users, setUsers] = useState<(Person & { isFollowing?: boolean; isSelf?: boolean })[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!list) return;
    setUsers(null);
    setError(null);
    fetch(`/api/users/${encodeURIComponent(identifier)}/${list}`, { credentials: "include" })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body?.error ?? "Couldn't load list");
        setUsers(body.users ?? []);
      })
      .catch((e) => setError(e.message));
  }, [identifier, list]);

  return (
    <Dialog open={list !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="gap-0 p-0 sm:max-w-md">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="text-center text-base">{list === "followers" ? "Followers" : "Following"}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] min-h-[160px] overflow-y-auto py-2">
          {error ? (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">{error}</p>
          ) : users === null ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-2">
                <Skeleton className="h-11 w-11 rounded-full" />
                <Skeleton className="h-3.5 w-32" />
              </div>
            ))
          ) : users.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">No one here yet.</p>
          ) : (
            users.map((u) => (
              <Link key={u.id} href={profileHref(u)} onClick={onClose} className="flex items-center gap-3 px-5 py-2 transition hover:bg-muted/60">
                <UserAvatar user={u} size="md" className="h-11 w-11" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{displayName(u)}</div>
                  <div className="truncate text-xs text-muted-foreground">{(u.profile as any)?.occupation || u.profile?.name || ""}</div>
                </div>
                {u.isSelf ? <span className="text-xs text-muted-foreground">You</span> : u.isFollowing ? <span className="text-xs text-muted-foreground">Following</span> : null}
              </Link>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
