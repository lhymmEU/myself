import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema/postgres/*.ts",
  out: "./drizzle/postgres",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
