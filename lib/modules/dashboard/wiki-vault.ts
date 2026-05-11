/**
 * Wiki content lives in Supabase (`wiki_pages`, `wiki_log_entries`).
 * Implementation: {@link ./wiki-db}.
 */
export {
  ensureWikiVault as ensureVault,
  isWikiVaultReady as isVaultReady,
  readWikiPage,
  writeWikiPage,
  appendWikiLog as appendLog,
  readWikiLog as readLog,
  searchWiki,
  readAgentsMd,
  readDashboardJson,
} from "./wiki-db";

export {
  AGENTS_TEMPLATE,
  INDEX_TEMPLATE,
  WIKI_SLUG_AGENTS,
  LOG_BOOTSTRAP_LINE,
} from "./wiki-templates";
