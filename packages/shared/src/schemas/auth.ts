import { z } from "zod";
import { INDIA_PHONE_PATTERN, OTP_LENGTH } from "../constants";

export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => {
    const digits = v.replace(/[\s-]/g, "").replace(/^\+/, "");
    return digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  })
  .pipe(z.string().regex(INDIA_PHONE_PATTERN, "Enter a valid 10-digit Indian mobile number"));

export const requestOtpSchema = z.object({
  phone: phoneSchema,
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: z.string().length(OTP_LENGTH, `Code must be ${OTP_LENGTH} digits`),
  referralCode: z.string().trim().toUpperCase().optional(),
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
