import OpenAI from "openai";
import { getSetting } from "@/lib/modules/settings/actions";

const clients = new Map<string, OpenAI>();

async function getClient(userId: string): Promise<OpenAI> {
  const key = await getSetting("openrouter_api_key", userId);
  if (!key) {
    throw new Error(
      "OpenRouter API key not configured. Go to Settings to add your API key.",
    );
  }
  const existing = clients.get(userId);
  if (existing) return existing;
  const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: key,
  });
  clients.set(userId, client);
  return client;
}

export function isLlmAvailable(): boolean {
  return true;
}

export async function chatCompletion(
  userId: string,
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  const client = await getClient(userId);
  const model =
    (await getSetting("llm_model", userId)) || "anthropic/claude-sonnet-4";
  const tempRaw = await getSetting("llm_temperature", userId);
  const temperature = tempRaw ? parseFloat(tempRaw) : 0.7;
  const response = await client.chat.completions.create({
    model,
    messages,
    temperature: options?.temperature ?? temperature,
    max_tokens: options?.maxTokens ?? 2048,
  });

  return response.choices[0]?.message?.content ?? "";
}

export async function structuredOutput<T>(
  userId: string,
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options?: { temperature?: number; maxTokens?: number },
): Promise<T> {
  const client = await getClient(userId);
  const model =
    (await getSetting("llm_model", userId)) || "anthropic/claude-sonnet-4";
  const tempRaw = await getSetting("llm_temperature", userId);
  const temperature = tempRaw ? parseFloat(tempRaw) : 0.7;
  const response = await client.chat.completions.create({
    model,
    messages,
    temperature: options?.temperature ?? temperature,
    max_tokens: options?.maxTokens ?? 4096,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  return JSON.parse(content) as T;
}
