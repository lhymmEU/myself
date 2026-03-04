"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Monitor } from "lucide-react";

const ACCENT_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#64748b",
];

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

interface AppearanceConfigProps {
  settings: Record<string, string>;
  onUpdate: (key: string, value: string) => void;
}

function applyTheme(theme: string) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else if (theme === "light") {
    root.classList.remove("dark");
  } else {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
  }
}

export function AppearanceConfig({ settings, onUpdate }: AppearanceConfigProps) {
  const currentTheme = settings.theme ?? "system";
  const currentAccent = settings.accent_color ?? "#6366f1";

  const handleThemeChange = (theme: string) => {
    applyTheme(theme);
    onUpdate("theme", theme);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sun className="size-5" />
          Appearance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>Theme</Label>
          <div className="flex gap-2">
            {THEMES.map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                variant={currentTheme === value ? "default" : "outline"}
                size="sm"
                onClick={() => handleThemeChange(value)}
                className="flex-1 gap-2"
              >
                <Icon className="size-4" />
                {label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label>Accent Color</Label>
          <div className="flex gap-2 flex-wrap">
            {ACCENT_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => onUpdate("accent_color", color)}
                className="size-8 rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-110"
                style={{
                  backgroundColor: color,
                  boxShadow:
                    currentAccent === color
                      ? `0 0 0 2px var(--background), 0 0 0 4px ${color}`
                      : undefined,
                }}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
