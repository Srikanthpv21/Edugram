import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { env } from "../env";
import * as schema from "./schema";

export type Db = PgDatabase<
  PgQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export const usingPglite = env.DATABASE_URL.startsWith("pglite://");

interface Connection {
  db: Db;
  close: () => Promise<void>;
  migrate: (migrationsFolder: string) => Promise<void>;
}

async function connect(): Promise<Connection> {
  if (usingPglite) {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    const dataDir = env.DATABASE_URL.replace("pglite://", "");
    const { mkdirSync } = await import("node:fs");
    mkdirSync(dataDir, { recursive: true });
    const client = new PGlite(dataDir);
    const db = drizzle(client, { schema });
    return {
      db: db as unknown as Db,
      close: () => client.close(),
      migrate: (migrationsFolder) => migrate(db, { migrationsFolder }),
    };
  }

  const { default: postgres } = await import("postgres");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  const client = postgres(env.DATABASE_URL, { max: 10, prepare: false });
  const db = drizzle(client, { schema });
  return {
    db: db as unknown as Db,
    close: () => client.end(),
    migrate: (migrationsFolder) => migrate(db, { migrationsFolder }),
  };
}

const connection = await connect();

export const db: Db = connection.db;
export const closeDb = connection.close;
export const runMigrations = connection.migrate;
export { schema };
