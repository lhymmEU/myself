"use client";

import * as React from "react";
import { Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TimePickerProps {
  hour: string;
  minute: string;
  onChange: (hour: string, minute: string) => void;
  className?: string;
  disabled?: boolean;
}

const HOURS = Array.from({ length: 24 }, (_, i) =>
  i.toString().padStart(2, "0")
);
const MINUTES = Array.from({ length: 12 }, (_, i) =>
  (i * 5).toString().padStart(2, "0")
);

export function TimePicker({
  hour,
  minute,
  onChange,
  className,
  disabled,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal h-7 text-xs px-2",
            className
          )}
        >
          <Clock className="mr-1.5 h-3 w-3 shrink-0" />
          {hour}:{minute}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" side="left">
        <div className="flex">
          <div className="border-r">
            <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground text-center">
              HH
            </div>
            <ScrollArea className="h-[200px] w-[52px]">
              <div className="flex flex-col p-1">
                {HOURS.map((h) => (
                  <Button
                    key={h}
                    variant={h === hour ? "default" : "ghost"}
                    size="sm"
                    className="h-7 w-full text-xs justify-center"
                    onClick={() => {
                      onChange(h, minute);
                    }}
                  >
                    {h}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
          <div>
            <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground text-center">
              MM
            </div>
            <ScrollArea className="h-[200px] w-[52px]">
              <div className="flex flex-col p-1">
                {MINUTES.map((m) => (
                  <Button
                    key={m}
                    variant={m === minute ? "default" : "ghost"}
                    size="sm"
                    className="h-7 w-full text-xs justify-center"
                    onClick={() => {
                      onChange(hour, m);
                    }}
                  >
                    {m}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
