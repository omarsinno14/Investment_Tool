import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type ShareButtonProps = {
  title?: string;
  text?: string;
  url?: string;
  label?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
};

/**
 * Shares the given content via the Web Share API when available, falling back
 * to copying the link to the clipboard.
 */
export function ShareButton({
  title,
  text,
  url,
  label = "Share",
  variant = "outline",
  size = "sm",
  className,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const shareUrl = url ?? (typeof window !== "undefined" ? window.location.href : "");
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, text, url: shareUrl });
        return;
      }
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        toast.success("Link copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
        return;
      }
      toast.error("Sharing is not supported on this device");
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      toast.error("Unable to share");
    }
  }

  return (
    <Button type="button" variant={variant} size={size} className={className} onClick={handleShare}>
      {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      {label ? <span className="ml-1.5">{label}</span> : null}
    </Button>
  );
}
