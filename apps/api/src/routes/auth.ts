import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { and, desc, eq, gt, isNull, lt, sql } from "drizzle-orm";
import { z } from "zod";
import {
  completeProfileSchema,
  OTP_LENGTH,
  OTP_MAX_ATTEMPTS,
  OTP_MAX_PER_HOUR,
  OTP_TTL_SECONDS,
  REFERRAL_REWARD_PAISE,
  REFERRAL_WELCOME_PAISE,
  requestOtpSchema,
  usernameSchema,
  verifyOtpSchema,
} from "@edugram/shared";
import { db, schema } from "../db/index";
import { badRequest, conflict, notFound, tooMany, unauthorized } from "../lib/errors";
import { generateOtp, generateReferralCode } from "../lib/ids";
import { exposeOtpInResponse, hashOtp, otpMatches, otpSender } from "../lib/otp";
import { toSessionUser } from "../lib/serialize";

const { users, otpCodes, referrals, walletEntries } = schema;

const toE164 = (tenDigit: string) => `+91${tenDigit}`;

async function withUsernameGuard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if ((err as { code?: string }).code === "23505") throw conflict("That username is taken");
    throw err;
  }
}

export async function authRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.post(
    "/otp/request",
    {
      schema: { body: requestOtpSchema },
      config: { rateLimit: { max: 5, timeWindow: "10 minutes" } },
    },
    async (req) => {
      const phone = toE164(req.body.phone);

      const recent = await db.query.otpCodes.findFirst({
        where: and(
          eq(otpCodes.phone, phone),
          gt(otpCodes.createdAt, new Date(Date.now() - 30_000)),
        ),
      });
      if (recent) throw tooMany("Wait 30 seconds before requesting another code");

      const [lastHour] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(otpCodes)
        .where(
          and(eq(otpCodes.phone, phone), gt(otpCodes.createdAt, new Date(Date.now() - 3_600_000))),
        );
      if ((lastHour?.n ?? 0) >= OTP_MAX_PER_HOUR) {
        throw tooMany("Too many codes sent to this number. Try again in an hour");
      }

      const code = generateOtp(OTP_LENGTH);
      await db.insert(otpCodes).values({
        phone,
        codeHash: hashOtp(phone, code),
        expiresAt: new Date(Date.now() + OTP_TTL_SECONDS * 1000),
      });
      await otpSender.send(phone, code);

      return {
        ok: true,
        expiresIn: OTP_TTL_SECONDS,
        ...(exposeOtpInResponse ? { devCode: code } : {}),
      };
    },
  );

  r.post(
    "/otp/verify",
    {
      schema: { body: verifyOtpSchema },
      config: { rateLimit: { max: 10, timeWindow: "10 minutes" } },
    },
    async (req, reply) => {
      const phone = toE164(req.body.phone);

      const otp = await db.query.otpCodes.findFirst({
        where: and(eq(otpCodes.phone, phone), isNull(otpCodes.consumedAt)),
        orderBy: desc(otpCodes.createdAt),
      });
      if (!otp || otp.expiresAt < new Date()) {
        throw badRequest("That code has expired. Request a new one");
      }
      const [claimed] = await db
        .update(otpCodes)
        .set({ attempts: sql`${otpCodes.attempts} + 1` })
        .where(and(eq(otpCodes.id, otp.id), lt(otpCodes.attempts, OTP_MAX_ATTEMPTS)))
        .returning({ id: otpCodes.id });
      if (!claimed) {
        throw tooMany("Too many attempts. Request a new code");
      }
      if (!otpMatches(phone, req.body.code, otp.codeHash)) {
        throw badRequest("That code is not right");
      }

      const result = await db.transaction(async (tx) => {
        await tx.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, otp.id));

        const existing = await tx.query.users.findFirst({ where: eq(users.phone, phone) });
        if (existing) {
          await tx.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, existing.id));
          return { user: existing, isNew: false };
        }

        let referrer: schema.User | undefined;
        if (req.body.referralCode) {
          referrer = await tx.query.users.findFirst({
            where: eq(users.referralCode, req.body.referralCode),
          });
        }

        const [created] = await tx
          .insert(users)
          .values({
            phone,
            referralCode: generateReferralCode(),
            referredById: referrer?.id ?? null,
            lastSeenAt: new Date(),
          })
          .returning();
        if (!created) throw new Error("User insert returned nothing");

        if (referrer) {
          await tx.insert(referrals).values({
            referrerId: referrer.id,
            referredId: created.id,
            code: referrer.referralCode,
          });
        }
        return { user: created, isNew: true };
      });

      app.issueSession(reply, result.user.id, result.user.sessionVersion);
      return { user: toSessionUser(result.user), isNew: result.isNew };
    },
  );

  r.post("/logout", { preHandler: app.optionalAuth }, async (req, reply) => {
    if (req.userId) {
      await db
        .update(users)
        .set({ sessionVersion: sql`${users.sessionVersion} + 1` })
        .where(eq(users.id, req.userId));
    }
    app.clearSession(reply);
    return { ok: true };
  });

  r.get("/me", { preHandler: app.optionalAuth }, async (req) => {
    if (!req.userId) return { user: null };
    const user = await db.query.users.findFirst({ where: eq(users.id, req.userId) });
    if (!user) return { user: null };
    return { user: toSessionUser(user) };
  });

  r.get(
    "/username-available",
    { schema: { querystring: z.object({ username: z.string() }) } },
    async (req) => {
      const parsed = usernameSchema.safeParse(req.query.username);
      if (!parsed.success) {
        return { available: false, reason: parsed.error.issues[0]?.message ?? "Invalid" };
      }
      const taken = await db.query.users.findFirst({
        where: eq(users.username, parsed.data),
        columns: { id: true },
      });
      return { available: !taken, reason: taken ? "That username is taken" : null };
    },
  );

  r.post(
    "/onboarding",
    { preHandler: app.requireAuth, schema: { body: completeProfileSchema } },
    async (req) => {
      const userId = req.userId!;
      const body = req.body;

      const user = await withUsernameGuard(() =>
        db.transaction(async (tx) => {
          const me = await tx.query.users.findFirst({ where: eq(users.id, userId) });
          if (!me) throw unauthorized();

          const clash = await tx.query.users.findFirst({
            where: eq(users.username, body.username),
            columns: { id: true },
          });
          if (clash && clash.id !== me.id) throw conflict("That username is taken");

          const firstTime = me.onboardedAt === null;
          const [updated] = await tx
            .update(users)
            .set({
              username: body.username,
              displayName: body.displayName,
              institution: body.institution ?? null,
              course: body.course ?? null,
              graduationYear: body.graduationYear ?? null,
              onboardedAt: me.onboardedAt ?? new Date(),
              updatedAt: new Date(),
            })
            .where(eq(users.id, me.id))
            .returning();
          if (!updated) throw notFound("User");

          if (firstTime) {
            const [ref] = await tx
              .update(referrals)
              .set({ status: "completed", completedAt: new Date() })
              .where(and(eq(referrals.referredId, me.id), eq(referrals.status, "pending")))
              .returning({ id: referrals.id, referrerId: referrals.referrerId });
            if (ref) {
              await tx.insert(walletEntries).values([
                {
                  userId: ref.referrerId,
                  kind: "referral_reward",
                  amountPaise: REFERRAL_REWARD_PAISE,
                  referralId: ref.id,
                  note: `@${updated.username} joined with your code`,
                },
                {
                  userId: me.id,
                  kind: "welcome_bonus",
                  amountPaise: REFERRAL_WELCOME_PAISE,
                  referralId: ref.id,
                  note: "Welcome bonus for joining through a friend",
                },
              ]);
            }
          }
          return updated;
        }),
      );

      return { user: toSessionUser(user) };
    },
  );
}
