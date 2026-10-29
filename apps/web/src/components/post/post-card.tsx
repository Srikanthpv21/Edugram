"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, MessageCircle } from "lucide-react";
import type { Post } from "@edugram/shared";
import { cn } from "@/lib/cn";
import { compact, plural, timeAgo } from "@/lib/format";
import { useSession, useToggleLike } from "@/lib/queries";
import { Avatar } from "@/components/ui/avatar";
import { LikeButton } from "./like-button";
import { ShareButton } from "./share-button";
import { PostMedia } from "./post-media";
import { PostMenu } from "./post-menu";

export function PostCard({
  post,
  priority = false,
  expanded = false,
}: {
  post: Post;
  priority?: boolean;
  expanded?: boolean;
}) {
  const { author } = post;
  const toggle = useToggleLike();
  const { data: user } = useSession();
  const router = useRouter();
  const isText = post.kind === "text";

  const likeOnDoubleTap = () => {
    if (user === null) return router.push("/login");
    if (!post.viewer?.hasLiked) toggle.mutate({ id: post.id, liked: false });
  };

  return (
    <article className="border-b pb-3 md:rounded-[var(--radius-lg)] md:border md:bg-surface md:pb-2 md:shadow-sm">
      <header className="flex items-center gap-3 px-4 py-3">
        <Link href={`/${author.username}`} className="shrink-0">
          <Avatar src={author.avatarUrl} name={author.displayName} size="sm" />
        </Link>
        <div className="min-w-0 flex-1 leading-tight">
          <Link
            href={`/${author.username}`}
            className="inline-flex max-w-full items-center gap-1 text-[14px] font-semibold hover:underline"
          >
            <span className="truncate">{author.displayName}</span>
            {author.isVerified && <BadgeCheck className="size-4 shrink-0 fill-accent text-bg" />}
          </Link>
          <p className="truncate text-[12.5px] text-muted">
            @{author.username}
            {author.institution && <> · {author.institution}</>}
          </p>
        </div>
        <time dateTime={post.createdAt} className="text-[12.5px] text-muted tabular">
          {timeAgo(post.createdAt)}
        </time>
        <PostMenu post={post} />
      </header>

      {!isText && (
        <div className="md:mx-2 md:overflow-hidden md:rounded-[14px]">
          <PostMedia
            urls={post.mediaUrls}
            alt={post.caption || `Post by ${author.displayName}`}
            onDoubleTap={likeOnDoubleTap}
            priority={priority}
          />
        </div>
      )}

      {isText && (
        <Link href={`/p/${post.id}`} className="block px-4 pb-1 pt-0.5">
          <p className="whitespace-pre-wrap text-pretty text-[17px] leading-[1.45] tracking-[-0.01em]">
            {post.caption}
          </p>
        </Link>
      )}

      <div className="flex items-center px-2 pt-1">
        <LikeButton post={post} />
        <Link
          href={`/p/${post.id}`}
          aria-label="Comments"
          className="group grid size-10 place-items-center rounded-full transition-colors hover:bg-surface-2"
        >
          <MessageCircle
            className="size-[23px] transition-transform group-active:scale-90"
            strokeWidth={1.8}
          />
        </Link>
        <ShareButton post={post} />
      </div>

      <div className="flex flex-col gap-1 px-4">
        {post.likeCount > 0 && (
          <p className="text-[13.5px] font-semibold tabular">
            {compact(post.likeCount)} {plural(post.likeCount, "like")}
          </p>
        )}
        {!isText && post.caption && (
          <p className="text-pretty text-[14.5px] leading-[1.45]">
            <Link href={`/${author.username}`} className="mr-1.5 font-semibold">
              {author.username}
            </Link>
            <Caption text={post.caption} expanded={expanded} />
          </p>
        )}
        {post.tags.length > 0 && (
          <p className="flex flex-wrap gap-x-2 text-[13px] text-accent">
            {post.tags.map((t) => (
              <Link key={t} href={`/explore?tag=${t}`} className="hover:underline">
                #{t}
              </Link>
            ))}
          </p>
        )}
        {post.commentCount > 0 && (
          <Link href={`/p/${post.id}`} className="text-[13.5px] text-muted hover:underline">
            View{" "}
            {post.commentCount === 1 ? "1 comment" : `all ${compact(post.commentCount)} comments`}
          </Link>
        )}
      </div>
    </article>
  );
}

function Caption({ text, expanded }: { text: string; expanded: boolean }) {
  const limit = 140;
  const clamp = !expanded && text.length > limit;
  return <span className={cn("whitespace-pre-wrap", clamp && "line-clamp-2")}>{text}</span>;
}
