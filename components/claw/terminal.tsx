"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, Power } from "lucide-react";

interface TerminalProps {
  connectionId: string | null;
  connected: boolean;
}

export function ClawTerminal({ connectionId, connected }: TerminalProps) {
  const termRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<import("@xterm/xterm").Terminal | null>(null);
  const fitRef = useRef<import("@xterm/addon-fit").FitAddon | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/claw/terminal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ connectionId, action: "read" }),
        });
        const json = await res.json();
        if (json.closed) {
          setSessionOpen(false);
          stopPolling();
          return;
        }
        if (json.data && xtermRef.current) {
          for (const chunk of json.data) {
            const bytes = Uint8Array.from(atob(chunk), (c) => c.charCodeAt(0));
            xtermRef.current.write(bytes);
          }
        }
      } catch {
        // ignore transient errors
      }
    }, 100);
  }, [connectionId, stopPolling]);

  const openSession = useCallback(async () => {
    if (!connectionId) return;
    setLoading(true);
    try {
      const cols = xtermRef.current?.cols ?? 120;
      const rows = xtermRef.current?.rows ?? 30;
      const res = await fetch("/api/claw/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId, action: "open", cols, rows }),
      });
      const json = await res.json();
      if (json.sessionId) {
        setSessionOpen(true);
        xtermRef.current?.clear();
        startPolling();
      }
    } finally {
      setLoading(false);
    }
  }, [connectionId, startPolling]);

  const closeSession = useCallback(async () => {
    stopPolling();
    if (connectionId) {
      await fetch("/api/claw/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId, action: "close" }),
      }).catch(() => {});
    }
    setSessionOpen(false);
  }, [connectionId, stopPolling]);

  useEffect(() => {
    if (!termRef.current) return;

    let mounted = true;

    (async () => {
      const { Terminal } = await import("@xterm/xterm");
      const { FitAddon } = await import("@xterm/addon-fit");
      const { WebLinksAddon } = await import("@xterm/addon-web-links");

      if (!mounted || !termRef.current) return;

      const term = new Terminal({
        cursorBlink: true,
        fontFamily: "'Geist Mono', 'SF Mono', Menlo, monospace",
        fontSize: 13,
        lineHeight: 1.4,
        theme: {
          background: "#09090b",
          foreground: "#fafafa",
          cursor: "#a1a1aa",
          selectionBackground: "#27272a",
          black: "#09090b",
          red: "#ef4444",
          green: "#22c55e",
          yellow: "#eab308",
          blue: "#3b82f6",
          magenta: "#a855f7",
          cyan: "#06b6d4",
          white: "#fafafa",
        },
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.loadAddon(new WebLinksAddon());
      term.open(termRef.current);
      fitAddon.fit();

      xtermRef.current = term;
      fitRef.current = fitAddon;

      term.onData((data) => {
        if (!sessionOpen && !pollRef.current) return;
        fetch("/api/claw/terminal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ connectionId, action: "write", input: data }),
        }).catch(() => {});
      });

      term.onResize(({ cols, rows }) => {
        fetch("/api/claw/terminal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ connectionId, action: "resize", cols, rows }),
        }).catch(() => {});
      });

      const resizeObserver = new ResizeObserver(() => {
        fitAddon.fit();
      });
      resizeObserver.observe(termRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    })();

    return () => {
      mounted = false;
      stopPolling();
      xtermRef.current?.dispose();
      xtermRef.current = null;
    };
  }, []);// eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!connected) {
      closeSession();
    }
  }, [connected, closeSession]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {!sessionOpen ? (
          <Button
            size="sm"
            onClick={openSession}
            disabled={!connected || loading}
          >
            <Power className="h-3.5 w-3.5 mr-1.5" />
            {loading ? "Opening..." : "Open Shell"}
          </Button>
        ) : (
          <>
            <Button size="sm" variant="outline" onClick={closeSession}>
              <Power className="h-3.5 w-3.5 mr-1.5" />
              Close
            </Button>
            <Button size="sm" variant="outline" onClick={openSession}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Restart
            </Button>
          </>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {sessionOpen ? "Shell active" : "Shell closed"}
        </span>
      </div>
      <div
        ref={termRef}
        className="rounded-md border border-border overflow-hidden bg-[#09090b]"
        style={{ height: "450px" }}
      />
    </div>
  );
}
