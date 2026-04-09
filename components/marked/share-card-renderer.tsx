"use client";

import { forwardRef } from "react";
import type { MarkedItem, MarkedCollection } from "@/lib/modules/marked/types";

interface Props {
  collection: MarkedCollection;
  items: MarkedItem[];
  payload: string;
}

function groupByDomain(items: MarkedItem[]) {
  const groups = new Map<string, MarkedItem[]>();
  for (const item of items) {
    try {
      const host = new URL(item.url).hostname.replace(/^www\./, "");
      const existing = groups.get(host);
      if (existing) existing.push(item);
      else groups.set(host, [item]);
    } catch {
      const existing = groups.get("other");
      if (existing) existing.push(item);
      else groups.set("other", [item]);
    }
  }
  return groups;
}

function shouldGroup(groups: Map<string, MarkedItem[]>): boolean {
  for (const items of groups.values()) {
    if (items.length >= 3) return true;
  }
  return false;
}

export const ShareCardRenderer = forwardRef<HTMLDivElement, Props>(
  function ShareCardRenderer({ collection, items, payload }, ref) {
    const date = new Date(collection.createdAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const groups = groupByDomain(items);
    const useGroups = shouldGroup(groups);

    return (
      <div
        ref={ref}
        style={{
          width: 480,
          fontFamily:
            "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          background: "#09090b",
          color: "#fafafa",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "28px 28px 20px",
            borderBottom: "1px solid #27272a",
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              lineHeight: 1.3,
              letterSpacing: "-0.02em",
            }}
          >
            {collection.name}
          </div>
          {collection.notes && (
            <div
              style={{
                fontSize: 13,
                color: "#a1a1aa",
                marginTop: 6,
                lineHeight: 1.5,
              }}
            >
              {collection.notes}
            </div>
          )}
          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 12,
              fontSize: 11,
              color: "#71717a",
              textTransform: "uppercase" as const,
              letterSpacing: "0.05em",
            }}
          >
            <span>
              {items.length} {items.length === 1 ? "link" : "links"}
            </span>
            <span>{date}</span>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "16px 28px 12px" }}>
          {useGroups
            ? Array.from(groups.entries()).map(([domain, groupItems]) => (
                <div key={domain} style={{ marginBottom: 12 }}>
                  {groups.size > 1 && (
                    <div
                      style={{
                        fontSize: 10,
                        color: "#71717a",
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.06em",
                        marginBottom: 6,
                        fontWeight: 600,
                      }}
                    >
                      {domain}
                    </div>
                  )}
                  {groupItems.map((item, i) => (
                    <CardRow key={item.id} item={item} index={i} />
                  ))}
                </div>
              ))
            : items.map((item, i) => (
                <CardRow key={item.id} item={item} index={i} />
              ))}
        </div>

        {/* Footer with @marked: payload */}
        <div
          style={{
            padding: "12px 28px 20px",
            borderTop: "1px solid #27272a",
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: "#3f3f46",
              fontFamily: "'Geist Mono', monospace",
              wordBreak: "break-all" as const,
              lineHeight: 1.5,
            }}
          >
            @marked:{payload}
          </div>
        </div>
      </div>
    );
  },
);

function CardRow({ item, index }: { item: MarkedItem; index: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "6px 0",
      }}
    >
      <span
        style={{
          fontSize: 11,
          color: "#52525b",
          fontVariantNumeric: "tabular-nums",
          width: 18,
          textAlign: "right" as const,
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        {index + 1}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            lineHeight: 1.4,
            color: "#fafafa",
          }}
        >
          {item.title}
        </div>
        {item.sourceTag && (
          <div
            style={{
              fontSize: 11,
              color: "#a78bfa",
              marginTop: 2,
              fontWeight: 500,
            }}
          >
            {item.sourceTag}
          </div>
        )}
      </div>
    </div>
  );
}
