import { z } from "zod";
import {
  BIO_MAX,
  DISPLAY_NAME_MAX,
  RESERVED_USERNAMES,
  USERNAME_MAX,
  USERNAME_MIN,
  USERNAME_PATTERN,
} from "../constants";
import { httpsUrlSchema } from "./common";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(USERNAME_MIN, `At least ${USERNAME_MIN} characters`)
  .max(USERNAME_MAX, `At most ${USERNAME_MAX} characters`)
  .regex(USERNAME_PATTERN, "Only lowercase letters, numbers, dots and underscores")
  .refine((u) => !RESERVED_USERNAMES.has(u), "That username is reserved");

export const completeProfileSchema = z.object({
  username: usernameSchema,
  displayName: z.string().trim().min(1, "Enter your name").max(DISPLAY_NAME_MAX),
  institution: z.string().trim().max(80).nullable().optional(),
  course: z.string().trim().max(80).nullable().optional(),
  graduationYear: z.number().int().min(2000).max(2040).nullable().optional(),
});

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(DISPLAY_NAME_MAX).optional(),
  bio: z.string().trim().max(BIO_MAX).optional(),
  institution: z.string().trim().max(80).nullable().optional(),
  course: z.string().trim().max(80).nullable().optional(),
  graduationYear: z.number().int().min(2000).max(2040).nullable().optional(),
  avatarUrl: httpsUrlSchema.nullable().optional(),
});

export type CompleteProfileInput = z.infer<typeof completeProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
