import fp from "fastify-plugin";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/index";
import { env, isProd } from "../env";
import { forbidden, unauthorized } from "../lib/errors";

export const SESSION_COOKIE = "edugram_session";
const SESSION_DAYS = 30;

interface SessionPayload {
  sub: string;
  v: number;
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: SessionPayload;
    user: SessionPayload;
  }
}

declare module "fastify" {
  interface FastifyRequest {
    userId: string | null;
    onboarded: boolean;
  }
  interface FastifyInstance {
    requireAuth: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireOnboarded: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    optionalAuth: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    issueSession: (reply: FastifyReply, userId: string, sessionVersion: number) => string;
    clearSession: (reply: FastifyReply) => void;
  }
}

async function resolveSession(req: FastifyRequest): Promise<boolean> {
  let payload: SessionPayload;
  try {
    payload = await req.jwtVerify<SessionPayload>();
  } catch {
    return false;
  }
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, payload.sub),
    columns: { id: true, sessionVersion: true, onboardedAt: true },
  });
  if (!user || user.sessionVersion !== payload.v) return false;
  req.userId = user.id;
  req.onboarded = user.onboardedAt !== null;
  return true;
}

async function authPlugin(app: FastifyInstance) {
  await app.register(cookie);
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    cookie: { cookieName: SESSION_COOKIE, signed: false },
    sign: { expiresIn: `${SESSION_DAYS}d` },
  });

  app.decorateRequest("userId", null);
  app.decorateRequest("onboarded", false);

  app.decorate("optionalAuth", async (req: FastifyRequest) => {
    const ok = await resolveSession(req);
    if (!ok) {
      req.userId = null;
      req.onboarded = false;
    }
  });

  app.decorate("requireAuth", async (req: FastifyRequest) => {
    const ok = await resolveSession(req);
    if (!ok) throw unauthorized();
  });

  app.decorate("requireOnboarded", async (req: FastifyRequest) => {
    const ok = await resolveSession(req);
    if (!ok) throw unauthorized();
    if (!req.onboarded) throw forbidden("Finish setting up your profile first");
  });

  app.decorate("issueSession", (reply: FastifyReply, userId: string, sessionVersion: number) => {
    const token = app.jwt.sign({ sub: userId, v: sessionVersion });
    reply.setCookie(SESSION_COOKIE, token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      maxAge: SESSION_DAYS * 24 * 60 * 60,
    });
    return token;
  });

  app.decorate("clearSession", (reply: FastifyReply) => {
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
  });
}

export default fp(authPlugin, { name: "auth" });
