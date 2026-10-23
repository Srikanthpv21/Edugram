"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import type {
  Comment,
  CreatePostInput,
  Page,
  Post,
  Profile,
  PublicUser,
  ReferralSummary,
  SessionUser,
  WalletEntry,
} from "@edugram/shared";
import { api } from "./api";

export const keys = {
  session: ["session"] as const,
  feed: ["feed"] as const,
  explore: (tag?: string) => ["explore", tag ?? ""] as const,
  suggested: ["suggested"] as const,
  profile: (username: string) => ["profile", username] as const,
  userPosts: (username: string) => ["user-posts", username] as const,
  post: (id: string) => ["post", id] as const,
  comments: (postId: string) => ["comments", postId] as const,
  connections: (username: string, kind: "followers" | "following") =>
    ["connections", username, kind] as const,
  referral: ["referral"] as const,
  wallet: ["wallet"] as const,
};

export function useSession() {
  return useQuery({
    queryKey: keys.session,
    queryFn: () => api.get<{ user: SessionUser | null }>("/auth/me").then((r) => r.user),
    staleTime: 5 * 60_000,
  });
}

function pageQuery(path: string) {
  return ({ pageParam }: { pageParam: string | null }) =>
    api.get<Page<Post>>(
      pageParam
        ? `${path}${path.includes("?") ? "&" : "?"}cursor=${encodeURIComponent(pageParam)}`
        : path,
    );
}

const infiniteOpts = {
  initialPageParam: null as string | null,
  getNextPageParam: (last: Page<unknown>) => last.nextCursor,
};

export function useFeed() {
  return useInfiniteQuery({ queryKey: keys.feed, queryFn: pageQuery("/feed"), ...infiniteOpts });
}

export function useExplore(tag?: string) {
  return useInfiniteQuery({
    queryKey: keys.explore(tag),
    queryFn: pageQuery(tag ? `/feed/explore?tag=${encodeURIComponent(tag)}` : "/feed/explore"),
    ...infiniteOpts,
  });
}

export function useUserPosts(username: string) {
  return useInfiniteQuery({
    queryKey: keys.userPosts(username),
    queryFn: pageQuery(`/users/${username}/posts`),
    ...infiniteOpts,
  });
}

export function useSuggested() {
  return useQuery({
    queryKey: keys.suggested,
    queryFn: () => api.get<{ items: PublicUser[] }>("/feed/suggested").then((r) => r.items),
  });
}

export function useProfile(username: string, initial?: Profile) {
  return useQuery({
    queryKey: keys.profile(username),
    queryFn: () => api.get<{ profile: Profile }>(`/users/${username}`).then((r) => r.profile),
    initialData: initial,
  });
}

export function usePost(id: string, initial?: Post) {
  return useQuery({
    queryKey: keys.post(id),
    queryFn: () => api.get<{ post: Post }>(`/posts/${id}`).then((r) => r.post),
    initialData: initial,
  });
}

export function useComments(postId: string) {
  return useInfiniteQuery({
    queryKey: keys.comments(postId),
    queryFn: ({ pageParam }) =>
      api.get<Page<Comment>>(
        pageParam
          ? `/posts/${postId}/comments?cursor=${encodeURIComponent(pageParam)}`
          : `/posts/${postId}/comments`,
      ),
    ...infiniteOpts,
  });
}

export function useConnections(username: string, kind: "followers" | "following") {
  return useInfiniteQuery({
    queryKey: keys.connections(username, kind),
    queryFn: ({ pageParam }) =>
      api.get<Page<PublicUser & { isFollowing: boolean }>>(
        pageParam
          ? `/users/${username}/${kind}?cursor=${encodeURIComponent(pageParam)}`
          : `/users/${username}/${kind}`,
      ),
    ...infiniteOpts,
  });
}

export function useReferral() {
  return useQuery({
    queryKey: keys.referral,
    queryFn: () => api.get<{ summary: ReferralSummary }>("/referrals/me").then((r) => r.summary),
  });
}

export function useWallet() {
  return useQuery({
    queryKey: keys.wallet,
    queryFn: () => api.get<{ items: WalletEntry[] }>("/referrals/me/wallet").then((r) => r.items),
  });
}

type PostPages = InfiniteData<Page<Post>>;

