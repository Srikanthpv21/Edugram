import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { Profile } from "@edugram/shared";
import { getSession, serverFetch } from "@/lib/session";
import { EditProfile } from "@/components/profile/edit-profile";

export const metadata: Metadata = { title: "Edit profile" };

export default async function SettingsPage() {
  const user = await getSession();
  if (!user) redirect("/login?next=/settings");
  const data = await serverFetch<{ profile: Profile }>(`/users/${user.username}`);
  if (!data) redirect("/");
  return <EditProfile profile={data.profile} />;
}
