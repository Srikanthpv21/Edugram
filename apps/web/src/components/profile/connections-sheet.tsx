"use client";

import Link from "next/link";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { BadgeCheck, X } from "lucide-react";
import { useConnections, useSession } from "@/lib/queries";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { FollowButton } from "./follow-button";

export function ConnectionsSheet({
  username,
  kind,
  onClose,
}: {
  username: string;
  kind: "followers" | "following";
  onClose: () => void;
}) {
  const q = useConnections(username, kind);
  const { data: user } = useSession();
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-40 flex items-end justify-center md:items-center"
      role="dialog"
      aria-modal="true"
    >
      <motion.button
        aria-label="Close"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-overlay"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 36 }}
        className="relative flex max-h-[80dvh] w-full flex-col rounded-t-[var(--radius-lg)] bg-surface shadow-lg md:max-w-[420px] md:rounded-[var(--radius-lg)]"
      >
        <header className="flex items-center justify-between border-b px-5 py-3.5">
          <h2 className="text-[15px] font-semibold capitalize">{kind}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 place-items-center rounded-full hover:bg-surface-2"
          >
            <X className="size-[18px]" />
          </button>
        </header>
        <ul className="flex-1 overflow-y-auto px-3 py-2">
          {q.isLoading && (
            <li className="grid h-24 place-items-center">
              <Spinner className="size-5 text-muted" />
            </li>
          )}
          {!q.isLoading && items.length === 0 && (
            <li className="px-2 py-10 text-center text-[14px] text-muted">
              {kind === "followers" ? "No followers yet" : "Not following anyone yet"}
            </li>
          )}
          {items.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-2 py-2">
              <Link href={`/${p.username}`} onClick={onClose}>
                <Avatar src={p.avatarUrl} name={p.displayName} size="md" />
              </Link>
              <div className="min-w-0 flex-1 leading-tight">
                <Link
                  href={`/${p.username}`}
                  onClick={onClose}
                  className="inline-flex items-center gap-1 text-[14px] font-semibold"
                >
                  <span className="truncate">{p.displayName}</span>
                  {p.isVerified && <BadgeCheck className="size-3.5 fill-accent text-bg" />}
                </Link>
                <p className="truncate text-[12.5px] text-muted">@{p.username}</p>
              </div>
              {user && user.id !== p.id && (
                <FollowButton
                  userId={p.id}
                  username={p.username}
                  isFollowing={p.isFollowing}
                  size="sm"
                />
              )}
            </li>
          ))}
          {q.hasNextPage && (
            <li className="flex justify-center py-3">
              <Button
                variant="ghost"
                size="sm"
                loading={q.isFetchingNextPage}
                onClick={() => q.fetchNextPage()}
              >
                Load more
              </Button>
            </li>
          )}
        </ul>
      </motion.div>
    </div>,
    document.body,
  );
}
