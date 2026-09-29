import { z } from "zod";

try {
  process.loadEnvFile(".env");
} catch {}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z
    .string()
    .min(1)
    .refine(
      (u) => /^(postgres(ql)?|pglite):\/\//.test(u),
      "DATABASE_URL must start with postgres:// or pglite://",
    ),
  REDIS_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(16),
  OTP_SECRET: z.string().min(8),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
  OTP_PROVIDER: z.enum(["console", "msg91"]).default("console"),
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_TEMPLATE_ID: z.string().optional(),
  TRUST_PROXY: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";

if (isProd && env.OTP_PROVIDER === "console") {
  console.error("Refusing to start: OTP_PROVIDER=console would echo codes in production");
  process.exit(1);
}
const weakSecret = (s: string) => s.length < 32 || /change-me|dev-only|secret/i.test(s);
if (isProd && (weakSecret(env.JWT_SECRET) || weakSecret(env.OTP_SECRET))) {
  console.error(
    "Refusing to start: JWT_SECRET and OTP_SECRET must be random and at least 32 characters",
  );
  process.exit(1);
}
