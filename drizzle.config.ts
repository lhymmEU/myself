import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/modules/*/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: "./data/dashboard.db",
  },
});
