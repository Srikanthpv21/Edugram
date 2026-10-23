"use client";

import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { useSession, useSuggested } from "@/lib/queries";
import { Avatar } from "@/components/ui/avatar";
import { FollowButton } from "./follow-button";

export function SuggestedPeople() {
  const { data: people, isLoading } = useSuggested();
  const { data: user } = useSession();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <div className="skeleton h-3 w-28 rounded" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="skeleton size-10 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <div className="skeleton h-3 w-28 rounded" />
              <div className="skeleton h-2.5 w-20 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (!people || people.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">
        People to follow
      </h2>
      <ul className="flex flex-col gap-3">
        {people.map((p) => (
          <li key={p.id} className="flex items-center gap-3">
            <Link href={`/${p.username}`}>
              <Avatar src={p.avatarUrl} name={p.displayName} size="md" />
            </Link>
            <div className="min-w-0 flex-1 leading-tight">
              <Link
                href={`/${p.username}`}
                className="inline-flex max-w-full items-center gap-1 text-[14px] font-semibold hover:underline"
              >
                <span className="truncate">{p.displayName}</span>
                {p.isVerified && <BadgeCheck className="size-3.5 shrink-0 fill-accent text-bg" />}
              </Link>
              <p className="truncate text-[12.5px] text-muted">
                {p.institution ?? `@${p.username}`}
              </p>
            </div>
            {user ? (
              <FollowButton userId={p.id} username={p.username} isFollowing={false} size="sm" />
            ) : (
              <Link
                href="/login"
                className="h-8 rounded-full bg-ink px-3 text-[13px] font-medium leading-8 text-bg"
              >
                Follow
              </Link>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-6 text-[12px] leading-relaxed text-muted">
        Edugram · Built for students in India
      </p>
    </section>
  );
}
