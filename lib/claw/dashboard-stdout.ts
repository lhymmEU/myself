/**
 * Wiki ingest captures openclaw stdout and extracts the dashboard payload the
 * agent Prints between sentinel lines (see wiki-preamble).
 */

const START = "<<<MYSELF_DASHBOARD_JSON_START>>>";
const END = "<<<MYSELF_DASHBOARD_JSON_END>>>";

/**
 * Returns the raw JSON object string between markers, or null if missing/invalid.
 */
export function extractDashboardJsonFromWikiIngestStdout(
  stdout: string,
): string | null {
  const i = stdout.indexOf(START);
  const j = stdout.indexOf(END);
  if (i === -1 || j === -1 || j <= i) return null;
  const raw = stdout.slice(i + START.length, j).trim();
  if (!raw.startsWith("{")) return null;
  return raw;
}
