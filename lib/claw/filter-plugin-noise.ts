/**
 * OpenClaw sometimes prints plugin bootstrap lines to stdout (not stderr),
 * e.g. `[plugins] tavily: initialized (...)`. Strip whole lines matching
 * that pattern so the chat UI only sees the agent reply.
 */
const PLUGIN_LINE = /^\s*\[plugins\]/;

export function createStdoutNoiseFilter() {
  let pending = "";

  return {
    push(chunk: string): string {
      pending += chunk;
      const lines = pending.split(/\r?\n/);
      pending = lines.pop() ?? "";
      const kept = lines.filter((line) => !PLUGIN_LINE.test(line));
      if (kept.length === 0) return "";
      return `${kept.join("\n")}\n`;
    },
    /** Emit any trailing fragment without a final newline. */
    flush(): string {
      const rest = pending;
      pending = "";
      if (!rest) return "";
      if (PLUGIN_LINE.test(rest)) return "";
      return rest;
    },
  };
}
