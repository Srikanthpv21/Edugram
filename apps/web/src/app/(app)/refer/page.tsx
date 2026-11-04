import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { ReferView } from "@/components/refer/refer-view";

export const metadata: Metadata = { title: "Refer and earn" };

export default async function ReferPage() {
  const user = await getSession();
  if (!user) redirect("/login?next=/refer");
  return <ReferView />;
}
