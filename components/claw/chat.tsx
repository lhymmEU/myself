"use client";

import { useState, useRef, useEffect, type FormEvent, useMemo } from "react";
import useSWR from "swr";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { nanoid } from "nanoid";
import { Loader2, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CardRenderer } from "./card-renderer";
import type { ClawUIMessage, ClawCard } from "@/lib/claw/messages";
import { swrFetcher } from "@/lib/swr/config";
import { DEFAULT_WEB_SESSION_ID } from "@/lib/claw/constants";
import { cn } from "@/lib/utils";

function effectiveSession(id: string | undefined): string {
  return id?.trim() || DEFAULT_WEB_SESSION_ID;
}

interface Props {
  connectionId: string;
  connectionName: string;
  onDelete?: () => void | Promise<void>;
}

interface MessagePartView {
  kind: "text" | "card" | "error";
  text?: string;
  card?: ClawCard;
  error?: { message: string; detail?: string };
}

function viewParts(message: ClawUIMessage): MessagePartView[] {
  const out: MessagePartView[] = [];
  for (const part of message.parts) {
    if (part.type === "text") {
      out.push({ kind: "text", text: part.text });
      continue;
    }
    if (part.type === "data-card") {
      out.push({ kind: "card", card: part.data });
      continue;
    }
    if (part.type === "data-error") {
      out.push({ kind: "error", error: part.data });
      continue;
    }
    // Ignore reasoning / source / file / tool parts — openclaw never
    // emits them today.
  }
  return out;
}

interface SessionsResponse {
  sessions: Array<{ key: string; agentId?: string; model?: string }>;
  error?: string;
}

export function Chat({ connectionId, connectionName, onDelete }: Props) {
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);

  const connectionIdRef = useRef(connectionId);
  const sessionIdRef = useRef<string | undefined>(undefined);
  const bootstrappedRef = useRef<Set<string>>(new Set());
  connectionIdRef.current = connectionId;
  sessionIdRef.current = sessionId;

  useEffect(() => {
    bootstrappedRef.current.clear();
  }, [connectionId]);

  const sessionsUrl = useMemo(
    () =>
      `/api/claw/sessions?connectionId=${encodeURIComponent(connectionId)}`,
    [connectionId],
  );
  const { data: sessionsData, mutate: mutateSessions } = useSWR<SessionsResponse>(
    sessionsUrl,
    swrFetcher,
  );

  const [transport] = useState(
    () =>
      new DefaultChatTransport<ClawUIMessage>({
        api: "/api/claw/chat",
        prepareSendMessagesRequest: ({
          id,
          messages: reqMessages,
          body,
          trigger,
          messageId,
        }) => {
          const sid = effectiveSession(sessionIdRef.current);
          const bootstrap = !bootstrappedRef.current.has(sid);
          bootstrappedRef.current.add(sid);
          return {
            body: {
              ...(body ?? {}),
              id,
              messages: reqMessages,
              trigger,
              messageId,
              connectionId: connectionIdRef.current,
              sessionId: sid,
              bootstrap,
            },
          };
        },
      }),
  );

  const { messages, sendMessage, status, error, stop, setMessages } =
    useChat<ClawUIMessage>({
      transport,
      onFinish: () => {
        void mutateSessions();
      },
    });

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, status]);

  const isStreaming = status === "submitted" || status === "streaming";

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    sendMessage({ text });
  }

  function handleChoose(text: string) {
    if (isStreaming) return;
    sendMessage({ text });
  }

  function startNewSession() {
    setSessionId(`web-${nanoid()}`);
    setMessages([]);
  }

  function clearChat() {
    bootstrappedRef.current.delete(effectiveSession(sessionId));
    setMessages([]);
  }

  const remoteSessions = sessionsData?.sessions ?? [];
  const orphanSessionKey =
    sessionId &&
    !remoteSessions.some((s) => s.key === sessionId)
      ? sessionId
      : null;
  const sessionSelectValue =
    sessionId === undefined ? "__default__" : sessionId;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <header className="flex flex-col gap-3 border-b px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-base font-semibold">My Claw</h1>
          <p className="text-xs text-muted-foreground">
            Connected to <span className="font-mono">{connectionName}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2 sm:justify-end">
          <div className="flex min-w-[12rem] flex-1 flex-col gap-1 sm:max-w-xs sm:flex-initial">
            <Label htmlFor="claw-session" className="text-xs text-muted-foreground">
              Session
            </Label>
            <Select
              value={sessionSelectValue}
              onValueChange={(v) => {
                if (v === "__default__") {
                  setSessionId(undefined);
                } else {
                  setSessionId(v);
                }
                setMessages([]);
              }}
              disabled={isStreaming}
            >
              <SelectTrigger id="claw-session" className="w-full" size="sm">
                <SelectValue placeholder="Pick session" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__default__">
                  Default session ({DEFAULT_WEB_SESSION_ID})
                </SelectItem>
                {orphanSessionKey && (
                  <SelectItem value={orphanSessionKey}>
                    {orphanSessionKey} (unsaved)
                  </SelectItem>
                )}
                {remoteSessions.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.model ? `${s.key} · ${s.model}` : s.key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={startNewSession}
            disabled={isStreaming}
          >
            New session
          </Button>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearChat}
              disabled={isStreaming}
            >
              Clear
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              title="Forget this connection"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-6">
          {messages.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-12">
              Send a message to talk to your openclaw agent.
            </div>
          )}
          {messages.map((message) => (
            <MessageRow
              key={message.id}
              message={message}
              onChoose={handleChoose}
            />
          ))}
          {error && (
            <Card className="border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error.message}
            </Card>
          )}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t px-6 py-4"
      >
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message your claw…"
            rows={2}
            className="min-h-[60px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (input.trim() && !isStreaming) {
                  setInput("");
                  sendMessage({ text: input.trim() });
                }
              }
            }}
          />
          {isStreaming ? (
            <Button type="button" variant="outline" onClick={stop}>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Stop
            </Button>
          ) : (
            <Button type="submit" disabled={!input.trim()}>
              <Send className="mr-2 h-4 w-4" /> Send
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

interface RowProps {
  message: ClawUIMessage;
  onChoose: (text: string) => void;
}

function MessageRow({ message, onChoose }: RowProps) {
  const parts = viewParts(message);
  const isUser = message.role === "user";
  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        isUser ? "items-end" : "items-start",
      )}
    >
      {parts.map((part, i) => {
        if (part.kind === "text" && part.text !== undefined) {
          return (
            <div
              key={i}
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap",
                isUser
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground",
              )}
            >
              {part.text}
            </div>
          );
        }
        if (part.kind === "card" && part.card) {
          return (
            <div key={i} className="w-full max-w-[85%]">
              <CardRenderer card={part.card} onChoose={onChoose} />
            </div>
          );
        }
        if (part.kind === "error" && part.error) {
          return (
            <div
              key={i}
              className="max-w-[85%] rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              <p className="font-medium">{part.error.message}</p>
              {part.error.detail && (
                <pre className="mt-1 whitespace-pre-wrap font-mono text-[11px]">
                  {part.error.detail}
                </pre>
              )}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
