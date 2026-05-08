/**
 * Removes the smoke seeds from data/dashboard.db and optional legacy
 * data/wiki/dashboard.json so the dashboard starts clean. Safe to re-run.
 */
import fs from "fs";
import { initDatabase } from "../lib/core/init-db";
import { getDb } from "../lib/db";
import { dashboardCards, cardDismissals } from "../lib/db/schema/sqlite/insights";
import { eq, and, like } from "drizzle-orm";
import { ensureVault } from "../lib/modules/dashboard/wiki-vault";

async function main() {
  process.env.NEXT_PUBLIC_DEPLOYMENT_MODE = "local";
  process.env.DEPLOYMENT_MODE = "local";
  initDatabase();
  const db = getDb();
  const ids = ["smoke-card-1", "smoke-card-2"];
  for (const id of ids) {
    await db
      .delete(dashboardCards)
      .where(
        and(
          eq(dashboardCards.id, id),
          eq(dashboardCards.userId, "local-user"),
        ),
      );
    await db
      .delete(cardDismissals)
      .where(
        and(
          eq(cardDismissals.cardId, id),
          eq(cardDismissals.userId, "local-user"),
        ),
      );
  }
  await db.delete(dashboardCards).where(like(dashboardCards.id, "smoke-%"));

  const paths = ensureVault();
  if (paths?.dashboardJson && fs.existsSync(paths.dashboardJson)) {
    try {
      fs.unlinkSync(paths.dashboardJson);
    } catch {
      // ignore
    }
  }
  console.log("smoke seeds removed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
