import type { Config } from "drizzle-kit";

export default {
  schema: "./src/backend/models/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://james:keyflow@localhost:5432/keyflow",
  },
} satisfies Config;