import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[420px] flex-col px-6 py-8">
      <Logo />
      <div className="my-auto">
        <h1 className="font-display text-[44px] leading-none tracking-[-0.02em]">Nothing here.</h1>
        <p className="mt-3 text-[15px] text-muted">
          The page may have moved, or the account may not exist.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-ink px-5 text-[14px] font-medium text-bg"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}
