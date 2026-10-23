"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { LogOut, MoreHorizontal, Settings } from "lucide-react";
import Link from "next/link";
import type { SessionUser } from "@edugram/shared";
import { Avatar } from "@/components/ui/avatar";
import { useLogout } from "@/lib/queries";

export function AccountMenu({ user }: { user: SessionUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const logout = useLogout();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.25, 1, 0.5, 1] }}
            className="absolute bottom-full left-0 mb-2 w-full overflow-hidden rounded-[var(--radius-md)] bg-surface p-1.5 shadow-lg hairline"
          >
            <Link
              href="/settings"
              className="flex h-10 items-center gap-3 rounded-[10px] px-3 text-[14px] hover:bg-surface-2"
              onClick={() => setOpen(false)}
            >
              <Settings className="size-4" />
              Edit profile
            </Link>
            <button
              className="flex h-10 w-full items-center gap-3 rounded-[10px] px-3 text-left text-[14px] hover:bg-surface-2"
              onClick={() => {
                logout.mutate(undefined, {
                  onSuccess: () => {
                    router.push("/login");
                    router.refresh();
                  },
                });
              }}
            >
              <LogOut className="size-4" />
              Log out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-full px-2 py-2 text-left transition-colors hover:bg-surface-2"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar src={user.avatarUrl} name={user.displayName ?? "You"} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-medium leading-tight">
            {user.displayName ?? "You"}
          </span>
          <span className="block truncate text-[12.5px] leading-tight text-muted">
            @{user.username}
          </span>
        </span>
        <MoreHorizontal className="size-4 text-muted" />
      </button>
    </div>
  );
}
