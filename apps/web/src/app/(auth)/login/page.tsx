import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { safeNext } from "@/lib/redirect";
import { Logo } from "@/components/ui/logo";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; ref?: string }>;
}) {
  const user = await getSession();
  const { next, ref } = await searchParams;
  if (user) redirect(user.onboarded ? safeNext(next) : "/onboarding");

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-ink p-10 text-bg lg:flex">
        <Logo className="text-bg [&>span:first-child]:bg-bg [&>span:first-child]:text-ink" />
        <div className="max-w-[520px]">
          <h1 className="font-display text-[64px] leading-[0.98] tracking-[-0.02em] text-balance">
            Where students <span className="italic">actually</span> talk about learning.
          </h1>
          <p className="mt-6 max-w-[44ch] text-[17px] leading-relaxed opacity-75">
            Post what you are working on. Follow people from your campus and beyond. Earn when you
            bring your friends.
          </p>
        </div>
        <p className="text-[13px] opacity-50">Made in India for students everywhere.</p>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 -top-40 size-[560px] rounded-full opacity-[0.12]"
          style={{ background: "radial-gradient(closest-side, var(--accent), transparent)" }}
        />
      </section>

      <section className="flex flex-col px-6 py-8 sm:px-10 lg:justify-center">
        <div className="mb-10 lg:hidden">
          <Logo />
        </div>
        <div className="mx-auto w-full max-w-[380px]">
          <LoginForm next={next} initialRef={ref} />
          <p className="mt-8 text-[12.5px] leading-relaxed text-muted">
            By continuing you agree to the terms and privacy policy. We will text you a one-time
            code.
          </p>
        </div>
      </section>
    </div>
  );
}
