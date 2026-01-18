"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type UserProfile = {
  id: string;
  email: string;
  profile?: {
    name?: string | null;
    username?: string | null;
    imageUrl?: string | null;
    coverPhotoUrl?: string | null;
    websiteUrl?: string | null;
    bio?: string | null;
    occupation?: string | null;
    age?: number | null;
    phone?: string | null;
    emailVerified?: boolean;
    phoneVerified?: boolean;
    identityVerified?: boolean;
    expertiseTags?: string[];
    verifiedExpertiseTags?: string[];
    requiresFollowApproval?: boolean | null;
  } | null;
  interests?: { type: string; value: string }[];
};

type MutualFollower = {
  id: string;
  email: string;
  profile?: {
    name?: string | null;
    username?: string | null;
    imageUrl?: string | null;
  } | null;
};

export default function UserProfilePage() {
  const params = useParams<{ id: string }>();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [opps, setOpps] = useState<any[]>([]);
  const [forums, setForums] = useState<any[]>([]);
  const [following, setFollowing] = useState(false);
  const [followedBy, setFollowedBy] = useState(false);
  const [followRequestStatus, setFollowRequestStatus] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlockedBy, setIsBlockedBy] = useState(false);
  const [counts, setCounts] = useState<{ followers: number | null; following: number | null }>({
    followers: 0,
    following: 0,
  });
  const [mutuals, setMutuals] = useState<MutualFollower[]>([]);

  async function load() {
    try {
      const res = await fetch(`/api/users/${params.id}`, { credentials: "include" });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to load profile");
      }
      setUser(data.user);
      setOpps(data.opportunities ?? []);
      setForums(data.forumPosts ?? []);
      setFollowing(Boolean(data.isFollowing));
      setFollowedBy(Boolean(data.isFollowedBy));
      setFollowRequestStatus(data.followRequestStatus ?? null);
      setCounts({
        followers: data.followerCount ?? null,
        following: data.followingCount ?? null,
      });
      setMutuals(data.mutualFollowers ?? []);
      setIsBlocked(Boolean(data.isBlocked));
      setIsBlockedBy(Boolean(data.isBlockedBy));
    } catch (e) {
      console.error(e);
      toast.error("Failed to load profile");
    }
  }

  async function toggleFollow() {
    if (isBlocked || isBlockedBy) return;
    const previous = {
      following,
      followedBy,
      followRequestStatus,
    };
    if (following || followRequestStatus === "PENDING") {
      setFollowing(false);
      setFollowRequestStatus(null);
    } else {
      setFollowing(false);
      setFollowRequestStatus("PENDING");
    }
    try {
      const res = await fetch("/api/user/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: user?.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed");
      setFollowing(Boolean(data.following));
      setFollowRequestStatus(data.followRequestStatus ?? null);
      if (typeof data.isFollowedBy === "boolean") {
        setFollowedBy(data.isFollowedBy);
      }
      await load();
    } catch (e) {
      console.error(e);
      toast.error("Unable to update follow");
      setFollowing(previous.following);
      setFollowedBy(previous.followedBy);
      setFollowRequestStatus(previous.followRequestStatus);
    }
  }

  async function submitReport() {
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          targetType: "USER",
          targetId: user?.id,
          reason: reportReason,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to report");
      toast.success("Report submitted");
      setReportOpen(false);
      setReportReason("");
    } catch (e) {
      console.error(e);
      toast.error("Failed to submit report");
    }
  }

  async function toggleBlock() {
    if (!user) return;
    if (!window.confirm(isBlocked ? "Unblock this user?" : "Block this user?")) return;
    const previous = {
      isBlocked,
      following,
      followedBy,
      followRequestStatus,
    };
    const nextBlocked = !isBlocked;
    setIsBlocked(nextBlocked);
    if (nextBlocked) {
      setFollowing(false);
      setFollowedBy(false);
      setFollowRequestStatus(null);
    }
    try {
      const res = await fetch("/api/user/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to update block");
      setIsBlocked(Boolean(data.blocked));
      setFollowing(false);
      setFollowedBy(false);
      setFollowRequestStatus(null);
      await load();
    } catch (e) {
      console.error(e);
      toast.error("Failed to update block");
      setIsBlocked(previous.isBlocked);
      setFollowing(previous.following);
      setFollowedBy(previous.followedBy);
      setFollowRequestStatus(previous.followRequestStatus);
    }
  }

  useEffect(() => {
    load();
  }, [params.id]);

  if (!user) return <div>Loading...</div>;

  const displayName = user.profile?.username || user.profile?.name || user.email || "User";
  const isVerified = Boolean(user.profile?.emailVerified && user.profile?.phoneVerified);
  const isIdentityVerified = Boolean(user.profile?.identityVerified);
  const identifier = user.profile?.username || user.email;
  const expertiseTags = user.profile?.expertiseTags ?? [];
  const verifiedExpertiseTags = new Set(user.profile?.verifiedExpertiseTags ?? []);
  const mutualPreview = mutuals.slice(0, 3);
  const mutualOverflow = mutuals.length - mutualPreview.length;

  return (
    <div className="space-y-6">
      {(isBlocked || isBlockedBy) && (
        <Card>
          <CardContent className="py-4 text-sm text-muted-foreground">
            {isBlockedBy
              ? "You cannot view this profile because the user has blocked you."
              : "You have blocked this profile. Unblock to interact again."}
          </CardContent>
        </Card>
      )}
      <Card className="overflow-hidden">
        {user.profile?.coverPhotoUrl && (
          <div className="h-36 w-full overflow-hidden border-b bg-muted/30">
            <img src={user.profile.coverPhotoUrl} alt="Cover" className="h-full w-full object-cover" />
          </div>
        )}
        <CardContent className="py-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={user.profile?.imageUrl || undefined} alt={displayName} />
              <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold">{displayName}</h1>
                {isIdentityVerified && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> Verified ID
                  </Badge>
                )}
                {isVerified && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <BadgeCheck className="h-3 w-3" /> Verified contact
                  </Badge>
                )}
              </div>
              {user.profile?.occupation && (
                <div className="text-sm text-muted-foreground">{user.profile.occupation}</div>
              )}
              {user.profile?.bio && (
                <div className="text-sm text-muted-foreground">{user.profile.bio}</div>
              )}
              {counts.followers != null && counts.following != null && (
                <div className="text-xs text-muted-foreground mt-1">
                  {counts.followers} followers • {counts.following} following
                </div>
              )}
              {mutuals.length > 0 && (
                <Dialog>
                  <DialogTrigger asChild>
                    <button type="button" className="mt-2 text-xs text-muted-foreground hover:underline">
                      Mutual followers:{" "}
                      {mutualPreview.map((mutual) => {
                        const name =
                          mutual.profile?.username || mutual.profile?.name || mutual.email || "User";
                        return name;
                      }).join(", ")}
                      {mutualOverflow > 0 ? ` +${mutualOverflow} more` : ""}
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Mutual followers</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      {mutuals.map((mutual) => {
                        const name =
                          mutual.profile?.username || mutual.profile?.name || mutual.email || "User";
                        return (
                          <Link
                            key={mutual.id}
                            href={`/users/${mutual.id}`}
                            className="flex items-center gap-3 rounded-md border p-3 hover:bg-muted"
                          >
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={mutual.profile?.imageUrl || undefined} alt={name} />
                              <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{name}</div>
                              <div className="text-xs text-muted-foreground">
                                {mutual.profile?.username ? `@${mutual.profile.username}` : mutual.email}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={toggleFollow}
              variant={following ? "outline" : "default"}
              disabled={isBlocked || isBlockedBy}
            >
              {following ? "Following" : followRequestStatus === "PENDING" ? "Requested" : "Follow"}
            </Button>
            <Button asChild variant="outline" disabled={!identifier || !followedBy || isBlocked || isBlockedBy}>
              <a href={`/messages?partner=${encodeURIComponent(identifier || "")}`}>Message</a>
            </Button>
            <Button variant="outline" onClick={toggleBlock}>
              {isBlocked ? "Unblock" : "Block"}
            </Button>
            <Dialog open={reportOpen} onOpenChange={setReportOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">Report scam</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Report this profile</DialogTitle>
                </DialogHeader>
                <Textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Tell us why this profile seems suspicious..."
                  rows={4}
                />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setReportOpen(false)}>Cancel</Button>
                  <Button onClick={submitReport} disabled={!reportReason.trim()}>
                    Submit report
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Interests</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-sm">
            {(user.interests ?? []).length === 0 && (
              <div className="text-muted-foreground">No interests shared yet.</div>
            )}
            {(user.interests ?? []).map((interest) => (
              <Badge key={`${interest.type}-${interest.value}`} variant="outline">
                {interest.value}
              </Badge>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            {user.email && <div>Email: {user.email}</div>}
            {user.profile?.phone && <div>Phone: {user.profile.phone}</div>}
            {user.profile?.age != null && <div>Age: {user.profile.age}</div>}
            {user.profile?.websiteUrl && (
              <div>
                Website:{" "}
                <a
                  className="text-primary underline"
                  href={user.profile.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {user.profile.websiteUrl}
                </a>
              </div>
            )}
            {!user.email && !user.profile?.phone && user.profile?.age == null && (
              <div>Contact details are private.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expertise</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          {expertiseTags.length === 0 && <div className="text-muted-foreground">No expertise tags yet.</div>}
          {expertiseTags.map((tag) => (
            <Badge key={tag} variant={verifiedExpertiseTags.has(tag) ? "default" : "outline"}>
              {tag}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Opportunity posts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {opps.length === 0 && <div className="text-muted-foreground">No posts yet.</div>}
          {opps.map((opp) => (
            <div key={opp.id} className="border rounded-md p-3">
              <div className="font-medium">{opp.title}</div>
              <div className="text-muted-foreground">{opp.summary ?? opp.details ?? "—"}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Forum history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {forums.length === 0 && <div className="text-muted-foreground">No forum posts yet.</div>}
          {forums.map((post) => (
            <div key={post.id} className="border rounded-md p-3">
              <div className="font-medium">{post.title}</div>
              <div className="text-muted-foreground">{post.body}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
