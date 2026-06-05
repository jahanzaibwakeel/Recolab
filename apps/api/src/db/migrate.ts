import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool, query } from "./pool.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));

async function ensureMigrationTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

export async function migrate() {
  await ensureMigrationTable();
  const migrationDir = path.join(dirname, "migrations");
  const files = (await readdir(migrationDir)).filter((file) => file.endsWith(".sql")).sort();

  for (const file of files) {
    const applied = await query("SELECT 1 FROM schema_migrations WHERE filename = $1", [file]);
    if (applied.rowCount) continue;
    const sql = await readFile(path.join(migrationDir, file), "utf8");
    await query("BEGIN");
    try {
      await query(sql);
      await query("INSERT INTO schema_migrations(filename) VALUES ($1)", [file]);
      await query("COMMIT");
      console.log(`applied ${file}`);
    } catch (error) {
      await query("ROLLBACK");
      throw error;
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrate().finally(() => pool.end());
}

