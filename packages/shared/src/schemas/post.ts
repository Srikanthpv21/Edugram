import { z } from "zod";
import { CAPTION_MAX, COMMENT_MAX, POST_MAX_IMAGES } from "../constants";
import { httpsUrlSchema } from "./common";

export const postKindSchema = z.enum(["image", "text"]);

export const createPostSchema = z
  .object({
    kind: postKindSchema,
    caption: z.string().trim().max(CAPTION_MAX).default(""),
    mediaUrls: z.array(httpsUrlSchema).max(POST_MAX_IMAGES).default([]),
    tags: z
      .array(
        z
          .string()
          .trim()
          .toLowerCase()
          .max(30)
          .regex(/^[a-z0-9_]+$/, "Tags can only use letters, numbers and underscores"),
      )
      .max(10)
      .default([]),
  })
  .refine((p) => (p.kind === "image" ? p.mediaUrls.length > 0 : p.caption.length > 0), {
    message: "Add an image or write something",
  });

export const createCommentSchema = z.object({
  body: z.string().trim().min(1, "Write a comment").max(COMMENT_MAX),
  parentId: z.string().uuid().optional(),
});

export const cursorSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export type PostKind = z.infer<typeof postKindSchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type CursorInput = z.infer<typeof cursorSchema>;
