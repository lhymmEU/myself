"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Activity,
  CheckSquare,
  DollarSign,
  Lock,
  Settings,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  Shell,
  Receipt,
  Blend,
  MapPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { useState } from "react";
import { useT } from "@/lib/i18n/context";
import type { TranslationKey } from "@/lib/i18n/types";

const NAV_ITEMS: { href: string; labelKey: TranslationKey; icon: typeof LayoutDashboard }[] = [
  { href: "/dashboard", labelKey: "sidebar.dashboard", icon: LayoutDashboard },
  { href: "/dashboard/mind-map", labelKey: "sidebar.mindMap", icon: MapPlus },
  { href: "/dashboard/todos", labelKey: "sidebar.todos", icon: CheckSquare },
  { href: "/dashboard/finance", labelKey: "sidebar.finance", icon: DollarSign },
  { href: "/dashboard/plans", labelKey: "sidebar.plans", icon: Blend },
  { href: "/dashboard/invoice", labelKey: "sidebar.invoice", icon: Receipt },
  { href: "/dashboard/vault", labelKey: "sidebar.vault", icon: Lock },
  { href: "/dashboard/claw", labelKey: "sidebar.myClaw", icon: Shell },
];

const BOTTOM_ITEMS: { href: string; labelKey: TranslationKey; icon: typeof Settings }[] = [
  { href: "/dashboard/settings", labelKey: "sidebar.settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const t = useT();

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex flex-col border-r border-border bg-sidebar h-screen sticky top-0 transition-all duration-200",
          collapsed ? "w-16" : "w-56"
        )}
      >
        <div className="titlebar-drag flex items-center h-14 pt-5 px-4 border-b border-border">
          {!collapsed && (
            <Link href="/dashboard" className="titlebar-no-drag flex items-center gap-2 py-4">
              <Activity className="h-6 w-6 text-primary" />
              <span className="font-semibold text-lg">{t("sidebar.title")}</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={cn("titlebar-no-drag h-8 w-8 shrink-0", collapsed ? "mx-auto" : "ml-auto")}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        <nav className="flex-1 flex flex-col gap-1 p-2">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const label = t(item.labelKey);
            const link = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  collapsed && "justify-center px-2"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{label}</TooltipContent>
                </Tooltip>
              );
            }

            return link;
          })}
        </nav>

        <div className="border-t border-border p-2">
          {BOTTOM_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const label = t(item.labelKey);
            const link = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  collapsed && "justify-center px-2"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{label}</TooltipContent>
                </Tooltip>
              );
            }

            return link;
          })}

        </div>
      </aside>
    </TooltipProvider>
  );
}
