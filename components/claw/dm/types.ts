export type ConversationState =
  | "idle"
  | "sending"
  | "agent-typing"
  | "task-running"
  | "error";

export interface SessionTarget {
  agentId: string;
  /** null = start a new session (omit --session-id; server creates one) */
  sessionId: string | null;
  label: string;
  model?: string;
  /** UUID of the transcript file on disk (distinct from the compound session key) */
  transcriptId?: string;
}

export interface Message {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: number;
  responseType?: ResponseType;
  metadata?: Record<string, unknown>;
  toolCalls?: PendingToolCall[];
  /** json-render spec for generative UI rendering */
  uiSpec?: unknown;
}

export type ResponseType =
  | "status"
  | "task"
  | "memory"
  | "skills"
  | "error"
  | "text"
  | "tool_request";

export interface PendingToolCall {
  name: string;
  arguments: Record<string, unknown>;
  status: "pending" | "approved" | "rejected" | "executing" | "succeeded" | "failed";
  result?: unknown;
  error?: string;
}

export interface AgentStatus {
  online: boolean;
  currentTask?: string;
  health?: "healthy" | "unhealthy" | "unknown";
  gatewayRunning?: boolean;
}

// ---------------------------------------------------------------------------
// Action shelf pill configuration
// ---------------------------------------------------------------------------

export interface PillConfig {
  id: string;
  labelKey: string;
  /** If set, clicking the pill opens a template popover instead of inserting text */
  template?: TemplateConfig;
  /** Plain text to insert into the input when no template is used */
  insertText?: string;
}

export interface TemplateField {
  name: string;
  labelKey: string;
  type: "text" | "select";
  placeholder?: string;
  options?: { value: string; labelKey: string }[];
}

export interface TemplateConfig {
  titleKey: string;
  fields: TemplateField[];
  /** Assembles field values into a natural-language message */
  buildMessage: (values: Record<string, string>) => string;
}

export interface CategoryConfig {
  id: string;
  labelKey: string;
  pills: PillConfig[];
}

// ---------------------------------------------------------------------------
// DM state reducer
// ---------------------------------------------------------------------------

export type DMAction =
  | { type: "SEND_MESSAGE"; message: Message }
  | { type: "RECEIVE_MESSAGE"; message: Message; sessionId?: string }
  | { type: "SET_ERROR"; error: string }
  | { type: "CLEAR_ERROR" }
  | { type: "SET_SENDING" }
  | { type: "SET_SESSION"; target: SessionTarget }
  | { type: "CLEAR_THREAD" }
  | { type: "LOAD_HISTORY"; messages: Message[] }
  | { type: "SET_LOADING_HISTORY"; loading: boolean }
  | { type: "UPDATE_TOOL_CALL"; messageId: string; toolIndex: number; update: Partial<PendingToolCall> };

export interface DMState {
  conversationState: ConversationState;
  messages: Message[];
  sessionTarget: SessionTarget | null;
  error: string | null;
  loadingHistory: boolean;
}
