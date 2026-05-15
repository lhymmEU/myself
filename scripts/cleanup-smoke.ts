/**
 * Removes smoke seed rows from Postgres for a given test user.
 *
 * Requires DATABASE_URL and MYSELF_SMOKE_USER_ID (uuid).
 */
import { initDatabase } from "../lib/core/init-db";
import { getDb } from "../lib/db";
import {
  cardDismissals,
  wikiIngestState,
} from "../lib/db/schema/postgres/insights";
import { eq, and } from "drizzle-orm";

function requireSmokeUser(): string {
  const id = process.env.MYSELF_SMOKE_USER_ID?.trim();
  if (!id) {
    throw new Error("Set MYSELF_SMOKE_USER_ID to a Supabase auth user uuid.");
  }
  return id;
}

async function main() {
  initDatabase();
  const userId = requireSmokeUser();
  const db = getDb();
  const ids = ["smoke-card-1", "smoke-card-2"];
  for (const id of ids) {
    await db
      .delete(cardDismissals)
      .where(
        and(eq(cardDismissals.cardId, id), eq(cardDismissals.userId, userId)),
      );
  }
  await db
    .update(wikiIngestState)
    .set({ generativeCardsJson: null })
    .where(eq(wikiIngestState.userId, userId));
  console.log("smoke seeds removed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
