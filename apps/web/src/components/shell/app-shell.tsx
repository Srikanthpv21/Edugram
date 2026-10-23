"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Compass, Gift, Home, Plus, Search, User } from "lucide-react";
import type { SessionUser } from "@edugram/shared";
import { cn } from "@/lib/cn";
import { keys } from "@/lib/queries";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/logo";
import { AccountMenu } from "./account-menu";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  match: (path: string) => boolean;
}

export function AppShell({
  user,
  children,
  aside,
}: {
  user: SessionUser | null;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  const path = usePathname();
  const me = user?.username ? `/${user.username}` : "/login";

  const qc = useQueryClient();
  useState(() => {
    if (qc.getQueryData(keys.session) === undefined) qc.setQueryData(keys.session, user);
  });
  useEffect(() => {
    qc.setQueryData(keys.session, user);
  }, [qc, user]);

  const items: NavItem[] = [
    { href: "/", label: "Home", icon: Home, match: (p) => p === "/" },
    { href: "/explore", label: "Explore", icon: Compass, match: (p) => p.startsWith("/explore") },
    { href: "/create", label: "Create", icon: Plus, match: (p) => p.startsWith("/create") },
    { href: "/refer", label: "Refer", icon: Gift, match: (p) => p.startsWith("/refer") },
    { href: me, label: "Profile", icon: User, match: (p) => p === me },
  ];

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1120px]">
      <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col border-r px-4 py-6 md:flex">
        <Link href="/" className="mb-8 ml-2 inline-flex w-fit">
          <Logo />
        </Link>
        <nav className="flex flex-col gap-1">
          {items.map((it) => {
            const active = it.match(path);
            const Icon = it.icon;
            return (
              <Link
                key={it.label}
                href={it.href}
                className={cn(
                  "group flex h-11 items-center gap-3 rounded-full px-3 text-[15px] transition-colors",
                  active ? "font-semibold" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                )}
              >
                {it.label === "Profile" && user ? (
                  <Avatar src={user.avatarUrl} name={user.displayName ?? "You"} size="xs" />
                ) : (
                  <Icon
                    className={cn(
                      "size-[22px] transition-transform group-active:scale-90",
                      active && "stroke-[2.4]",
                    )}
                  />
                )}
                {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto">
          {user ? (
            <AccountMenu user={user} />
          ) : (
            <Link
              href="/login"
              className="flex h-11 items-center justify-center rounded-full bg-ink text-[14px] font-medium text-bg"
            >
              Sign in
            </Link>
          )}
        </div>
      </aside>

      <header className="fixed inset-x-0 top-0 z-30 flex h-[var(--nav-h)] items-center justify-between border-b bg-bg/85 px-4 backdrop-blur-md md:hidden">
        <Link href="/">
          <Logo />
        </Link>
        <Link
          href="/explore"
          aria-label="Search"
          className="grid size-9 place-items-center rounded-full"
        >
          <Search className="size-[21px]" />
        </Link>
      </header>

      <main className="min-w-0 flex-1 pt-[var(--nav-h)] pb-[calc(var(--tab-h)+16px)] md:pt-0 md:pb-0">
        <div className="mx-auto flex w-full max-w-[880px] gap-10 md:px-8 md:py-8">
          <div className="min-w-0 flex-1 md:max-w-[520px]">{children}</div>
          {aside && <div className="hidden w-[300px] shrink-0 lg:block">{aside}</div>}
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-[var(--tab-h)] items-stretch border-t bg-bg/90 backdrop-blur-md safe-bottom md:hidden">
        {items.map((it) => {
          const active = it.match(path);
          const Icon = it.icon;
          const isCreate = it.label === "Create";
          return (
            <Link
              key={it.label}
              href={it.href}
              aria-label={it.label}
              className="flex flex-1 items-center justify-center"
            >
              {isCreate ? (
                <span className="grid size-10 place-items-center rounded-full bg-ink text-bg">
                  <Icon className="size-5" strokeWidth={2.4} />
                </span>
              ) : it.label === "Profile" && user ? (
                <span
                  className={cn(
                    "rounded-full",
                    active && "ring-2 ring-ink ring-offset-2 ring-offset-bg",
                  )}
                >
                  <Avatar src={user.avatarUrl} name={user.displayName ?? "You"} size="xs" />
                </span>
              ) : (
                <Icon className={cn("size-[24px]", active ? "stroke-[2.5]" : "text-ink-2")} />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
