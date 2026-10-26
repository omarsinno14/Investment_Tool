import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { ProfileSkeleton, ProfileView, useProfile } from "@/components/social/ProfileView";

export default function UserProfilePage() {
  const params = useParams<{ id: string }>();
  const { data, error, reload } = useProfile(params.id ?? null);

  if (error) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 rounded-2xl border bg-card px-6 py-16 text-center">
        <p className="font-semibold">{error}</p>
        <p className="text-sm text-muted-foreground">The link may be broken or the account may no longer be active.</p>
        <Button variant="outline" asChild>
          <Link href="/users">Find members</Link>
        </Button>
      </div>
    );
  }
  if (!data) return <ProfileSkeleton />;
  return <ProfileView data={data} onChange={reload} />;
}
