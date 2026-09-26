import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, precision: 3 }).notNull().defaultNow(),
};

export const postKindEnum = pgEnum("post_kind", ["image", "text"]);
export const shareChannelEnum = pgEnum("share_channel", ["link", "whatsapp", "instagram", "other"]);
export const referralStatusEnum = pgEnum("referral_status", ["pending", "completed", "rejected"]);
export const walletKindEnum = pgEnum("wallet_kind", [
  "referral_reward",
  "welcome_bonus",
  "withdrawal",
  "adjustment",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: text("phone").notNull(),
    username: text("username"),
    displayName: text("display_name"),
    bio: text("bio"),
    avatarUrl: text("avatar_url"),
    institution: text("institution"),
    course: text("course"),
    graduationYear: integer("graduation_year"),
    isVerified: boolean("is_verified").notNull().default(false),
    referralCode: text("referral_code").notNull(),
    referredById: uuid("referred_by_id"),
    followerCount: integer("follower_count").notNull().default(0),
    followingCount: integer("following_count").notNull().default(0),
    postCount: integer("post_count").notNull().default(0),
    sessionVersion: integer("session_version").notNull().default(0),
    onboardedAt: timestamp("onboarded_at", { withTimezone: true, precision: 3 }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true, precision: 3 }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("users_phone_idx").on(t.phone),
    uniqueIndex("users_username_idx").on(t.username),
    uniqueIndex("users_referral_code_idx").on(t.referralCode),
  ],
);

export const otpCodes = pgTable(
  "otp_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: text("phone").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true, precision: 3 }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true, precision: 3 }),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).notNull().defaultNow(),
  },
  (t) => [index("otp_codes_phone_idx").on(t.phone, t.createdAt)],
);

export const follows = pgTable(
  "follows",
  {
    followerId: uuid("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: uuid("following_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.followerId, t.followingId] }),
    index("follows_following_idx").on(t.followingId, t.createdAt),
  ],
);

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: postKindEnum("kind").notNull(),
    caption: text("caption").notNull().default(""),
    mediaUrls: jsonb("media_urls")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    likeCount: integer("like_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    shareCount: integer("share_count").notNull().default(0),
    deletedAt: timestamp("deleted_at", { withTimezone: true, precision: 3 }),
    ...timestamps,
  },
  (t) => [
    index("posts_author_idx").on(t.authorId, t.createdAt),
    index("posts_created_idx").on(t.createdAt),
  ],
);

export const postLikes = pgTable(
  "post_likes",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.postId, t.userId] }),
    index("post_likes_user_idx").on(t.userId, t.createdAt),
  ],
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    body: text("body").notNull(),
    likeCount: integer("like_count").notNull().default(0),
    deletedAt: timestamp("deleted_at", { withTimezone: true, precision: 3 }),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).notNull().defaultNow(),
  },
  (t) => [index("comments_post_idx").on(t.postId, t.createdAt)],
);

export const commentLikes = pgTable(
  "comment_likes",
  {
    commentId: uuid("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.commentId, t.userId] })],
);

export const shares = pgTable(
  "shares",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    channel: shareChannelEnum("channel").notNull().default("link"),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).notNull().defaultNow(),
  },
  (t) => [index("shares_post_idx").on(t.postId)],
);

export const referrals = pgTable(
  "referrals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    referrerId: uuid("referrer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    referredId: uuid("referred_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    status: referralStatusEnum("status").notNull().default("pending"),
    completedAt: timestamp("completed_at", { withTimezone: true, precision: 3 }),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("referrals_referred_idx").on(t.referredId),
    index("referrals_referrer_idx").on(t.referrerId, t.createdAt),
  ],
);

export const walletEntries = pgTable(
  "wallet_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: walletKindEnum("kind").notNull(),
    amountPaise: integer("amount_paise").notNull(),
    note: text("note"),
    referralId: uuid("referral_id").references(() => referrals.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).notNull().defaultNow(),
  },
  (t) => [index("wallet_entries_user_idx").on(t.userId, t.createdAt)],
);

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  followers: many(follows, { relationName: "following" }),
  following: many(follows, { relationName: "follower" }),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    fields: [follows.followerId],
    references: [users.id],
    relationName: "follower",
  }),
  following: one(users, {
    fields: [follows.followingId],
    references: [users.id],
    relationName: "following",
  }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
  likes: many(postLikes),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  author: one(users, { fields: [comments.authorId], references: [users.id] }),
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
}));

export type User = typeof users.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Referral = typeof referrals.$inferSelect;
export type WalletEntry = typeof walletEntries.$inferSelect;
