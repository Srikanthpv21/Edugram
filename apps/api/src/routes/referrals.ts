import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { desc, eq, sql } from "drizzle-orm";
import type { ReferralSummary, WalletEntry } from "@edugram/shared";
import { db, schema } from "../db/index";
import { env } from "../env";
import { notFound } from "../lib/errors";
import { toPublicUser } from "../lib/serialize";

const { users, referrals, walletEntries } = schema;

export async function referralRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get("/me", { preHandler: app.requireAuth }, async (req) => {
    const me = req.userId!;
    const user = await db.query.users.findFirst({ where: eq(users.id, me) });
    if (!user) throw notFound("User");

    const [counts] = await db
      .select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`count(*) filter (where ${referrals.status} = 'pending')::int`,
      })
      .from(referrals)
      .where(eq(referrals.referrerId, me));

    const [wallet] = await db
      .select({
        earned: sql<number>`coalesce(sum(${walletEntries.amountPaise}) filter (where ${walletEntries.amountPaise} > 0), 0)::int`,
        balance: sql<number>`coalesce(sum(${walletEntries.amountPaise}), 0)::int`,
      })
      .from(walletEntries)
      .where(eq(walletEntries.userId, me));

    const summary: ReferralSummary = {
      code: user.referralCode,
      shareUrl: `${env.WEB_ORIGIN}/join?ref=${user.referralCode}`,
      totalReferred: counts?.total ?? 0,
      pendingCount: counts?.pending ?? 0,
      earnedPaise: wallet?.earned ?? 0,
      balancePaise: wallet?.balance ?? 0,
    };
    return { summary };
  });

  r.get("/me/people", { preHandler: app.requireAuth }, async (req) => {
    const rows = await db
      .select({ referral: referrals, user: users })
      .from(referrals)
      .innerJoin(users, eq(users.id, referrals.referredId))
      .where(eq(referrals.referrerId, req.userId!))
      .orderBy(desc(referrals.createdAt))
      .limit(100);
    return {
      items: rows.map(({ referral, user }) => ({
        id: referral.id,
        status: referral.status,
        joinedAt: referral.createdAt.toISOString(),
        completedAt: referral.completedAt?.toISOString() ?? null,
        user: toPublicUser(user),
      })),
    };
  });

  r.get("/me/wallet", { preHandler: app.requireAuth }, async (req) => {
    const rows = await db
      .select()
      .from(walletEntries)
      .where(eq(walletEntries.userId, req.userId!))
      .orderBy(desc(walletEntries.createdAt))
      .limit(100);
    const items: WalletEntry[] = rows.map((w) => ({
      id: w.id,
      kind: w.kind,
      amountPaise: w.amountPaise,
      note: w.note,
      createdAt: w.createdAt.toISOString(),
    }));
    return { items };
  });
}
