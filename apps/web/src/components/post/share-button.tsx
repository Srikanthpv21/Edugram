"use client";

import { Send } from "lucide-react";
import type { Post } from "@edugram/shared";
import { cn } from "@/lib/cn";
import { useSession, useSharePost } from "@/lib/queries";
import { useToast } from "@/components/ui/toast";

export function ShareButton({ post, className }: { post: Post; className?: string }) {
  const share = useSharePost();
  const toast = useToast();
  const { data: user } = useSession();
  const record = (channel: "link" | "other") => {
    if (user) share.mutate({ id: post.id, channel });
  };

  const onShare = async () => {
    const url = `${window.location.origin}/p/${post.id}`;
    const title = `${post.author.displayName} on Edugram`;
    const text = post.caption.slice(0, 120);

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url });
        record("other");
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.show("Link copied");
      record("link");
    } catch {
      toast.show("Could not copy the link", "error");
    }
  };

  return (
    <button
      aria-label="Share"
      className={cn(
        "group grid size-10 place-items-center rounded-full transition-colors hover:bg-surface-2",
        className,
      )}
      onClick={onShare}
    >
      <Send
        className="size-[22px] -translate-x-px translate-y-px transition-transform group-active:scale-90"
        strokeWidth={1.8}
      />
    </button>
  );
}
