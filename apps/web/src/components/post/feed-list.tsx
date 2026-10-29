"use client";

import { useEffect, useRef } from "react";
import type { UseInfiniteQueryResult, InfiniteData } from "@tanstack/react-query";
import type { Page, Post } from "@edugram/shared";
import { Spinner } from "@/components/ui/spinner";
import { PostCard } from "./post-card";

export function FeedList({
  query,
  empty,
}: {
  query: UseInfiniteQueryResult<InfiniteData<Page<Post>>, Error>;
  empty: React.ReactNode;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  const { data, isLoading, isError, error, hasNextPage, fetchNextPage, isFetchingNextPage } = query;

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) void fetchNextPage();
      },
      { rootMargin: "800px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) return <FeedSkeleton />;
  if (isError) {
    return (
      <div className="px-4 py-16 text-center text-[14px] text-muted">
        Could not load posts. {error.message}
      </div>
    );
  }

  const posts = data?.pages.flatMap((p) => p.items) ?? [];
  if (posts.length === 0) return <>{empty}</>;

  return (
    <div className="flex flex-col md:gap-5">
      {posts.map((p, i) => (
        <PostCard key={p.id} post={p} priority={i < 2} />
      ))}
      <div ref={sentinel} className="grid h-14 place-items-center">
        {isFetchingNextPage && <Spinner className="size-5 text-muted" />}
        {!hasNextPage && posts.length > 4 && (
          <p className="text-[13px] text-muted">You are all caught up</p>
        )}
      </div>
    </div>
  );
}

export function FeedSkeleton() {
  return (
    <div className="flex flex-col md:gap-5">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="border-b pb-4 md:rounded-[var(--radius-lg)] md:border md:bg-surface"
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="skeleton size-8 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <div className="skeleton h-3 w-32 rounded" />
              <div className="skeleton h-2.5 w-20 rounded" />
            </div>
          </div>
          <div className="skeleton aspect-[4/5] md:mx-2 md:rounded-[14px]" />
          <div className="flex flex-col gap-2 px-4 pt-4">
            <div className="skeleton h-3 w-24 rounded" />
            <div className="skeleton h-3 w-3/4 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
