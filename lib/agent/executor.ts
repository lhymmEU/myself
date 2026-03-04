import { toolRegistry } from "@/lib/core/tool-registry";

export interface ToolCallRequest {
  name: string;
  arguments: unknown;
}

export interface ToolCallResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export async function executeToolCall(
  request: ToolCallRequest
): Promise<ToolCallResult> {
  try {
    const data = await toolRegistry.execute(request.name, request.arguments);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function executeToolCalls(
  requests: ToolCallRequest[]
): Promise<ToolCallResult[]> {
  return Promise.all(requests.map(executeToolCall));
}
