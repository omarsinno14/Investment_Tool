import { BadgeCheck } from "lucide-react";

/**
 * The verified tick shown next to a user's name once identity verification
 * is approved by an admin.
 */
export function VerifiedBadge({ className = "" }: { className?: string }) {
  return (
    <BadgeCheck
      className={`inline-block h-4 w-4 shrink-0 text-primary ${className}`}
      aria-label="Verified"
    />
  );
}
