import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { and, desc, eq, isNull, lt, or, sql } from "drizzle-orm";
import { z } from "zod";
import { cursorSchema, FEED_PAGE_SIZE } from "@edugram/shared";
import { db, schema } from "../db/index";
import { decodeCursor, encodeCursor } from "../lib/cursor";
import { toPublicUser } from "../lib/serialize";
import { loadPosts } from "./posts";

const { posts, follows, users } = schema;

const exploreQuerySchema = cursorSchema.extend({
  tag: z.string().trim().toLowerCase().min(1).max(30).optional(),
});

export async function feedRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get(
    "/",
    { preHandler: app.requireAuth, schema: { querystring: cursorSchema } },
    async (req) => {
      const me = req.userId!;
      const limit = req.query.limit ?? FEED_PAGE_SIZE;
      const cursor = decodeCursor(req.query.cursor);

      const followed = db
        .select({ id: follows.followingId })
        .from(follows)
        .where(eq(follows.followerId, me));

      const rows = await db
        .select({ id: posts.id, createdAt: posts.createdAt })
        .from(posts)
        .where(
          and(
            isNull(posts.deletedAt),
            or(eq(posts.authorId, me), sql`${posts.authorId} in ${followed}`),
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

      const page = rows.slice(0, limit);
      const last = page[page.length - 1];
      return {
        items: await loadPosts(
          page.map((p) => p.id),
          me,
        ),
        nextCursor: rows.length > limit && last ? encodeCursor(last) : null,
      };
    },
  );

  r.get(
    "/explore",
    { preHandler: app.optionalAuth, schema: { querystring: exploreQuerySchema } },
    async (req) => {
      const limit = req.query.limit ?? FEED_PAGE_SIZE;
      const cursor = decodeCursor(req.query.cursor);
      const tag = req.query.tag;
      const rows = await db
        .select({ id: posts.id, createdAt: posts.createdAt })
        .from(posts)
        .innerJoin(users, eq(users.id, posts.authorId))
        .where(
          and(
            isNull(posts.deletedAt),
            sql`${users.onboardedAt} is not null`,
            tag ? sql`${posts.tags} @> array[${tag}]::text[]` : undefined,
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

      const page = rows.slice(0, limit);
      const last = page[page.length - 1];
      return {
        items: await loadPosts(
          page.map((p) => p.id),
          req.userId,
        ),
        nextCursor: rows.length > limit && last ? encodeCursor(last) : null,
      };
    },
  );

  r.get("/suggested", { preHandler: app.optionalAuth }, async (req) => {
    const me = req.userId;
    const rows = await db
      .select()
      .from(users)
      .where(
        and(
          sql`${users.onboardedAt} is not null`,
          me ? sql`${users.id} <> ${me}` : undefined,
          me
            ? sql`${users.id} not in (select ${follows.followingId} from ${follows} where ${follows.followerId} = ${me})`
            : undefined,
        ),
      )
      .orderBy(desc(users.followerCount), desc(users.createdAt))
      .limit(6);
    return { items: rows.map(toPublicUser) };
  });
}
