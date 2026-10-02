import { createHmac, timingSafeEqual } from "node:crypto";
import { env, isProd } from "../env";

export function hashOtp(phone: string, code: string): string {
  return createHmac("sha256", env.OTP_SECRET).update(`${phone}:${code}`).digest("hex");
}

export function otpMatches(phone: string, code: string, hash: string): boolean {
  const a = Buffer.from(hashOtp(phone, code));
  const b = Buffer.from(hash);
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface OtpSender {
  send(phone: string, code: string): Promise<void>;
}

const consoleSender: OtpSender = {
  async send(phone, code) {
    console.log(`\n  OTP for ${phone}: ${code}\n`);
  },
};

const msg91Sender: OtpSender = {
  async send(phone, code) {
    if (!env.MSG91_AUTH_KEY || !env.MSG91_TEMPLATE_ID) {
      throw new Error("MSG91_AUTH_KEY and MSG91_TEMPLATE_ID are required for the msg91 provider");
    }
    const res = await fetch("https://control.msg91.com/api/v5/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json", authkey: env.MSG91_AUTH_KEY },
      body: JSON.stringify({
        template_id: env.MSG91_TEMPLATE_ID,
        mobile: phone.replace("+", ""),
        otp: code,
      }),
    });
    if (!res.ok) {
      throw new Error(`MSG91 responded ${res.status}`);
    }
  },
};

export const otpSender: OtpSender = env.OTP_PROVIDER === "msg91" ? msg91Sender : consoleSender;

export const exposeOtpInResponse = !isProd && env.OTP_PROVIDER === "console";
