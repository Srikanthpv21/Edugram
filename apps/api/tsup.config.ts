import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts", "src/db/migrate.ts"],
  format: ["esm"],
  target: "node22",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  noExternal: ["@edugram/shared"],
});
