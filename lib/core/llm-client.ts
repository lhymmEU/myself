import OpenAI from "openai";
import { getSettingSync } from "@/lib/modules/settings/actions";
import { isLocal } from "@/lib/core/runtime";

let _client: OpenAI | null = null;
let _cachedKey: string | null = null;

const CLOUD_DISABLED_MESSAGE =
  "LLM features are disabled in cloud mode. Cloud users connect their own lobsters that hold their own model keys; the cloud server never proxies LLM calls.";

function getClient(): OpenAI {
  if (!isLocal()) {
    throw new Error(CLOUD_DISABLED_MESSAGE);
  }
  const key = safeGetSetting("openrouter_api_key");
  if (!key) {
    throw new Error(
      "OpenRouter API key not configured. Go to Settings to add your API key."
    );
  }

  if (_client && _cachedKey === key) {
    return _client;
  }

  _client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: key,
  });
  _cachedKey = key;
  return _client;
}

export function isLlmAvailable(): boolean {
  return isLocal();
}

function safeGetSetting(key: string): string | null {
  try {
    return getSettingSync(key);
  } catch {
    return null;
  }
}

function getModel(): string {
  return safeGetSetting("llm_model") || "anthropic/claude-sonnet-4";
}

function getTemperature(): number {
  const temp = safeGetSetting("llm_temperature");
  return temp ? parseFloat(temp) : 0.7;
}

export async function chatCompletion(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const client = getClient();
  const response = await client.chat.completions.create({
    model: getModel(),
    messages,
    temperature: options?.temperature ?? getTemperature(),
    max_tokens: options?.maxTokens ?? 2048,
  });

  return response.choices[0]?.message?.content ?? "";
}

export async function structuredOutput<T>(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<T> {
  const client = getClient();
  const response = await client.chat.completions.create({
    model: getModel(),
    messages,
    temperature: options?.temperature ?? getTemperature(),
    max_tokens: options?.maxTokens ?? 4096,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  return JSON.parse(content) as T;
}
