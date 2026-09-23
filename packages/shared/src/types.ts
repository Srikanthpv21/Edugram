import type { PostKind } from "./schemas/post";

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  institution: string | null;
  course: string | null;
  isVerified: boolean;
}

export interface Profile extends PublicUser {
  bio: string | null;
  graduationYear: number | null;
  followerCount: number;
  followingCount: number;
  postCount: number;
  referralCode: string | null;
  createdAt: string;
  viewer?: {
    isSelf: boolean;
    isFollowing: boolean;
    followsYou: boolean;
  };
}

export interface Post {
  id: string;
  kind: PostKind;
  caption: string;
  mediaUrls: string[];
  tags: string[];
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: string;
  author: PublicUser;
  viewer?: {
    hasLiked: boolean;
  };
}

export interface Comment {
  id: string;
  body: string;
  parentId: string | null;
  likeCount: number;
  createdAt: string;
  author: PublicUser;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface SessionUser {
  id: string;
  phone: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  onboarded: boolean;
}

export interface ReferralSummary {
  code: string;
  shareUrl: string;
  totalReferred: number;
  pendingCount: number;
  earnedPaise: number;
  balancePaise: number;
}

export interface WalletEntry {
  id: string;
  kind: "referral_reward" | "welcome_bonus" | "withdrawal" | "adjustment";
  amountPaise: number;
  note: string | null;
  createdAt: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
