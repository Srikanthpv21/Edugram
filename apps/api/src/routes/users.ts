import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { and, desc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { z } from "zod";
import {
  cursorSchema,
  FEED_PAGE_SIZE,
  updateProfileSchema,
  type Page,
  type Profile,
  type PublicUser,
} from "@edugram/shared";
import { db, schema } from "../db/index";
import { decodeCursor, encodeCursor } from "../lib/cursor";
import { badRequest, notFound } from "../lib/errors";
import { toPublicUser } from "../lib/serialize";
import { loadPosts } from "./posts";

const { users, follows, posts } = schema;

const usernameParam = z.object({ username: z.string().min(1) });
const idParam = z.object({ id: z.string().uuid() });

async function buildProfile(user: schema.User, viewerId: string | null): Promise<Profile> {
  const profile: Profile = {
    ...toPublicUser(user),
    bio: user.bio,
    graduationYear: user.graduationYear,
    followerCount: user.followerCount,
    followingCount: user.followingCount,
    postCount: user.postCount,
    referralCode: viewerId === user.id ? user.referralCode : null,
    createdAt: user.createdAt.toISOString(),
  };
  if (viewerId) {
    const [out, back] = await Promise.all([
      db.query.follows.findFirst({
        where: and(eq(follows.followerId, viewerId), eq(follows.followingId, user.id)),
      }),
      db.query.follows.findFirst({
        where: and(eq(follows.followerId, user.id), eq(follows.followingId, viewerId)),
      }),
    ]);
    profile.viewer = {
      isSelf: viewerId === user.id,
      isFollowing: Boolean(out),
      followsYou: Boolean(back),
    };
  }
  return profile;
}

export async function userRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get(
    "/:username",
    { preHandler: app.optionalAuth, schema: { params: usernameParam } },
    async (req) => {
      const user = await db.query.users.findFirst({
        where: eq(users.username, req.params.username.toLowerCase()),
      });
      if (!user || !user.onboardedAt) throw notFound("Profile");
      return { profile: await buildProfile(user, req.userId) };
    },
  );

  r.patch(
    "/me",
    { preHandler: app.requireAuth, schema: { body: updateProfileSchema } },
    async (req) => {
      const [updated] = await db
        .update(users)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(users.id, req.userId!))
        .returning();
      if (!updated) throw notFound("User");
      return { profile: await buildProfile(updated, req.userId) };
    },
  );

  r.get(
    "/:username/posts",
    { preHandler: app.optionalAuth, schema: { params: usernameParam, querystring: cursorSchema } },
    async (req) => {
      const user = await db.query.users.findFirst({
        where: eq(users.username, req.params.username.toLowerCase()),
        columns: { id: true },
      });
      if (!user) throw notFound("Profile");

      const limit = req.query.limit ?? FEED_PAGE_SIZE;
      const cursor = decodeCursor(req.query.cursor);
      const rows = await db
        .select({ id: posts.id, createdAt: posts.createdAt })
        .from(posts)
        .where(
          and(
            eq(posts.authorId, user.id),
            isNull(posts.deletedAt),
            cursor
              ? or(
                  lt(posts.createdAt, cursor.createdAt),
                  and(eq(posts.createdAt, cursor.createdAt), lt(posts.id, cursor.id)),
                )
              : undefined,
          ),
        )
        .orderBy(desc(posts.createdAt), desc(posts.id))
        .limit(limit + 1);

      const pageRows = rows.slice(0, limit);
      const last = pageRows[pageRows.length - 1];
      const items = await loadPosts(
        pageRows.map((p) => p.id),
        req.userId,
      );
      return {
        items,
        nextCursor: rows.length > limit && last ? encodeCursor(last) : null,
      };
    },
  );

  r.post(
    "/:id/follow",
    { preHandler: app.requireOnboarded, schema: { params: idParam } },
    async (req) => {
      const me = req.userId!;
      const target = req.params.id;
      if (me === target) throw badRequest("You cannot follow yourself");

      const exists = await db.query.users.findFirst({
        where: eq(users.id, target),
        columns: { id: true },
      });
      if (!exists) throw notFound("User");

      await db.transaction(async (tx) => {
        const inserted = await tx
          .insert(follows)
          .values({ followerId: me, followingId: target })
          .onConflictDoNothing()
          .returning({ followerId: follows.followerId });
        if (inserted.length === 0) return;
        await tx
          .update(users)
          .set({ followingCount: sql`${users.followingCount} + 1` })
          .where(eq(users.id, me));
        await tx
          .update(users)
          .set({ followerCount: sql`${users.followerCount} + 1` })
          .where(eq(users.id, target));
      });
      return { following: true };
    },
  );

  r.delete(
    "/:id/follow",
    { preHandler: app.requireOnboarded, schema: { params: idParam } },
    async (req) => {
      const me = req.userId!;
      const target = req.params.id;
      await db.transaction(async (tx) => {
        const deleted = await tx
          .delete(follows)
          .where(and(eq(follows.followerId, me), eq(follows.followingId, target)))
          .returning({ followerId: follows.followerId });
        if (deleted.length === 0) return;
        await tx
          .update(users)
          .set({ followingCount: sql`greatest(${users.followingCount} - 1, 0)` })
          .where(eq(users.id, me));
        await tx
          .update(users)
          .set({ followerCount: sql`greatest(${users.followerCount} - 1, 0)` })
          .where(eq(users.id, target));
      });
      return { following: false };
    },
  );

  const listConnections = async (
    username: string,
    direction: "followers" | "following",
    viewerId: string | null,
    cursorRaw: string | undefined,
    limit: number,
  ): Promise<Page<PublicUser & { isFollowing: boolean }>> => {
    const user = await db.query.users.findFirst({
      where: eq(users.username, username.toLowerCase()),
      columns: { id: true },
    });
    if (!user) throw notFound("Profile");

    const cursor = decodeCursor(cursorRaw);
    const joinCol = direction === "followers" ? follows.followerId : follows.followingId;
    const whereCol = direction === "followers" ? follows.followingId : follows.followerId;

    const rows = await db
      .select({ user: users, followedAt: follows.createdAt })
      .from(follows)
      .innerJoin(users, eq(users.id, joinCol))
      .where(
        and(
          eq(whereCol, user.id),
          cursor
            ? or(
                lt(follows.createdAt, cursor.createdAt),
                and(eq(follows.createdAt, cursor.createdAt), lt(users.id, cursor.id)),
              )
            : undefined,
        ),
      )
      .orderBy(desc(follows.createdAt), desc(users.id))
      .limit(limit + 1);

    const page = rows.slice(0, limit);
    const ids = page.map((x) => x.user.id);
    const viewerFollowing = new Set<string>();
    if (viewerId && ids.length) {
      const mine = await db
        .select({ id: follows.followingId })
        .from(follows)
        .where(and(eq(follows.followerId, viewerId), inArray(follows.followingId, ids)));
      for (const m of mine) viewerFollowing.add(m.id);
    }
    const last = page[page.length - 1];
    return {
      items: page.map((x) => ({
        ...toPublicUser(x.user),
        isFollowing: viewerFollowing.has(x.user.id),
      })),
      nextCursor:
        rows.length > limit && last
          ? encodeCursor({ createdAt: last.followedAt, id: last.user.id })
          : null,
    };
  };

  r.get(
    "/:username/followers",
    { preHandler: app.optionalAuth, schema: { params: usernameParam, querystring: cursorSchema } },
    async (req) =>
      listConnections(
        req.params.username,
        "followers",
        req.userId,
        req.query.cursor,
        req.query.limit ?? 30,
      ),
  );

  r.get(
    "/:username/following",
    { preHandler: app.optionalAuth, schema: { params: usernameParam, querystring: cursorSchema } },
    async (req) =>
      listConnections(
        req.params.username,
        "following",
        req.userId,
        req.query.cursor,
        req.query.limit ?? 30,
      ),
  );

  r.get(
    "/",
    {
      preHandler: app.optionalAuth,
      schema: { querystring: z.object({ q: z.string().min(1).max(40) }) },
    },
    async (req) => {
      const q = `%${req.query.q.toLowerCase().replace(/[\\%_]/g, "\\$&")}%`;
      const rows = await db
        .select()
        .from(users)
        .where(
          and(
            sql`${users.onboardedAt} is not null`,
            or(sql`${users.username} like ${q}`, sql`lower(${users.displayName}) like ${q}`),
          ),
        )
        .orderBy(desc(users.followerCount))
        .limit(20);
      return { items: rows.map(toPublicUser) };
    },
  );
}
