import { z } from "zod";
import { REFERRAL_CODE_LENGTH } from "../constants";

export const referralCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .length(REFERRAL_CODE_LENGTH, "Invalid referral code");

export const applyReferralSchema = z.object({
  code: referralCodeSchema,
});

export type ApplyReferralInput = z.infer<typeof applyReferralSchema>;
