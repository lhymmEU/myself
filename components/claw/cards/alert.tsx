import { AlertTriangle, Info, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  level: "info" | "warn" | "error";
  message: string;
}

const STYLES: Record<Props["level"], string> = {
  info: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  warn: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  error: "border-destructive/40 bg-destructive/10 text-destructive",
};

const ICONS: Record<Props["level"], typeof Info> = {
  info: Info,
  warn: AlertTriangle,
  error: AlertCircle,
};

export function AlertCard({ level, message }: Props) {
  const Icon = ICONS[level];
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border p-3 text-sm",
        STYLES[level],
      )}
    >
      <Icon className="h-4 w-4 shrink-0 mt-0.5" />
      <p className="break-words">{message}</p>
    </div>
  );
}
