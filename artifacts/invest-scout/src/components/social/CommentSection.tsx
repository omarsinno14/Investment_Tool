import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { MessageCircle, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { fullDate, timeAgo } from "@/lib/time";
import { RichText } from "./RichText";
import { UserAvatar, displayName, profileHref, type SocialUser } from "./UserAvatar";

export type CommentItem = {
  id: string;
  body: string;
  createdAt: string;
  parentId?: string | null;
  user?: SocialUser & { id?: string };
  userId?: string;
};

type Props = {
  comments: CommentItem[];
  viewer?: SocialUser;
  viewerId?: string | null;
  /** Resolve true on success so the composer clears. */
  onSubmit: (body: string, parentId?: string | null) => Promise<boolean>;
  onDelete?: (comment: CommentItem) => Promise<void> | void;
  canDelete?: (comment: CommentItem) => boolean;
  /** True when the backend stores real reply threads (parentId). Otherwise replies are @mentions. */
  threaded?: boolean;
  title?: string;
  emptyText?: string;
  placeholder?: string;
  disabled?: boolean;
  disabledReason?: string;
};

const COLLAPSE_AFTER = 3;

export function CommentSection({
  comments,
  viewer,
  viewerId,
  onSubmit,
  onDelete,
  canDelete,
  threaded = false,
  title = "Comments",
  emptyText = "No comments yet. Start the conversation.",
  placeholder = "Add a comment...",
  disabled = false,
  disabledReason,
}: Props) {
  const [sort, setSort] = useState<"top" | "new">("top");
  const [replyTo, setReplyTo] = useState<CommentItem | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  const { roots, repliesByParent } = useMemo(() => {
    const byParent = new Map<string, CommentItem[]>();
    const top: CommentItem[] = [];
    for (const c of comments) {
      if (threaded && c.parentId) {
        const list = byParent.get(c.parentId) ?? [];
        list.push(c);
        byParent.set(c.parentId, list);
      } else {
        top.push(c);
      }
    }
    for (const list of byParent.values()) list.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    const sorted = [...top].sort((a, b) => {
      if (sort === "new") return +new Date(b.createdAt) - +new Date(a.createdAt);
      // "Top": most-replied first, then oldest, so the conversation reads naturally.
      const diff = (byParent.get(b.id)?.length ?? 0) - (byParent.get(a.id)?.length ?? 0);
      return diff !== 0 ? diff : +new Date(a.createdAt) - +new Date(b.createdAt);
    });
    return { roots: sorted, repliesByParent: byParent };
  }, [comments, sort, threaded]);

  function startReply(comment: CommentItem) {
    setReplyTo(comment);
    requestAnimationFrame(() => composerRef.current?.focus());
  }

  return (
    <section className="rounded-2xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3 sm:px-5">
        <h2 className="text-sm font-semibold">
          {title} <span className="font-normal text-muted-foreground">{comments.length}</span>
        </h2>
        {comments.length > 1 && (
          <div className="inline-flex rounded-full bg-muted p-0.5 text-xs">
            {(["top", "new"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setSort(key)}
                className={cn(
                  "rounded-full px-3 py-1 transition",
                  sort === key ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {key === "top" ? "Top" : "Newest"}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-4 sm:px-5">
        <CommentComposer
          ref={composerRef}
          viewer={viewer}
          placeholder={placeholder}
          disabled={disabled}
          disabledReason={disabledReason}
          replyTo={replyTo}
          threaded={threaded}
          onCancelReply={() => setReplyTo(null)}
          onSubmit={async (body) => {
            const ok = await onSubmit(body, threaded ? replyTo?.id ?? null : null);
            if (ok) setReplyTo(null);
            return ok;
          }}
        />
      </div>

      {roots.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 pb-10 pt-4 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
            <MessageCircle className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        </div>
      ) : (
        <ul className="space-y-1 px-2 pb-4 sm:px-3">
          {roots.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              replies={repliesByParent.get(comment.id) ?? []}
              viewerId={viewerId}
              onReply={disabled ? undefined : startReply}
              onDelete={onDelete}
              canDelete={canDelete}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function CommentThread({
  comment,
  replies,
  viewerId,
  onReply,
  onDelete,
  canDelete,
}: {
  comment: CommentItem;
  replies: CommentItem[];
  viewerId?: string | null;
  onReply?: (c: CommentItem) => void;
  onDelete?: (c: CommentItem) => Promise<void> | void;
  canDelete?: (c: CommentItem) => boolean;
}) {
  const [expanded, setExpanded] = useState(replies.length <= COLLAPSE_AFTER);
  const visible = expanded ? replies : replies.slice(0, 1);
  return (
    <li>
      <CommentRow comment={comment} viewerId={viewerId} onReply={onReply} onDelete={onDelete} canDelete={canDelete} />
      {replies.length > 0 && (
        <div className="ml-[22px] border-l-2 border-border pl-4 sm:ml-[26px]">
          <ul className="space-y-1">
            {visible.map((reply) => (
              <li key={reply.id}>
                <CommentRow comment={reply} viewerId={viewerId} onReply={onReply ? () => onReply(comment) : undefined} onDelete={onDelete} canDelete={canDelete} compact />
              </li>
            ))}
          </ul>
          {!expanded && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="mb-2 ml-2 mt-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              View {replies.length - 1} more {replies.length - 1 === 1 ? "reply" : "replies"}
            </button>
          )}
        </div>
      )}
    </li>
  );
}

function CommentRow({
  comment,
  viewerId,
  onReply,
  onDelete,
  canDelete,
  compact = false,
}: {
  comment: CommentItem;
  viewerId?: string | null;
  onReply?: (c: CommentItem) => void;
  onDelete?: (c: CommentItem) => Promise<void> | void;
  canDelete?: (c: CommentItem) => boolean;
  compact?: boolean;
}) {
  const authorId = comment.user?.id ?? comment.userId;
  const isMine = Boolean(viewerId && authorId === viewerId);
  const deletable = onDelete && (canDelete ? canDelete(comment) : isMine);
  return (
    <div className="group flex gap-3 rounded-xl px-2 py-2.5 transition hover:bg-muted/40">
      <Link href={profileHref(comment.user)} className="shrink-0">
        <UserAvatar user={comment.user} size={compact ? "xs" : "sm"} className={compact ? "mt-0.5" : undefined} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <Link href={profileHref(comment.user)} className="truncate text-sm font-semibold hover:underline">
            {displayName(comment.user)}
          </Link>
          {isMine && <span className="rounded-full bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">You</span>}
          <time className="shrink-0 text-xs text-muted-foreground" title={fullDate(comment.createdAt)}>
            {timeAgo(comment.createdAt)}
          </time>
        </div>
        <RichText text={comment.body} className="mt-0.5 block text-sm leading-relaxed text-foreground/90" />
        <div className="mt-1 flex items-center gap-3 text-xs font-medium text-muted-foreground">
          {onReply && (
            <button type="button" onClick={() => onReply(comment)} className="hover:text-foreground">
              Reply
            </button>
          )}
        </div>
      </div>
      {deletable && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Comment options"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-100 transition hover:bg-muted md:opacity-0 md:group-hover:opacity-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete?.(comment)}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

type ComposerProps = {
  viewer?: SocialUser;
  placeholder: string;
  disabled?: boolean;
  disabledReason?: string;
  replyTo: CommentItem | null;
  threaded: boolean;
  onCancelReply: () => void;
  onSubmit: (body: string) => Promise<boolean>;
};

export const CommentComposer = forwardRef<HTMLTextAreaElement, ComposerProps>(function CommentComposer(
  { viewer, placeholder, disabled, disabledReason, replyTo, threaded, onCancelReply, onSubmit },
  ref
) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const localRef = useRef<HTMLTextAreaElement | null>(null);

  // Non-threaded backends: a reply is an @mention at the start of the comment.
  useEffect(() => {
    if (!replyTo || threaded) return;
    const handle = replyTo.user?.profile?.username;
    if (handle && !value.startsWith(`@${handle}`)) setValue(`@${handle} ${value}`.trimEnd() + " ");
  }, [replyTo]);

  useEffect(() => {
    const el = localRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  async function submit() {
    const body = value.trim();
    if (!body || busy) return;
    setBusy(true);
    try {
      if (await onSubmit(body)) setValue("");
    } finally {
      setBusy(false);
    }
  }

  if (disabled) {
    return <div className="rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">{disabledReason ?? "Commenting is unavailable."}</div>;
  }

  return (
    <div className="flex items-start gap-3">
      <UserAvatar user={viewer} size="sm" className="mt-1" />
      <div className="min-w-0 flex-1">
        {replyTo && (
          <div className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              Replying to <span className="font-medium text-foreground">{displayName(replyTo.user)}</span>
            </span>
            <button type="button" onClick={onCancelReply} className="font-medium hover:text-foreground">
              Cancel
            </button>
          </div>
        )}
        <div className="flex items-end gap-2 rounded-2xl border bg-background px-3 py-1.5 transition focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10">
          <textarea
            ref={(el) => {
              localRef.current = el;
              if (typeof ref === "function") ref(el);
              else if (ref) ref.current = el;
            }}
            rows={1}
            value={value}
            maxLength={4000}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
              if (e.key === "Escape" && replyTo) onCancelReply();
            }}
            placeholder={placeholder}
            className="max-h-[200px] min-h-[32px] flex-1 resize-none bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={submit}
            disabled={!value.trim() || busy}
            className="h-8 shrink-0 px-2 font-semibold text-primary hover:bg-transparent hover:text-primary/80 disabled:text-muted-foreground"
          >
            {busy ? "Posting" : "Post"}
          </Button>
        </div>
      </div>
    </div>
  );
});
