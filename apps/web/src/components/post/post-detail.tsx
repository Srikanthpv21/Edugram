"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Post } from "@edugram/shared";
import { usePost } from "@/lib/queries";
import { PostCard } from "./post-card";
import { CommentsSection } from "@/components/comments/comments-section";

export function PostDetail({ initial }: { initial: Post }) {
  const { data: post = initial } = usePost(initial.id, initial);
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 px-2 md:px-0">
        <button
          onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
          aria-label="Back"
          className="grid size-9 place-items-center rounded-full hover:bg-surface-2"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-[15px] font-semibold">Post</h1>
        <Link
          href={`/${post.author.username}`}
          className="ml-auto text-[13.5px] text-muted hover:underline"
        >
          More from @{post.author.username}
        </Link>
      </div>
      <PostCard post={post} priority expanded />
      <CommentsSection postId={post.id} />
    </div>
  );
}
