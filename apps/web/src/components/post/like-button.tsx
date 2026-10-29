"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Post } from "@edugram/shared";
import { cn } from "@/lib/cn";
import { useSession, useToggleLike } from "@/lib/queries";

export function LikeButton({ post, className }: { post: Post; className?: string }) {
  const liked = post.viewer?.hasLiked ?? false;
  const toggle = useToggleLike();
  const { data: user } = useSession();
  const router = useRouter();
  const [pop, setPop] = useState(false);

  return (
    <button
      aria-label={liked ? "Unlike" : "Like"}
      aria-pressed={liked}
      className={cn(
        "group grid size-10 place-items-center rounded-full transition-colors hover:bg-surface-2",
        className,
      )}
      onClick={() => {
        if (user === null) return router.push("/login");
        if (!liked) {
          setPop(true);
          window.setTimeout(() => setPop(false), 450);
        }
        toggle.mutate({ id: post.id, liked });
      }}
    >
      <Heart
        className={cn(
          "size-[24px] transition-colors",
          liked ? "fill-like text-like" : "text-ink group-hover:text-ink-2",
          pop && "heart-pop",
        )}
        strokeWidth={liked ? 0 : 1.8}
      />
    </button>
  );
}
