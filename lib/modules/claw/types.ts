export interface ClawConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authMethod: "password" | "key";
  /** Stored encrypted; only present when decrypted for use */
  password?: string;
  /** Raw PEM or reference to a vault secret ID (prefixed with "vault:") */
  privateKey?: string;
  passphrase?: string;
  /** OpenClaw gateway port on the remote host */
  gatewayPort: number;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CreateConnectionInput {
  name: string;
  host: string;
  port?: number;
  username: string;
  authMethod: "password" | "key";
  password?: string;
  privateKey?: string;
  passphrase?: string;
  gatewayPort?: number;
}

export interface UpdateConnectionInput {
  id: string;
  name?: string;
  host?: string;
  port?: number;
  username?: string;
  authMethod?: "password" | "key";
  password?: string;
  privateKey?: string;
  passphrase?: string;
  gatewayPort?: number;
}

export interface ClawStatus {
  connected: boolean;
  gatewayRunning?: boolean;
  version?: string;
  uptime?: string;
  channels?: ChannelInfo[];
  sessions?: SessionInfo[];
  updateAvailable?: boolean;
  raw?: string;
}

export interface ChannelInfo {
  name: string;
  status: "connected" | "disconnected" | "error";
  authAge?: string;
  details?: string;
}

export interface SessionInfo {
  agentId: string;
  key: string;
  model?: string;
}

export interface GatewayHealthResult {
  healthy: boolean;
  probes?: Record<string, unknown>;
  sessionStore?: Record<string, unknown>;
  raw?: string;
}

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  subsystem?: string;
  raw: string;
}

export type GatewayAction = "start" | "stop" | "restart" | "install" | "uninstall";

export interface MemoryFile {
  path: string;
  name: string;
  date?: string;
  content?: string;
}

export interface InstalledSkill {
  name: string;
  description: string;
  path: string;
  metadata?: Record<string, unknown>;
}

export interface MarketplaceSkill {
  slug: string;
  displayName: string;
  summary: string;
  downloads: number;
  stars: number;
  source: "clawhub" | "vercel";
  url: string;
  certified?: boolean;
  owner?: string;
}
