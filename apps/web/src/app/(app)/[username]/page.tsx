import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Profile } from "@edugram/shared";
import { serverFetch } from "@/lib/session";
import { ProfileView } from "@/components/profile/profile-view";

type Params = Promise<{ username: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { username } = await params;
  const data = await serverFetch<{ profile: Profile }>(`/users/${username}`);
  if (!data) return { title: "Profile" };
  const p = data.profile;
  return {
    title: `${p.displayName} (@${p.username})`,
    description: p.bio ?? `${p.displayName} on Edugram`,
    openGraph: { title: `${p.displayName} (@${p.username})`, description: p.bio ?? undefined },
  };
}

export default async function ProfilePage({ params }: { params: Params }) {
  const { username } = await params;
  const data = await serverFetch<{ profile: Profile }>(`/users/${username}`);
  if (!data) notFound();
  return <ProfileView key={data.profile.id} initial={data.profile} />;
}
