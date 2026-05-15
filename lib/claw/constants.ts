/** `openclaw agent` requires `--session-id` when none is chosen in the UI. */
export const DEFAULT_WEB_SESSION_ID = "web-dashboard";

/** Dedicated session for background wiki-maintainer ingest (dashboard toolbar). */
export const WIKI_MAINTAINER_SESSION_ID = "web-wiki-maintainer";

/**
 * On the OpenClaw host, the wiki-maintainer agent writes `{ "cards": [...] }`
 * here after each ingest. The app server `cat`s this path over SSH (not stdout).
 */
export const OPENCLAW_REMOTE_SUPABASE_READS_CARDS_JSON =
  "/root/skills/supabase-reads/cards.json";

/** Session id for one-shot wishlist plan generation (me / wishlist page). */
export const WISHLIST_PLAN_SESSION_ID = "web-wishlist-plan";

/**
 * Browser sessionStorage key — last Claw SSH connection used for chat
 * (`components/claw/chat.tsx`). Wiki ingest reads this so the dashboard uses
 * the same connection as the agent you are talking to.
 */
export const CLAW_ACTIVE_CONNECTION_STORAGE_KEY = "myself.clawActiveConnectionId";
