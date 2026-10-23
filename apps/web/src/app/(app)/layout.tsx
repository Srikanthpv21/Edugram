import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSession } from "@/lib/session";
import { AppShell } from "@/components/shell/app-shell";
import { SuggestedPeople } from "@/components/profile/suggested-people";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (user && !user.onboarded) {
    const h = await headers();
    const path = h.get("x-pathname") ?? "";
    if (!path.startsWith("/onboarding")) redirect("/onboarding");
  }
  return (
    <AppShell user={user} aside={<SuggestedPeople />}>
      {children}
    </AppShell>
  );
}