function patchPostEverywhere(
  qc: ReturnType<typeof useQueryClient>,
  id: string,
  patch: (p: Post) => Post,
) {
  qc.setQueriesData<PostPages>({ queryKey: ["feed"] }, (d) => mapPages(d, id, patch));
  qc.setQueriesData<PostPages>({ queryKey: ["explore"] }, (d) => mapPages(d, id, patch));
  qc.setQueriesData<PostPages>({ queryKey: ["user-posts"] }, (d) => mapPages(d, id, patch));
  qc.setQueryData<Post>(keys.post(id), (p) => (p ? patch(p) : p));
}

function mapPages(d: PostPages | undefined, id: string, patch: (p: Post) => Post) {
  if (!d) return d;
  return {
    ...d,
    pages: d.pages.map((pg) => ({
      ...pg,
      items: pg.items.map((p) => (p.id === id ? patch(p) : p)),
    })),
  };
}

export function useToggleLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, liked }: { id: string; liked: boolean }) =>
      liked
        ? api.del<{ hasLiked: boolean; likeCount: number }>(`/posts/${id}/like`)
        : api.post<{ hasLiked: boolean; likeCount: number }>(`/posts/${id}/like`),
    onMutate: async ({ id, liked }) => {
      patchPostEverywhere(qc, id, (p) => ({
        ...p,
        likeCount: Math.max(0, p.likeCount + (liked ? -1 : 1)),
        viewer: { hasLiked: !liked },
      }));
    },
    onSuccess: (res, { id }) => {
      patchPostEverywhere(qc, id, (p) => ({
        ...p,
        likeCount: res.likeCount,
        viewer: { hasLiked: res.hasLiked },
      }));
    },
    onError: (_e, { id, liked }) => {
      patchPostEverywhere(qc, id, (p) => ({
        ...p,
        likeCount: Math.max(0, p.likeCount + (liked ? 1 : -1)),
        viewer: { hasLiked: liked },
      }));
    },
  });
}

export function useToggleFollow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, following }: { id: string; username: string; following: boolean }) =>
      following
        ? api.del<{ following: boolean }>(`/users/${id}/follow`)
        : api.post<{ following: boolean }>(`/users/${id}/follow`),
    onMutate: async ({ username, following }) => {
      qc.setQueryData<Profile>(keys.profile(username), (p) =>
        p
          ? {
              ...p,
              followerCount: Math.max(0, p.followerCount + (following ? -1 : 1)),
              viewer: {
                isSelf: false,
                followsYou: p.viewer?.followsYou ?? false,
                isFollowing: !following,
              },
            }
          : p,
      );
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["profile"] });
      void qc.invalidateQueries({ queryKey: keys.feed });
      void qc.invalidateQueries({ queryKey: keys.suggested });
      void qc.invalidateQueries({ queryKey: ["connections"] });
    },
  });
}

export function useSharePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, channel }: { id: string; channel: "link" | "whatsapp" | "other" }) =>
      api.post<{ shareCount: number }>(`/posts/${id}/share`, { channel }),
    onSuccess: (res, { id }) => {
      patchPostEverywhere(qc, id, (p) => ({ ...p, shareCount: res.shareCount }));
    },
  });
}

export function useCreateComment(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      api.post<{ comment: Comment }>(`/posts/${postId}/comments`, { body }).then((r) => r.comment),
    onSuccess: (comment) => {
      qc.setQueryData<InfiniteData<Page<Comment>>>(keys.comments(postId), (d) => {
        if (!d) return d;
        const [first, ...rest] = d.pages;
        if (!first) return d;
        return { ...d, pages: [{ ...first, items: [comment, ...first.items] }, ...rest] };
      });
      patchPostEverywhere(qc, postId, (p) => ({ ...p, commentCount: p.commentCount + 1 }));
    },
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePostInput) =>
      api.post<{ post: Post }>("/posts", input).then((r) => r.post),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.feed });
      void qc.invalidateQueries({ queryKey: ["explore"] });
      void qc.invalidateQueries({ queryKey: ["user-posts"] });
      void qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<{ ok: true }>(`/posts/${id}`),
    onSuccess: (_r, id) => {
      qc.removeQueries({ queryKey: keys.post(id) });
      qc.removeQueries({ queryKey: keys.comments(id) });
      void qc.invalidateQueries({ queryKey: keys.feed });
      void qc.invalidateQueries({ queryKey: ["explore"] });
      void qc.invalidateQueries({ queryKey: ["user-posts"] });
      void qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ ok: true }>("/auth/logout"),
    onSuccess: () => {
      qc.clear();
    },
  });
}
