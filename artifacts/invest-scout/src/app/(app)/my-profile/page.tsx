import { useEffect, useState } from "react";
import { ProfileSkeleton, ProfileView, useProfile } from "@/components/social/ProfileView";
import { fetchProfile } from "@/lib/profile-cache";

/** Your own profile, rendered exactly as other members see it, with owner actions. */
export default function MyProfilePage() {
  const [identifier, setIdentifier] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile()
      .then((res) => {
        if (res.status === 401) window.location.href = "/login";
        else if (res.ok) setIdentifier(res.data?.profile?.username || res.data?.profile?.userId || null);
      })
      .catch(() => undefined);
  }, []);

  const { data, reload } = useProfile(identifier);
  if (!data) return <ProfileSkeleton />;
  return <ProfileView data={data} onChange={reload} />;
}
