import { useEffect, useState } from "react";
import { fetchProfile } from "@/lib/profile-cache";
import type { SocialUser } from "./UserAvatar";

/** The signed-in member as a SocialUser (id + public profile fields), from the shared profile cache. */
export function useViewer() {
  const [viewer, setViewer] = useState<(NonNullable<SocialUser> & { id: string }) | null>(null);
  useEffect(() => {
    let active = true;
    fetchProfile()
      .then((res) => {
        if (!active || !res.ok || !res.data?.profile) return;
        const p = res.data.profile;
        setViewer({ id: p.userId, profile: { name: p.name, username: p.username, imageUrl: p.imageUrl, identityVerified: p.identityVerified } });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  return viewer;
}
