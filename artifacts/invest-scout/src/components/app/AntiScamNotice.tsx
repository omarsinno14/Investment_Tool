import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function AntiScamNotice({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground",
        className,
      )}
      role="note"
    >
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
      <p className="leading-relaxed">
        <span className="font-medium text-foreground">Stay safe.</span> Vertica never asks members to
        send funds to other members or into specific deals, and we never move or hold investment money.
        Anyone requesting an off-platform transfer, wire, or crypto payment to participate in an
        opportunity should be treated as a scam. Report it immediately and do not send anything.
      </p>
    </div>
  );
}
