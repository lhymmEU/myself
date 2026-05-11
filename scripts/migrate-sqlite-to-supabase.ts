/**
 * One-off migration: legacy SQLite `data/dashboard.db` (+ optional `data/wiki/`)
 * → Supabase Postgres for a **single** target user.
 *
 * Environment:
 *   DATABASE_URL          — Supabase Postgres connection string (service role or bypass RLS user recommended).
 *   TARGET_USER_ID        — `auth.users.id` (uuid) to own imported rows.
 *   SQLITE_DASHBOARD      — path to dashboard.db (default: ./data/dashboard.db)
 *   SQLITE_VAULT          — optional path to vault.db (imports vault_meta + vault_secrets)
 *   WIKI_DIR              — optional path to wiki root (default: ./data/wiki) — imports *.md as wiki_pages
 *
 * Run: `TARGET_USER_ID=... DATABASE_URL=... tsx scripts/migrate-sqlite-to-supabase.ts`
 *
 * This script does **not** create the Supabase user. Sign up first, then copy your uuid.
 */
import fs from "fs";
import path from "path";
import postgres from "postgres";

const TARGET = process.env.TARGET_USER_ID?.trim();
const DATABASE_URL = process.env.DATABASE_URL;
const SQLITE_DASH =
  process.env.SQLITE_DASHBOARD ?? path.join(process.cwd(), "data", "dashboard.db");
const SQLITE_VAULT =
  process.env.SQLITE_VAULT ?? path.join(process.cwd(), "data", "vault.db");
const WIKI_DIR = process.env.WIKI_DIR ?? path.join(process.cwd(), "data", "wiki");

function requireEnv(): { sql: postgres.Sql; userId: string } {
  if (!DATABASE_URL) throw new Error("DATABASE_URL is required");
  if (!TARGET) throw new Error("TARGET_USER_ID is required (uuid)");
  return { sql: postgres(DATABASE_URL, { prepare: false, max: 1 }), userId: TARGET };
}

async function migrateSettings(
  sqlite: import("better-sqlite3").Database,
  sql: postgres.Sql,
  userId: string,
): Promise<number> {
  const rows = sqlite
    .prepare("SELECT key, value FROM settings WHERE user_id = ?")
    .all("local-user") as { key: string; value: string }[];
  let n = 0;
  const now = Date.now();
  for (const r of rows) {
    await sql`
      INSERT INTO settings (user_id, key, value, updated_at)
      VALUES (${userId}::uuid, ${r.key}, ${r.value}, ${now})
      ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
    `;
    n++;
  }
  return n;
}

async function migrateWikiDir(sql: postgres.Sql, userId: string): Promise<number> {
  if (!fs.existsSync(WIKI_DIR)) return 0;
  const files: { slug: string; markdown: string }[] = [];
  const now = Date.now();
  function walk(dir: string, rel: string) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      const slug = rel ? `${rel}/${ent.name}` : ent.name;
      if (ent.isDirectory()) {
        walk(full, slug);
      } else if (ent.name.endsWith(".md")) {
        const slugKey = slug.replace(/\.md$/i, "");
        files.push({ slug: slugKey, markdown: fs.readFileSync(full, "utf-8") });
      }
    }
  }
  walk(WIKI_DIR, "");
  for (const f of files) {
    await sql`
      INSERT INTO wiki_pages (user_id, slug, markdown, updated_at)
      VALUES (${userId}::uuid, ${f.slug}, ${f.markdown}, ${now})
      ON CONFLICT (user_id, slug) DO UPDATE SET markdown = EXCLUDED.markdown, updated_at = EXCLUDED.updated_at
    `;
  }
  return files.length;
}

async function main() {
  const { sql, userId } = requireEnv();
  /* eslint-disable @typescript-eslint/no-require-imports */
  const Database = require("better-sqlite3") as typeof import("better-sqlite3");
  /* eslint-enable @typescript-eslint/no-require-imports */

  if (!fs.existsSync(SQLITE_DASH)) {
    throw new Error(`SQLite file not found: ${SQLITE_DASH}`);
  }
  const sqlite = new Database(SQLITE_DASH, { readonly: true });

  const settingsCount = await migrateSettings(sqlite, sql, userId);
  console.log(`settings rows upserted: ${settingsCount}`);

  sqlite.close();

  const wikiCount = await migrateWikiDir(sql, userId);
  console.log(`wiki_pages upserted from disk: ${wikiCount}`);

  if (fs.existsSync(SQLITE_VAULT)) {
    const vdb = new Database(SQLITE_VAULT, { readonly: true });
    const meta = vdb
      .prepare("SELECT key, value FROM vault_meta WHERE user_id = ?")
      .all("local-user") as { key: string; value: string }[];
    for (const m of meta) {
      await sql`
        INSERT INTO vault_meta (user_id, key, value)
        VALUES (${userId}::uuid, ${m.key}, ${m.value})
        ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value
      `;
    }
    const secrets = vdb
      .prepare(
        "SELECT id, name, category, encrypted_value, nonce, encrypted_notes, notes_nonce, tags, created_at, updated_at FROM vault_secrets WHERE user_id = ?",
      )
      .all("local-user") as Record<string, unknown>[];
    for (const s of secrets) {
      await sql`
        INSERT INTO vault_secrets (id, user_id, name, category, encrypted_value, nonce, encrypted_notes, notes_nonce, tags, created_at, updated_at)
        VALUES (
          ${String(s.id)},
          ${userId}::uuid,
          ${String(s.name)},
          ${String(s.category ?? "other")},
          ${String(s.encrypted_value)},
          ${String(s.nonce)},
          ${s.encrypted_notes == null ? null : String(s.encrypted_notes)},
          ${s.notes_nonce == null ? null : String(s.notes_nonce)},
          ${String(s.tags ?? "[]")},
          ${Number(s.created_at)},
          ${Number(s.updated_at)}
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }
    vdb.close();
    console.log(`vault: ${meta.length} meta rows, ${secrets.length} secrets attempted`);
  }

  await sql.end({ timeout: 5 });
  console.log("Done. Verify rows in Supabase for this user.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
