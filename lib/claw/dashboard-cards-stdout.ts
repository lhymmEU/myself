/**
 * Normalizes raw dashboard card JSON (e.g. from a remote `cards.json` file or
 * legacy stdout payloads) into a string that `JSON.parse` accepts.
 */
export function coerceCardsJsonBlock(inner: string): string | null {
  let s = inner.replace(/^\uFEFF/, "").trim();
  const fullFence = /^```(?:json|JSON)?\s*\r?\n?([\s\S]*?)\r?\n?```\s*$/;
  const fm = s.match(fullFence);
  if (fm) s = fm[1]!.trim();
  else if (s.startsWith("```")) {
    s = s.replace(/^```(?:json|JSON)?\s*/, "");
    s = s.replace(/\s*```\s*$/, "");
  }
  s = s.trim();
  try {
    JSON.parse(s);
    return s;
  } catch {
    const i = s.indexOf("{");
    const j = s.lastIndexOf("}");
    if (i === -1 || j <= i) return null;
    const slice = s.slice(i, j + 1);
    try {
      JSON.parse(slice);
      return slice;
    } catch {
      return null;
    }
  }
}
