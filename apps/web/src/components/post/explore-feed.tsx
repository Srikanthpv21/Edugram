"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, BadgeCheck, X } from "lucide-react";
import type { PublicUser } from "@edugram/shared";
import { api } from "@/lib/api";
import { useExplore } from "@/lib/queries";
import { Avatar } from "@/components/ui/avatar";
import { FeedList } from "./feed-list";

export function ExploreFeed() {
  return (
    <Suspense fallback={null}>
      <ExploreFeedInner />
    </Suspense>
  );
}

function ExploreFeedInner() {
  const params = useSearchParams();
  const tag = params.get("tag")?.trim().toLowerCase() || undefined;
  const explore = useExplore(tag);
  const [q, setQ] = useState("");
  const trimmed = q.trim();
  const search = useQuery({
    queryKey: ["search", trimmed],
    queryFn: () =>
      api
        .get<{ items: PublicUser[] }>(`/users?q=${encodeURIComponent(trimmed)}`)
        .then((r) => r.items),
    enabled: trimmed.length > 0,
    staleTime: 10_000,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="px-4 md:px-0">
        <div className="flex h-11 items-center gap-2 rounded-full bg-surface-2 px-4 transition-shadow focus-within:shadow-[inset_0_0_0_1.5px_var(--ink)]">
          <Search className="size-[18px] text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search people"
            className="h-full w-full bg-transparent text-[15px] outline-none placeholder:text-muted"
          />
        </div>
      </div>

      {tag && !trimmed && (
        <div className="flex items-center gap-2 px-4 md:px-0">
          <span className="text-[14px] text-muted">Posts tagged</span>
          <Link
            href="/explore"
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-ink pl-3 pr-2 text-[13.5px] font-medium text-bg"
          >
            #{tag}
            <X className="size-3.5" />
          </Link>
        </div>
      )}

      {trimmed ? (
        <ul className="flex flex-col px-2 md:px-0">
          {search.isLoading && <li className="px-2 py-3 text-[14px] text-muted">Searching</li>}
          {search.data?.length === 0 && (
            <li className="px-2 py-3 text-[14px] text-muted">No one matches “{trimmed}”</li>
          )}
          {search.data?.map((p) => (
            <li key={p.id}>
              <Link
                href={`/${p.username}`}
                className="flex items-center gap-3 rounded-[var(--radius-md)] px-2 py-2.5 hover:bg-surface-2"
              >
                <Avatar src={p.avatarUrl} name={p.displayName} size="md" />
                <div className="min-w-0 leading-tight">
                  <p className="inline-flex items-center gap-1 text-[14.5px] font-semibold">
                    {p.displayName}
                    {p.isVerified && <BadgeCheck className="size-4 fill-accent text-bg" />}
                  </p>
                  <p className="truncate text-[13px] text-muted">
                    @{p.username}
                    {p.institution && <> · {p.institution}</>}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <FeedList
          query={explore}
          empty={
            <div className="px-4 py-16 text-center text-[15px] text-muted">
              {tag ? `No posts tagged #${tag} yet.` : "Nothing here yet. Be the first to post."}
            </div>
          }
        />
      )}
    </div>
  );
}
