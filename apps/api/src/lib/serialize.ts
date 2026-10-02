import type { PublicUser, SessionUser } from "@edugram/shared";
import type { User } from "../db/schema";

export function toPublicUser(u: User): PublicUser {
  return {
    id: u.id,
    username: u.username ?? "",
    displayName: u.displayName ?? "",
    avatarUrl: u.avatarUrl,
    institution: u.institution,
    course: u.course,
    isVerified: u.isVerified,
  };
}

export function toSessionUser(u: User): SessionUser {
  return {
    id: u.id,
    phone: u.phone,
    username: u.username,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    onboarded: u.onboardedAt !== null,
  };
}
