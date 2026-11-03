import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Composer } from "@/components/post/composer";

export const metadata: Metadata = { title: "New post" };

export default async function CreatePage() {
  const user = await getSession();
  if (!user) redirect("/login?next=/create");
  return <Composer user={user} />;
}
