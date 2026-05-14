/**
 * Wiki content lives on the OpenClaw host (markdown vault; see
 * `openclaw/skills/supabase-reads/SKILL.md` file-wiki section). Postgres `wiki_pages` /
 * `wiki_log_entries` were removed — these facades are no-ops or return null so
 * legacy call sites keep compiling.
 */

/** Legacy seed path: wiki is not stored in the app database anymore. */
export async function ensureVault(_userId: string): Promise<void> {}

export async function isVaultReady(_userId: string): Promise<boolean> {
  return true;
}

export async function readWikiPage(
  _userId: string,
  _slug: string,
): Promise<string | null> {
  return null;
}

export async function writeWikiPage(
  _userId: string,
  _slug: string,
  _markdown: string,
): Promise<void> {}

export async function appendLog(_userId: string, _body: string): Promise<void> {}

export async function readLog(
  _userId: string,
  _tail?: number,
): Promise<string[]> {
  return [];
}

export async function searchWiki(
  _userId: string,
  _query: string,
  _max?: number,
): Promise<Array<{ slug: string; excerpt: string }>> {
  return [];
}

export async function readAgentsMd(_userId: string): Promise<string> {
  return "";
}

export function readDashboardJson(): null {
  return null;
}
