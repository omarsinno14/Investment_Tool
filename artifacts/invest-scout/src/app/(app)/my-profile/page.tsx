

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { BadgeCheck, PlusCircle, ShieldCheck, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Profile = {
  name?: string | null;
  username?: string | null;
  imageUrl?: string | null;
  coverPhotoUrl?: string | null;
  websiteUrl?: string | null;
  bio?: string | null;
  occupation?: string | null;
  phone?: string | null;
  age?: number | null;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  identityVerified?: boolean;
  cvUrl?: string | null;
  expertiseTags?: string[];
  verifiedExpertiseTags?: string[];
};

type OverviewResponse = {
  user: {
    id: string;
    email: string;
    profile?: Profile | null;
    interests?: { value: string }[];
  };
  opportunities: any[];
  forumPosts: any[];
  publicPreview: boolean;
};

export default function MyProfilePage() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(false);

  async function load(nextPreview = preview) {
    setLoading(true);
    try {
      const res = await fetch(`/api/user/overview?view=${nextPreview ? "public" : "private"}`, {
        credentials: "include",
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Failed to load profile");
      setData(body as OverviewResponse);
    } catch (e) {
      console.error(e);
      toast.error("Unable to load profile");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview]);

  const profile = data?.user.profile ?? {};
  const displayName = profile.username || profile.name || data?.user.email || "Me";
  const initials = displayName.slice(0, 2).toUpperCase();
  const isVerified = Boolean(profile.emailVerified && profile.phoneVerified);

  const expertise = useMemo(() => {
    const tags = profile.expertiseTags ?? [];
    const verified = new Set(profile.verifiedExpertiseTags ?? []);
    return tags.map((tag) => ({ tag, verified: verified.has(tag) }));
  }, [profile.expertiseTags, profile.verifiedExpertiseTags]);

  if (loading) return <div>Loading...</div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My profile</h1>
          <p className="text-muted-foreground">
            Preview what others see on your profile and review your public posts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline"><Link href="/forums"><PlusCircle className="mr-2 h-4 w-4" />New forum discussion</Link></Button>
          <Button asChild variant="outline"><Link href="/opportunities"><PlusCircle className="mr-2 h-4 w-4" />New opportunity</Link></Button>
          <Button variant="outline" onClick={() => setPreview((prev) => !prev)}>
            {preview ? "Switch to full view" : "Preview as non-follower"}
          </Button>
          <Button asChild variant="ghost" size="icon" className="md:hidden">
            <Link href="/settings" aria-label="Open settings">
              <Settings className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        {profile.coverPhotoUrl && (
          <div className="h-36 w-full overflow-hidden border-b bg-muted/30">
            <img src={profile.coverPhotoUrl} alt="Cover" className="h-full w-full object-cover" />
          </div>
        )}
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile.imageUrl ?? undefined} alt={displayName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>{displayName}</CardTitle>
              {profile.identityVerified ? (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Verified ID
                </Badge>
              ) : null}
              {isVerified ? (
                <Badge variant="outline" className="flex items-center gap-1">
                  <BadgeCheck className="h-3 w-3" /> Verified contact
                </Badge>
              ) : null}
            </div>
            <div className="text-sm text-muted-foreground">{profile.occupation ?? ""}</div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {profile.bio && <p className="text-sm text-muted-foreground">{profile.bio}</p>}
          <div className="grid gap-2 text-sm">
            {profile.phone && <div>Phone: {profile.phone}</div>}
            {!profile.username && data.user.email && <div>Email: {data.user.email}</div>}
            {profile.age != null && <div>Age: {profile.age}</div>}
            {profile.websiteUrl && (
              <div>
                Website:{" "}
                <a className="text-primary underline" href={profile.websiteUrl} target="_blank" rel="noreferrer">
                  {profile.websiteUrl}
                </a>
              </div>
            )}
          </div>
          {profile.cvUrl && (
            <Button variant="outline" asChild>
              <a href={profile.cvUrl} target="_blank" rel="noreferrer">
                Download CV
              </a>
            </Button>
          )}
          <div className="flex flex-wrap gap-2">
            {(data.user.interests ?? []).map((interest) => (
              <Badge key={interest.value} variant="secondary">
                {interest.value}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {expertise.map((item) => (
              <Badge key={item.tag} variant={item.verified ? "default" : "outline"}>
                {item.tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="opportunities" className="space-y-4">
        <TabsList>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          <TabsTrigger value="forums">Forum posts</TabsTrigger>
          <TabsTrigger value="manage">Manage posts</TabsTrigger>
        </TabsList>

        <TabsContent value="opportunities">
          {data.opportunities.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No active opportunity posts.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-2">
              {data.opportunities.map((opp) => (
                <Card key={opp.id} className="hover:shadow-sm transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-base">
                      <Link href={`/opportunities/${opp.id}`} className="hover:underline">
                        {opp.title}
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {opp.summary ?? opp.details ?? "—"}
                    {opp._count?.views != null && (
                      <div className="text-xs text-muted-foreground mt-2">
                        Views: {opp._count.views}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="forums">
          {data.forumPosts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No forum posts to display.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-2">
              {data.forumPosts.map((post) => (
                <Card key={post.id} className="hover:shadow-sm transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-base">
                      <Link href={`/forums/${post.id}`} className="hover:underline">
                        {post.title}
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {post.body}
                    {post._count?.views != null && (
                      <div className="text-xs text-muted-foreground mt-2">
                        Views: {post._count.views}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="manage">
          <Card>
            <CardHeader><CardTitle className="text-base">Manage all your posts</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="text-muted-foreground">Edit/delete options are available in each item context page.</div>
              <Link href="/forums" className="block rounded-md border p-2 hover:bg-muted">Manage forum discussions</Link>
              <Link href="/opportunities" className="block rounded-md border p-2 hover:bg-muted">Manage opportunities</Link>
              <Link href="/hubs" className="block rounded-md border p-2 hover:bg-muted">Manage hub threads</Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
