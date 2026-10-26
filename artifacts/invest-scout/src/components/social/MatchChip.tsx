import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shows which of the viewer's interests an item matches, e.g. "For you · Toronto, Residential". */
export function MatchChip({ matched, className }: { matched?: string[] | null; className?: string }) {
  if (!matched || matched.length === 0) return null;
  const shown = matched.slice(0, 2).join(", ");
  const extra = matched.length > 2 ? ` +${matched.length - 2}` : "";
  return (
    <span
      title={`Matches your interests: ${matched.join(", ")}`}
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary",
        className
      )}
    >
      <Sparkles className="h-3 w-3 shrink-0" />
      <span className="truncate">
        For you · {shown}
        {extra}
      </span>
    </span>
  );
}
