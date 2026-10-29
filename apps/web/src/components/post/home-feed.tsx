"use client";

import Link from "next/link";
import { useFeed } from "@/lib/queries";
import { FeedList } from "./feed-list";
import { SuggestedPeople } from "@/components/profile/suggested-people";

export function HomeFeed() {
  const feed = useFeed();
  return (
    <FeedList
      query={feed}
      empty={
        <div className="flex flex-col gap-6 px-4 py-10">
          <div>
            <h1 className="font-display text-[34px] leading-none tracking-[-0.02em]">
              Your feed is quiet.
            </h1>
            <p className="mt-2 text-[15px] text-muted">
              Follow a few people and their posts will show up here. Or{" "}
              <Link href="/explore" className="text-ink underline underline-offset-2">
                explore
              </Link>{" "}
              what students are posting right now.
            </p>
          </div>
          <div className="lg:hidden">
            <SuggestedPeople />
          </div>
        </div>
      }
    />
  );
}
