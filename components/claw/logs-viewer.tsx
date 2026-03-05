"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Play,
  Pause,
  Trash2,
  ArrowDown,
  Server,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LogsViewerProps {
  connectionId: string | null;
  connected: boolean;
}

interface LogLine {
  id: number;
  raw: string;
  level?: string;
  timestamp?: string;
  message?: string;
}

const LEVEL_COLORS: Record<string, string> = {
  trace: "text-zinc-500",
  debug: "text-zinc-400",
  info: "text-blue-400",
  warn: "text-yellow-400",
  error: "text-red-400",
  fatal: "text-red-500 font-bold",
};

export function LogsViewer({ connectionId, connected }: LogsViewerProps) {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [filter, setFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [autoScroll, setAutoScroll] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const idCounter = useRef(0);

  const stopStreaming = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setStreaming(false);
  }, []);

  const startStreaming = useCallback(() => {
    if (!connectionId || !connected) return;
    stopStreaming();

    const url = `/api/claw/logs?connectionId=${encodeURIComponent(connectionId)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;
    setStreaming(true);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.done) {
          stopStreaming();
          return;
        }
        if (data.error) {
          setLines((prev) => [
            ...prev.slice(-4999),
            {
              id: idCounter.current++,
              raw: `[ERROR] ${data.error}`,
              level: "error",
              message: data.error,
            },
          ]);
          return;
        }
        const level =
          data.level || (typeof data === "string" ? undefined : undefined);
        const msg =
          data.msg || data.message || (typeof data === "string" ? data : event.data);

        setLines((prev) => [
          ...prev.slice(-4999),
          {
            id: idCounter.current++,
            raw: event.data,
            level,
            timestamp: data.time || data.timestamp,
            message: msg,
          },
        ]);
      } catch {
        setLines((prev) => [
          ...prev.slice(-4999),
          { id: idCounter.current++, raw: event.data },
        ]);
      }
    };

    es.onerror = () => {
      stopStreaming();
    };
  }, [connectionId, connected, stopStreaming]);

  useEffect(() => {
    return () => stopStreaming();
  }, [stopStreaming]);

  useEffect(() => {
    if (!connected) stopStreaming();
  }, [connected, stopStreaming]);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines, autoScroll]);

  const filteredLines = lines.filter((l) => {
    if (levelFilter !== "all" && l.level && l.level !== levelFilter) return false;
    if (filter && !l.raw.toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Server className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm">Connect to a server to view logs</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {!streaming ? (
          <Button size="sm" onClick={startStreaming}>
            <Play className="h-3.5 w-3.5 mr-1.5" />
            Stream Logs
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={stopStreaming}>
            <Pause className="h-3.5 w-3.5 mr-1.5" />
            Pause
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setLines([])}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Clear
        </Button>
        <Button
          size="sm"
          variant={autoScroll ? "default" : "outline"}
          onClick={() => setAutoScroll(!autoScroll)}
        >
          <ArrowDown className="h-3.5 w-3.5 mr-1.5" />
          Auto-scroll
        </Button>

        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            <SelectItem value="trace">Trace</SelectItem>
            <SelectItem value="debug">Debug</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warn">Warn</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Filter..."
          className="h-8 w-48 text-xs"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />

        <Badge variant="secondary" className="ml-auto text-xs">
          {filteredLines.length} lines
        </Badge>
      </div>

      <div
        ref={containerRef}
        className="rounded-md border border-border bg-[#09090b] p-3 font-mono text-xs overflow-auto"
        style={{ height: "500px" }}
      >
        {filteredLines.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            {streaming
              ? "Waiting for log entries..."
              : "Click 'Stream Logs' to begin"}
          </p>
        ) : (
          filteredLines.map((line) => (
            <div key={line.id} className="py-0.5 leading-relaxed">
              {line.timestamp && (
                <span className="text-zinc-600 mr-2">
                  {line.timestamp}
                </span>
              )}
              {line.level && (
                <span
                  className={cn(
                    "uppercase mr-2 w-6 inline-block",
                    LEVEL_COLORS[line.level] ?? "text-zinc-400"
                  )}
                >
                  {line.level.slice(0, 5).padEnd(5)}
                </span>
              )}
              <span className="text-zinc-200">
                {line.message || line.raw}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
