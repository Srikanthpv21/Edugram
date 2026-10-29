"use client";

import { MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Post } from "@edugram/shared";
import { useDeletePost, useSession } from "@/lib/queries";
import { useToast } from "@/components/ui/toast";

export function PostMenu({ post }: { post: Post }) {
  const { data: user } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const del = useDeletePost();
  const toast = useToast();
  const router = useRouter();
  const mine = user?.id === post.author.id;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const copy = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/p/${post.id}`);
    toast.show("Link copied");
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative -mr-2">
      <button
        aria-label="More"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="grid size-9 place-items-center rounded-full text-ink-2 transition-colors hover:bg-surface-2"
      >
        <MoreHorizontal className="size-5" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-[var(--radius-md)] bg-surface p-1.5 shadow-lg hairline"
          >
            <button
              onClick={copy}
              className="flex h-10 w-full items-center rounded-[10px] px-3 text-left text-[14px] hover:bg-surface-2"
            >
              Copy link
            </button>
            {mine && (
              <button
                onClick={() => {
                  setOpen(false);
                  del.mutate(post.id, {
                    onSuccess: () => {
                      toast.show("Post deleted");
                      if (window.location.pathname === `/p/${post.id}`) router.push("/");
                    },
                    onError: () => toast.show("Could not delete", "error"),
                  });
                }}
                className="flex h-10 w-full items-center rounded-[10px] px-3 text-left text-[14px] text-like hover:bg-like/10"
              >
                Delete
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
