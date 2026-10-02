import Fastify, { type FastifyError } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import {
  hasZodFastifySchemaValidationErrors,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { env, isProd } from "./env";
import { AppError } from "./lib/errors";
import authPlugin from "./plugins/auth";
import { authRoutes } from "./routes/auth";

export async function buildApp() {
  const app = Fastify({
    logger: isProd
      ? true
      : {
          transport: {
            target: "pino-pretty",
            options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" },
          },
        },
    trustProxy: env.TRUST_PROXY,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(helmet);
  await app.register(cors, {
    origin: [env.WEB_ORIGIN],
    credentials: true,
  });
  await app.register(rateLimit, {
    max: 300,
    timeWindow: "1 minute",
  });
  await app.register(authPlugin);

  app.setErrorHandler((error: FastifyError, req, reply) => {
    const err: FastifyError = error;
    if (err instanceof AppError) {
      return reply.status(err.status).send({
        error: { code: err.code, message: err.message, details: err.details },
      });
    }
    if (hasZodFastifySchemaValidationErrors(error)) {
      const first = error.validation[0];
      return reply.status(400).send({
        error: {
          code: "validation",
          message: first?.message ?? "Invalid request",
          details: error.validation.map((v) => ({
            path: v.instancePath,
            message: v.message,
          })),
        },
      });
    }
    if (typeof err.statusCode === "number" && err.statusCode < 500) {
      return reply.status(err.statusCode).send({
        error: { code: err.code ?? "request_error", message: err.message },
      });
    }
    req.log.error(err);
    return reply.status(500).send({
      error: { code: "internal", message: "Something went wrong on our side" },
    });
  });

  app.get("/health", async () => ({ ok: true, time: new Date().toISOString() }));

  await app.register(authRoutes, { prefix: "/auth" });

  return app;
}
