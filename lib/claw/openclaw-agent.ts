/**
 * Builds the remote-shell command that runs `openclaw agent` over SSH.
 * Shared by the streaming chat route and the background wiki-ingest job so
 * timeouts and flags stay consistent.
 */
import { DEFAULT_WEB_SESSION_ID } from "./constants";

export function shellEscape(input: string): string {
  return `'${input.replace(/'/g, `'\\''`)}'`;
}

export interface BuildOpenclawAgentCommandOptions {
  message: string;
  sessionId?: string;
  /** Passed to `openclaw agent --timeout` (seconds). Default 120. */
  agentTimeoutSec?: number;
}

/**
 * Returns the inner command line for `bash -lc …` (what ssh.exec runs).
 */
export function buildOpenclawAgentCommandInner(
  opts: BuildOpenclawAgentCommandOptions,
): string {
  const resolvedSession = opts.sessionId?.trim() || DEFAULT_WEB_SESSION_ID;
  const timeoutSec = opts.agentTimeoutSec ?? 120;
  const parts = [
    "NO_COLOR=1 openclaw agent",
    "--local",
    `--timeout ${timeoutSec}`,
    `--session-id ${shellEscape(resolvedSession)}`,
    `--message ${shellEscape(opts.message)}`,
  ];
  return parts.join(" ");
}

/**
 * Full remote command: login shell so PATH matches an interactive SSH session.
 */
export function buildOpenclawAgentCommand(
  opts: BuildOpenclawAgentCommandOptions,
): string {
  const inner = buildOpenclawAgentCommandInner(opts);
  return `bash -lc ${shellEscape(inner)}`;
}
