import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { and, desc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { z } from "zod";
import {
  COMMENTS_PAGE_SIZE,
  createCommentSchema,
  createPostSchema,
  cursorSchema,
  sharePostSchema,
  type Comment,
  type Post,
} from "@edugram/shared";
import { db, schema, type Tx } from "../db/index";
import { decodeCursor, encodeCursor } from "../lib/cursor";
import { badRequest, forbidden, notFound } from "../lib/errors";
import { toPublicUser } from "../lib/serialize";

const { users, posts, postLikes, comments, shares } = schema;

const idParam = z.object({ id: z.string().uuid() });

export async function loadPosts(ids: string[], viewerId: string | null): Promise<Post[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select({ post: posts, author: users })
    .from(posts)
    .innerJoin(users, eq(users.id, posts.authorId))
    .where(and(inArray(posts.id, ids), isNull(posts.deletedAt)));

  const liked = new Set<string>();
  if (viewerId) {
    const mine = await db
      .select({ id: postLikes.postId })
      .from(postLikes)
      .where(and(eq(postLikes.userId, viewerId), inArray(postLikes.postId, ids)));
    for (const m of mine) liked.add(m.id);
  }

  const byId = new Map(rows.map((r) => [r.post.id, r]));
  return ids
    .map((id) => byId.get(id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .map(({ post, author }) => ({
      id: post.id,
      kind: post.kind,
      caption: post.caption,
      mediaUrls: post.mediaUrls,
      tags: post.tags,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      shareCount: post.shareCount,
      createdAt: post.createdAt.toISOString(),
      author: toPublicUser(author),
      ...(viewerId ? { viewer: { hasLiked: liked.has(post.id) } } : {}),
    }));
}

async function requireLivePost(tx: Tx, id: string) {
  const post = await tx.query.posts.findFirst({
    where: and(eq(posts.id, id), isNull(posts.deletedAt)),
    columns: { id: true },
  });
  if (!post) throw notFound("Post");
  return post;
}

export async function postRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.post(
    "/",
    { preHandler: app.requireOnboarded, schema: { body: createPostSchema } },
    async (req) => {
      const me = req.userId!;
      const created = await db.transaction(async (tx) => {
        const [post] = await tx
          .insert(posts)
          .values({
            authorId: me,
            kind: req.body.kind,
            caption: req.body.caption,
            mediaUrls: req.body.mediaUrls,
            tags: req.body.tags,
          })
          .returning({ id: posts.id });
        await tx
          .update(users)
          .set({ postCount: sql`${users.postCount} + 1` })
          .where(eq(users.id, me));
        return post!;
      });
      const [post] = await loadPosts([created.id], me);
      return { post };
    },
  );

  r.get("/:id", { preHandler: app.optionalAuth, schema: { params: idParam } }, async (req) => {
    const [post] = await loadPosts([req.params.id], req.userId);
    if (!post) throw notFound("Post");
    return { post };
  });

  r.delete("/:id", { preHandler: app.requireAuth, schema: { params: idParam } }, async (req) => {
    const me = req.userId!;
    const post = await db.query.posts.findFirst({
      where: and(eq(posts.id, req.params.id), isNull(posts.deletedAt)),
    });
    if (!post) throw notFound("Post");
    if (post.authorId !== me) throw forbidden();
    await db.transaction(async (tx) => {
      await tx.update(posts).set({ deletedAt: new Date() }).where(eq(posts.id, post.id));
      await tx
        .update(users)
        .set({ postCount: sql`greatest(${users.postCount} - 1, 0)` })
        .where(eq(users.id, me));
    });
    return { ok: true };
  });

  r.post(
    "/:id/like",
    { preHandler: app.requireOnboarded, schema: { params: idParam } },
    async (req) => {
      const me = req.userId!;
      const likeCount = await db.transaction(async (tx) => {
        await requireLivePost(tx, req.params.id);
        const inserted = await tx
          .insert(postLikes)
          .values({ postId: req.params.id, userId: me })
          .onConflictDoNothing()
          .returning({ postId: postLikes.postId });
        if (inserted.length) {
          await tx
            .update(posts)
            .set({ likeCount: sql`${posts.likeCount} + 1` })
            .where(eq(posts.id, req.params.id));
        }
        const row = await tx.query.posts.findFirst({
          where: eq(posts.id, req.params.id),
          columns: { likeCount: true },
        });
        if (!row) throw notFound("Post");
        return row.likeCount;
      });
      return { hasLiked: true, likeCount };
    },
  );

  r.delete(
    "/:id/like",
    { preHandler: app.requireOnboarded, schema: { params: idParam } },
    async (req) => {
      const me = req.userId!;
      const likeCount = await db.transaction(async (tx) => {
        await requireLivePost(tx, req.params.id);
        const deleted = await tx
          .delete(postLikes)
          .where(and(eq(postLikes.postId, req.params.id), eq(postLikes.userId, me)))
          .returning({ postId: postLikes.postId });
        if (deleted.length) {
          await tx
            .update(posts)
            .set({ likeCount: sql`greatest(${posts.likeCount} - 1, 0)` })
            .where(eq(posts.id, req.params.id));
        }
        const row = await tx.query.posts.findFirst({
          where: eq(posts.id, req.params.id),
          columns: { likeCount: true },
        });
        if (!row) throw notFound("Post");
        return row.likeCount;
      });
      return { hasLiked: false, likeCount };
    },
  );

  r.post(
    "/:id/share",
    { preHandler: app.requireOnboarded, schema: { params: idParam, body: sharePostSchema } },
    async (req) => {
      const me = req.userId!;
      const shareCount = await db.transaction(async (tx) => {
        await requireLivePost(tx, req.params.id);
        const already = await tx.query.shares.findFirst({
          where: and(eq(shares.postId, req.params.id), eq(shares.userId, me)),
          columns: { id: true },
        });
        await tx.insert(shares).values({
          postId: req.params.id,
          userId: me,
          channel: req.body.channel,
        });
        if (!already) {
          await tx
            .update(posts)
            .set({ shareCount: sql`${posts.shareCount} + 1` })
            .where(eq(posts.id, req.params.id));
        }
        const row = await tx.query.posts.findFirst({
          where: eq(posts.id, req.params.id),
          columns: { shareCount: true },
        });
        if (!row) throw notFound("Post");
        return row.shareCount;
      });
      return { shareCount };
    },
  );

  r.get(
    "/:id/comments",
    { preHandler: app.optionalAuth, schema: { params: idParam, querystring: cursorSchema } },
    async (req) => {
      const limit = req.query.limit ?? COMMENTS_PAGE_SIZE;
      const cursor = decodeCursor(req.query.cursor);
      const exists = await db.query.posts.findFirst({
        where: and(eq(posts.id, req.params.id), isNull(posts.deletedAt)),
        columns: { id: true },
      });
      if (!exists) throw notFound("Post");
      const rows = await db
        .select({ comment: comments, author: users })
        .from(comments)
        .innerJoin(users, eq(users.id, comments.authorId))
        .where(
          and(
            eq(comments.postId, req.params.id),
            isNull(comments.deletedAt),
            cursor
              ? or(
                  lt(comments.createdAt, cursor.createdAt),
                  and(eq(comments.createdAt, cursor.createdAt), lt(comments.id, cursor.id)),
                )
              : undefined,
          ),
        )
        .orderBy(desc(comments.createdAt), desc(comments.id))
        .limit(limit + 1);

      const page = rows.slice(0, limit);
      const last = page[page.length - 1];
      const items: Comment[] = page.map(({ comment, author }) => ({
        id: comment.id,
        body: comment.body,
        parentId: comment.parentId,
        likeCount: comment.likeCount,
        createdAt: comment.createdAt.toISOString(),
        author: toPublicUser(author),
      }));
      return {
        items,
        nextCursor:
          rows.length > limit && last
            ? encodeCursor({ createdAt: last.comment.createdAt, id: last.comment.id })
            : null,
      };
    },
  );

  r.post(
    "/:id/comments",
    { preHandler: app.requireOnboarded, schema: { params: idParam, body: createCommentSchema } },
    async (req) => {
      const me = req.userId!;
      const comment = await db.transaction(async (tx) => {
        const post = await tx.query.posts.findFirst({
          where: and(eq(posts.id, req.params.id), isNull(posts.deletedAt)),
          columns: { id: true },
        });
        if (!post) throw notFound("Post");
        if (req.body.parentId) {
          const parent = await tx.query.comments.findFirst({
            where: and(
              eq(comments.id, req.body.parentId),
              eq(comments.postId, post.id),
              isNull(comments.deletedAt),
            ),
            columns: { id: true },
          });
          if (!parent) throw badRequest("That comment no longer exists");
        }
        const [row] = await tx
          .insert(comments)
          .values({
            postId: post.id,
            authorId: me,
            body: req.body.body,
            parentId: req.body.parentId ?? null,
          })
          .returning();
        await tx
          .update(posts)
          .set({ commentCount: sql`${posts.commentCount} + 1` })
          .where(eq(posts.id, post.id));
        return row!;
      });
      const author = await db.query.users.findFirst({ where: eq(users.id, me) });
      const out: Comment = {
        id: comment.id,
        body: comment.body,
        parentId: comment.parentId,
        likeCount: 0,
        createdAt: comment.createdAt.toISOString(),
        author: toPublicUser(author!),
      };
      return { comment: out };
    },
  );

  r.delete(
    "/comments/:id",
    { preHandler: app.requireAuth, schema: { params: idParam } },
    async (req) => {
      const me = req.userId!;
      const comment = await db.query.comments.findFirst({
        where: and(eq(comments.id, req.params.id), isNull(comments.deletedAt)),
      });
      if (!comment) throw notFound("Comment");
      if (comment.authorId !== me) throw forbidden();
      await db.transaction(async (tx) => {
        await tx.update(comments).set({ deletedAt: new Date() }).where(eq(comments.id, comment.id));
        await tx
          .update(posts)
          .set({ commentCount: sql`greatest(${posts.commentCount} - 1, 0)` })
          .where(eq(posts.id, comment.postId));
      });
      return { ok: true };
    },
  );
}
