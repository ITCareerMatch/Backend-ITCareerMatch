/**
 * Migration Runner
 * Standalone script untuk menjalankan database migrations
 * Usage: node src/migrations/runner.js
 */

import pool from "../config/db.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not configured in .env");
  process.exit(1);
}

/**
 * Load and execute all migration files
 */
async function runMigrations() {
  console.log("🔄 Running migrations...\n");

  const migrationsDir = __dirname;
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.match(/^\d+_.*\.js$/))
    .sort();

  if (migrationFiles.length === 0) {
    console.log("✅ No migrations to run");
    process.exit(0);
  }

  let migrationsRun = 0;

  for (const file of migrationFiles) {
    try {
      const migrationPath = path.join(migrationsDir, file);
      const migration = await import(`file://${migrationPath}`);

      console.log(`⏳ Running: ${file}`);

      if (typeof migration.upWithPool === "function") {
        await migration.upWithPool(pool);
        console.log(`✓ Migration: ${file}\n`);
        migrationsRun++;
      } else {
        console.warn(`⚠️  No 'upWithPool' function in ${file}\n`);
      }
    } catch (error) {
      console.error(`❌ Migration failed: ${file}`);
      console.error(error.message);
      process.exit(1);
    }
  }

  console.log(
    `✅ All migrations completed successfully (${migrationsRun} migrations)\n`,
  );
  await pool.end();
  process.exit(0);
}

// Run migrations
runMigrations().catch((error) => {
  console.error("❌ Migration error:", error);
  process.exit(1);
});
