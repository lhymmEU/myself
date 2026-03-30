"use client";

import * as React from "react";
import { Globe, ChevronDown, Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Singapore",
  "Australia/Sydney",
  "Pacific/Auckland",
];

function getAllTimezones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return COMMON_TIMEZONES;
  }
}

function getOffsetLabel(tz: string): string {
  try {
    const now = new Date();
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    });
    const parts = fmt.formatToParts(now);
    const offsetPart = parts.find((p) => p.type === "timeZoneName");
    return offsetPart?.value ?? "";
  } catch {
    return "";
  }
}

function shortLabel(tz: string): string {
  const offset = getOffsetLabel(tz);
  const city = tz.split("/").pop()?.replace(/_/g, " ") ?? tz;
  return offset ? `${city} (${offset})` : city;
}

interface TimezonePickerProps {
  value: string;
  onChange: (tz: string) => void;
  className?: string;
  disabled?: boolean;
}

export function TimezonePicker({
  value,
  onChange,
  className,
  disabled,
}: TimezonePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const allTz = React.useMemo(() => getAllTimezones(), []);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return COMMON_TIMEZONES;
    const q = search.toLowerCase();
    return allTz.filter(
      (tz) =>
        tz.toLowerCase().includes(q) ||
        shortLabel(tz).toLowerCase().includes(q)
    );
  }, [search, allTz]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-between text-left font-normal h-7 text-xs px-2",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="flex items-center gap-1.5 truncate">
            <Globe className="h-3 w-3 shrink-0" />
            {value ? shortLabel(value) : "Select timezone"}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0" align="start" side="left">
        <div className="p-2 border-b">
          <Input
            placeholder="Search timezone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 text-xs"
            autoFocus
          />
        </div>
        <ScrollArea className="h-[240px]">
          <div className="p-1">
            {filtered.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-4">
                No timezone found
              </div>
            ) : (
              filtered.map((tz) => (
                <button
                  key={tz}
                  onClick={() => {
                    onChange(tz);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground cursor-pointer",
                    value === tz && "bg-accent"
                  )}
                >
                  <Check
                    className={cn(
                      "h-3 w-3 shrink-0",
                      value === tz ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{shortLabel(tz)}</span>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
