import { buildApp } from "./app";
import { env } from "./env";
import { closeDb, runMigrations, usingPglite } from "./db/index";

await runMigrations("./drizzle");

const app = await buildApp();
app.log.info({ database: usingPglite ? "embedded PGlite" : "Postgres" }, "migrations applied");

const shutdown = async (signal: string) => {
  app.log.info({ signal }, "shutting down");
  await app.close();
  await closeDb();
  process.exit(0);
};
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

try {
  await app.listen({ port: env.PORT, host: env.HOST });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
