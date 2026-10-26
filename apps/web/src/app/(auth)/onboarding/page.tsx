import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Logo } from "@/components/ui/logo";
import { OnboardingForm } from "@/components/auth/onboarding-form";

export const metadata: Metadata = { title: "Set up your profile" };

export default async function OnboardingPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.onboarded) redirect("/");

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col px-6 py-8">
      <Logo />
      <div className="my-auto py-10">
        <OnboardingForm />
      </div>
    </div>
  );
}
