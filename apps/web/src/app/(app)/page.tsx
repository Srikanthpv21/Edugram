import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { HomeFeed } from "@/components/post/home-feed";

export default async function HomePage() {
  const user = await getSession();
  if (!user) redirect("/login");
  return <HomeFeed />;
}
