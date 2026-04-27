/**
 * Claw module façade.
 *
 * - DB CRUD (`actions-db.ts`) is mode-agnostic and always available.
 * - SSH transport (`transport-ssh.ts`) is local-only.
 * - Relay transport (`transport-relay.ts`) is cloud-only.
 *
 * Existing imports from `@/lib/modules/claw/actions` continue to work in
 * both modes — this file dispatches to the right transport based on the
 * deployment MODE. Native modules (`ssh2`) are only `require()`d when the
 * SSH transport is needed, so cloud bundles never pull `ssh2` into their
 * build graph.
 */
export {
  getAllConnections,
  getConnection,
  getDefaultConnection,
  createConnection,
  updateConnection,
  deleteConnection,
  setDefaultConnection,
} from "./actions-db";

import { isCloud, isLocal } from "@/lib/core/runtime";
import type { Client, SFTPWrapper } from "ssh2";

type ExecResult = { stdout: string; stderr: string; code: number };

interface ClawTransport {
  getSSHClient: (connectionId: string) => Client | undefined;
  connectSSH: (
    connectionId: string,
  ) => Promise<{ success: boolean; error?: string }>;
  disconnectSSH: (connectionId: string) => void;
  isSSHConnected: (connectionId: string) => boolean;
  executeCommand: (
    connectionId: string,
    command: string,
    timeoutMs?: number,
  ) => Promise<ExecResult>;
  executeOpenClawCommand: (
    connectionId: string,
    subcommand: string,
    timeoutMs?: number,
  ) => Promise<ExecResult>;
  getSFTP: (connectionId: string) => Promise<SFTPWrapper> | SFTPWrapper;
  resolveAgentId: (connectionId: string) => Promise<string | null>;
  loginShell: (command: string) => string;
}

let _transport: ClawTransport | null = null;

function transport(): ClawTransport {
  if (_transport) return _transport;
  /* eslint-disable @typescript-eslint/no-require-imports */
  if (isLocal()) {
    _transport = require("./transport-ssh") as ClawTransport;
  } else if (isCloud()) {
    _transport = require("./transport-relay") as ClawTransport;
  } else {
    throw new Error("[claw] Unknown deployment mode — no transport available.");
  }
  /* eslint-enable @typescript-eslint/no-require-imports */
  return _transport;
}

export function getSSHClient(connectionId: string): Client | undefined {
  return transport().getSSHClient(connectionId);
}

export async function connectSSH(
  connectionId: string,
): Promise<{ success: boolean; error?: string }> {
  return transport().connectSSH(connectionId);
}

export function disconnectSSH(connectionId: string): void {
  transport().disconnectSSH(connectionId);
}

export function isSSHConnected(connectionId: string): boolean {
  return transport().isSSHConnected(connectionId);
}

export async function executeCommand(
  connectionId: string,
  command: string,
  timeoutMs = 30000,
): Promise<ExecResult> {
  return transport().executeCommand(connectionId, command, timeoutMs);
}

export async function executeOpenClawCommand(
  connectionId: string,
  subcommand: string,
  timeoutMs = 30000,
): Promise<ExecResult> {
  return transport().executeOpenClawCommand(connectionId, subcommand, timeoutMs);
}

export async function getSFTP(connectionId: string): Promise<SFTPWrapper> {
  if (!isLocal()) {
    throw new Error(
      "[claw] SFTP is only available via the local SSH transport. Cloud mode does not expose SFTP.",
    );
  }
  return transport().getSFTP(connectionId) as Promise<SFTPWrapper>;
}

export async function resolveAgentId(
  connectionId: string,
): Promise<string | null> {
  return transport().resolveAgentId(connectionId);
}

export function loginShell(command: string): string {
  return transport().loginShell(command);
}
