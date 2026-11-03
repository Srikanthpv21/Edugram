import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Post } from "@edugram/shared";
import { serverFetch } from "@/lib/session";
import { PostDetail } from "@/components/post/post-detail";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const data = await serverFetch<{ post: Post }>(`/posts/${id}`);
  if (!data) return { title: "Post" };
  const p = data.post;
  const title = `${p.author.displayName} on Edugram`;
  const description = p.caption.slice(0, 160) || undefined;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: p.mediaUrls[0] ? [{ url: p.mediaUrls[0] }] : undefined,
    },
  };
}

export default async function PostPage({ params }: { params: Params }) {
  const { id } = await params;
  const data = await serverFetch<{ post: Post }>(`/posts/${id}`);
  if (!data) notFound();
  return <PostDetail key={data.post.id} initial={data.post} />;
}
