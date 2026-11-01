"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BadgeCheck, GraduationCap, Grid3X3, Settings2 } from "lucide-react";
import type { Profile } from "@edugram/shared";
import { cn } from "@/lib/cn";
import { compact, plural } from "@/lib/format";
import { isTrustedImageHost } from "@/lib/images";
import { useProfile, useSession, useUserPosts } from "@/lib/queries";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FollowButton } from "./follow-button";
import { ConnectionsSheet } from "./connections-sheet";

export function ProfileView({ initial }: { initial: Profile }) {
  const { data: profile = initial } = useProfile(initial.username, initial);
  const { data: user } = useSession();
  const posts = useUserPosts(profile.username);
  const router = useRouter();
  const [sheet, setSheet] = useState<"followers" | "following" | null>(null);

  const isSelf = user?.id === profile.id;
  const items = posts.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="flex flex-col">
      <header className="flex flex-col gap-5 px-4 pt-2 md:px-0 md:pt-0">
        <div className="flex items-start gap-4 md:gap-7">
          <Avatar src={profile.avatarUrl} name={profile.displayName} size="xl" />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="inline-flex min-w-0 items-center gap-1.5 text-[20px] font-semibold tracking-[-0.02em]">
                <span className="truncate">{profile.displayName}</span>
                {profile.isVerified && (
                  <BadgeCheck className="size-5 shrink-0 fill-accent text-bg" />
                )}
              </h1>
              <div className="ml-auto flex items-center gap-2 md:ml-0">
                {isSelf ? (
                  <Button variant="secondary" size="sm" onClick={() => router.push("/settings")}>
                    <Settings2 className="size-4" />
                    Edit profile
                  </Button>
                ) : user ? (
                  <FollowButton
                    key={profile.id}
                    userId={profile.id}
                    username={profile.username}
                    isFollowing={profile.viewer?.isFollowing ?? false}
                    size="sm"
                  />
                ) : (
                  <Button size="sm" onClick={() => router.push("/login")}>
                    Follow
                  </Button>
                )}
              </div>
            </div>

            <ul className="flex gap-5 text-[14px]">
              <li>
                <span className="font-semibold tabular">{compact(profile.postCount)}</span>{" "}
                <span className="text-muted">{plural(profile.postCount, "post")}</span>
              </li>
              <li>
                <button className="hover:underline" onClick={() => setSheet("followers")}>
                  <span className="font-semibold tabular">{compact(profile.followerCount)}</span>{" "}
                  <span className="text-muted">{plural(profile.followerCount, "follower")}</span>
                </button>
              </li>
              <li>
                <button className="hover:underline" onClick={() => setSheet("following")}>
                  <span className="font-semibold tabular">{compact(profile.followingCount)}</span>{" "}
                  <span className="text-muted">following</span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-[14px] text-muted">
            @{profile.username}
            {profile.viewer?.followsYou && !isSelf && (
              <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 text-[11.5px] font-medium text-ink-2">
                Follows you
              </span>
            )}
          </p>
          {profile.bio && (
            <p className="whitespace-pre-wrap text-pretty text-[14.5px] leading-[1.45]">
              {profile.bio}
            </p>
          )}
          {(profile.institution || profile.course) && (
            <p className="mt-1 inline-flex items-center gap-1.5 text-[13.5px] text-ink-2">
              <GraduationCap className="size-4 text-muted" />
              {[profile.course, profile.institution].filter(Boolean).join(" · ")}
              {profile.graduationYear && (
                <span className="text-muted">’{String(profile.graduationYear).slice(-2)}</span>
              )}
            </p>
          )}
        </div>
      </header>

      <div className="mt-6 border-t">
        <div className="flex justify-center">
          <span className="-mt-px inline-flex items-center gap-1.5 border-t-2 border-ink px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.08em]">
            <Grid3X3 className="size-3.5" />
            Posts
          </span>
        </div>

        {posts.isLoading ? (
          <div className="grid grid-cols-3 gap-0.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton aspect-square" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <p className="font-display text-[28px] leading-none tracking-[-0.02em]">No posts yet</p>
            {isSelf && (
              <p className="mt-2 text-[14px] text-muted">
                <Link href="/create" className="text-ink underline underline-offset-2">
                  Share your first one
                </Link>
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {items.map((p) => (
              <Link
                key={p.id}
                href={`/p/${p.id}`}
                className={cn(
                  "group relative aspect-square overflow-hidden bg-surface-2",
                  p.kind === "text" && "bg-surface",
                )}
              >
                {p.kind === "image" && p.mediaUrls[0] ? (
                  <Image
                    src={p.mediaUrls[0]}
                    alt={p.caption || "Post"}
                    fill
                    sizes="(max-width: 768px) 33vw, 180px"
                    className="object-cover transition-transform duration-500 ease-out-quart group-hover:scale-[1.03]"
                    unoptimized={!isTrustedImageHost(p.mediaUrls[0])}
                  />
                ) : (
                  <p className="line-clamp-5 p-3 text-[12.5px] leading-snug text-ink-2 md:p-4 md:text-[13.5px]">
                    {p.caption}
                  </p>
                )}
                {p.mediaUrls.length > 1 && (
                  <span className="absolute right-2 top-2 size-4 rounded-sm border-2 border-white/90 bg-white/20 backdrop-blur-sm" />
                )}
              </Link>
            ))}
          </div>
        )}
        {posts.hasNextPage && (
          <div className="flex justify-center py-6">
            <Button
              variant="secondary"
              size="sm"
              loading={posts.isFetchingNextPage}
              onClick={() => posts.fetchNextPage()}
            >
              Load more
            </Button>
          </div>
        )}
      </div>

      {sheet && (
        <ConnectionsSheet username={profile.username} kind={sheet} onClose={() => setSheet(null)} />
      )}
    </div>
  );
}
