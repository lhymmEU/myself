"use client";

import { useMemo, useState } from "react";

interface HeatmapProps {
  completions: string[];
}

function getDaysBetween(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(start);
  while (current <= end) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function Heatmap({ completions }: HeatmapProps) {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  const { days, completionSet, weeks, monthLabels } = useMemo(() => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 89);

    const dayList = getDaysBetween(start, end);
    const set = new Set(completions);

    const startDayOfWeek = start.getDay();
    const paddedDays: (Date | null)[] = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      paddedDays.push(null);
    }
    paddedDays.push(...dayList);

    const weekList: (Date | null)[][] = [];
    for (let i = 0; i < paddedDays.length; i += 7) {
      weekList.push(paddedDays.slice(i, i + 7));
    }

    const labels: { text: string; col: number }[] = [];
    let lastMonth = -1;
    weekList.forEach((week, colIdx) => {
      for (const day of week) {
        if (day) {
          const month = day.getMonth();
          if (month !== lastMonth) {
            labels.push({ text: MONTHS[month], col: colIdx });
            lastMonth = month;
          }
          break;
        }
      }
    });

    return { days: dayList, completionSet: set, weeks: weekList, monthLabels: labels };
  }, [completions]);

  const cellSize = 14;
  const gap = 2;
  const step = cellSize + gap;

  function getIntensity(date: Date): number {
    return completionSet.has(formatDate(date)) ? 1 : 0;
  }

  return (
    <div className="relative">
      <div className="text-xs text-muted-foreground mb-1 flex" style={{ paddingLeft: 0 }}>
        {monthLabels.map((label, i) => (
          <span
            key={i}
            className="absolute text-xs text-muted-foreground"
            style={{ left: label.col * step }}
          >
            {label.text}
          </span>
        ))}
      </div>
      <div className="relative" style={{ marginTop: 18 }}>
        <svg
          width={weeks.length * step}
          height={7 * step}
          className="block"
        >
          {weeks.map((week, colIdx) =>
            week.map((day, rowIdx) => {
              if (!day) return null;
              const done = getIntensity(day);
              const dateStr = formatDate(day);
              return (
                <rect
                  key={dateStr}
                  x={colIdx * step}
                  y={rowIdx * step}
                  width={cellSize}
                  height={cellSize}
                  rx={2}
                  className={
                    done
                      ? "fill-emerald-500 dark:fill-emerald-400"
                      : "fill-muted-foreground/15"
                  }
                  onMouseEnter={(e) => {
                    const rect = (e.target as SVGRectElement).getBoundingClientRect();
                    setTooltip({
                      text: `${dateStr}: ${done ? "Completed" : "Not completed"}`,
                      x: rect.left + rect.width / 2,
                      y: rect.top,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })
          )}
        </svg>
        {tooltip && (
          <div
            className="fixed z-50 px-2 py-1 text-xs bg-popover text-popover-foreground border rounded shadow-md pointer-events-none whitespace-nowrap"
            style={{
              left: tooltip.x,
              top: tooltip.y - 32,
              transform: "translateX(-50%)",
            }}
          >
            {tooltip.text}
          </div>
        )}
      </div>
      {days.length === 0 && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          No data to display
        </div>
      )}
    </div>
  );
}
