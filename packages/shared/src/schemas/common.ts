import { z } from "zod";

export const httpsUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .url("Enter a valid link")
  .refine((u) => u.toLowerCase().startsWith("https://"), "Only https links are allowed");
