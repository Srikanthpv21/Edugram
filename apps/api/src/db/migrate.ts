import { closeDb, runMigrations, usingPglite } from "./index";

await runMigrations("./drizzle");
console.log(`Migrations applied (${usingPglite ? "embedded PGlite" : "Postgres"})`);
await closeDb();
