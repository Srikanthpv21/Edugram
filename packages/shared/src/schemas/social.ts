import { z } from "zod";

export const shareChannelSchema = z.enum(["link", "whatsapp", "instagram", "other"]);

export const sharePostSchema = z.object({
  channel: shareChannelSchema.default("link"),
});

export type ShareChannel = z.infer<typeof shareChannelSchema>;
export type SharePostInput = z.infer<typeof sharePostSchema>;
