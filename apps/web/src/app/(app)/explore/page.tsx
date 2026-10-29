import type { Metadata } from "next";
import { ExploreFeed } from "@/components/post/explore-feed";

export const metadata: Metadata = { title: "Explore" };

export default function ExplorePage() {
  return <ExploreFeed />;
}
