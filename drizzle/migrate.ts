/**
 * Run pending Drizzle migrations
 */

import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const connectionString = process.env.DATABASE_URL || "postgresql://james:keyflow@localhost:5432/keyflow";

async function runMigrations() {
  const client = postgres(connectionString, {
    max: 1,
  });

  const db = drizzle(client);

  console.log("Running migrations...");

  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("✅ Migrations completed successfully");
    await client.end();
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigrations();