"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateTimePickerProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const HOURS = Array.from({ length: 24 }, (_, i) =>
  i.toString().padStart(2, "0")
);
const MINUTES = Array.from({ length: 60 }, (_, i) =>
  i.toString().padStart(2, "0")
);

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick date & time",
  className,
  disabled,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);

  const hour = value ? value.getHours().toString().padStart(2, "0") : "09";
  const minute = value
    ? value.getMinutes().toString().padStart(2, "0")
    : "00";

  const handleDateSelect = (day: Date | undefined) => {
    if (!day) {
      onChange(undefined);
      return;
    }
    const next = new Date(day);
    next.setHours(parseInt(hour, 10), parseInt(minute, 10), 0, 0);
    onChange(next);
  };

  const handleTimeChange = (field: "hour" | "minute", val: string) => {
    const base = value ?? new Date();
    const next = new Date(base);
    if (field === "hour") {
      next.setHours(parseInt(val, 10));
    } else {
      next.setMinutes(parseInt(val, 10));
    }
    next.setSeconds(0, 0);
    onChange(next);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal h-7 text-xs px-2",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-1.5 h-3 w-3 shrink-0" />
          {value ? format(value, "yyyy-MM-dd HH:mm") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" side="left">
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleDateSelect}
          className="border-b"
        />
        <div className="flex items-center gap-1 px-3 py-2">
          <span className="text-xs text-muted-foreground mr-1">⏰</span>
          <select
            value={hour}
            onChange={(e) => handleTimeChange("hour", e.target.value)}
            className="h-7 rounded-md border bg-transparent px-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
          <span className="text-xs font-medium">:</span>
          <select
            value={minute}
            onChange={(e) => handleTimeChange("minute", e.target.value)}
            className="h-7 rounded-md border bg-transparent px-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {MINUTES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </PopoverContent>
    </Popover>
  );
}
