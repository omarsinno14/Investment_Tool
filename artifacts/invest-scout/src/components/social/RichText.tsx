import { Fragment } from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

const TOKEN = /(@[a-zA-Z0-9._]{3,30}|https?:\/\/[^\s]+)/g;

/** Renders user text with line breaks preserved, @mentions linked to profiles and URLs linked out. */
export function RichText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(TOKEN);
  return (
    <span className={cn("whitespace-pre-wrap break-words", className)}>
      {parts.map((part, i) => {
        if (!part) return null;
        if (part.startsWith("@") && /^@[a-zA-Z0-9._]{3,30}$/.test(part)) {
          return (
            <Link key={i} href={`/users/${part.slice(1)}`} className="font-medium text-primary hover:underline">
              {part}
            </Link>
          );
        }
        if (/^https?:\/\//.test(part)) {
          return (
            <a key={i} href={part} target="_blank" rel="noreferrer noopener" className="text-primary underline-offset-2 hover:underline">
              {part}
            </a>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </span>
  );
}
