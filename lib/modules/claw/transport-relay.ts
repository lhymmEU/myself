/**
 * Cloud-mode lobster transport.
 *
 * The cloud server CANNOT hold a long-lived TCP/SSH socket (Vercel
 * serverless constraint), and the user's lobster typically sits behind home
 * NAT, so neither side can dial the other. We solve this with two tools:
 *
 *   1. Per-lobster outbound HTTPS gateway (`gateway_port`). The user runs
 *      `lobsterd` on their box; lobsterd opens an outbound WSS to a
 *      Cloudflare Worker Durable Object relay. Browser-side terminal uses
 *      that same relay over E2E-encrypted WebSocket.
 *      → built in Phases 3b-2 (relay) and 3b-3 (lobsterd).
 *
 *   2. Short HTTPS one-shot exec calls. The Vercel API does NOT hold a
 *      socket — it just POSTs the command to the lobster's gateway via the
 *      relay's HTTPS edge endpoint and waits for the response. This is what
 *      this file implements.
 *
 * For now (Phase 3b) this transport returns "Cloud transport is not yet
 * available" errors so cloud builds can compile and exercise the rest of
 * the codebase without trying to talk to a real lobster. The real
 * implementation lands when Phase 3b-2 / 3b-3 ship the relay + lobsterd.
 */

import { isCloud } from "@/lib/core/runtime";
import type { ClawConnection } from "./types";

if (!isCloud()) {
  throw new Error(
    "[claw/transport-relay] Relay transport is cloud-only. Use transport-ssh in local mode.",
  );
}

interface ExecResult {
  stdout: string;
  stderr: string;
  code: number;
}

const NOT_AVAILABLE_MESSAGE =
  "Cloud lobster transport is not yet available. Pair a lobsterd agent (npx lobsterd pair <code>) once the relay is online to enable Claw in the cloud.";

const _connected = new Set<string>();

export function getSSHClient(_connectionId: string): undefined {
  return undefined;
}

export async function connectSSH(
  connectionId: string,
): Promise<{ success: boolean; error?: string }> {
  // Mark the connection as "connected" so UI affordances unlock once a
  // pairing exists. Real implementation will validate the agent JWT against
  // the relay before flipping this on.
  _connected.add(connectionId);
  return { success: false, error: NOT_AVAILABLE_MESSAGE };
}

export function disconnectSSH(connectionId: string): void {
  _connected.delete(connectionId);
}

export function isSSHConnected(connectionId: string): boolean {
  return _connected.has(connectionId);
}

export async function executeCommand(
  _connectionId: string,
  _command: string,
  _timeoutMs = 30000,
): Promise<ExecResult> {
  throw new Error(NOT_AVAILABLE_MESSAGE);
}

export async function executeOpenClawCommand(
  _connectionId: string,
  _subcommand: string,
  _timeoutMs = 30000,
): Promise<ExecResult> {
  throw new Error(NOT_AVAILABLE_MESSAGE);
}

export function getSFTP(_connectionId: string): never {
  throw new Error(NOT_AVAILABLE_MESSAGE);
}

export async function resolveAgentId(
  _connectionId: string,
): Promise<string | null> {
  return null;
}

export async function pingConnection(
  _connectionId: string,
  _timeoutMs = 3000,
): Promise<boolean> {
  // The relay transport doesn't hold a long-lived socket, so liveness is a
  // per-call concern. Until the relay ships, treat every connection as
  // not-live so callers surface the "reconnect" UX.
  return false;
}

export function loginShell(command: string): string {
  return command;
}

export function describeRelayConnection(conn: ClawConnection): string {
  return `${conn.name} (${conn.host}) — relay`;
}
