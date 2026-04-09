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
  ChevronDown,
  Shell,
  Receipt,
  Blend,
  MapPlus,
  User,
  Bookmark,
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

interface NavItem {
  href: string;
  labelKey: TranslationKey;
  icon: typeof LayoutDashboard;
}

const MYSELF_CHILDREN: NavItem[] = [
  { href: "/dashboard/mind-map", labelKey: "sidebar.mindMap", icon: MapPlus },
  { href: "/dashboard/todos", labelKey: "sidebar.todos", icon: CheckSquare },
  { href: "/dashboard/finance", labelKey: "sidebar.finance", icon: DollarSign },
  { href: "/dashboard/plans", labelKey: "sidebar.plans", icon: Blend },
  { href: "/dashboard/invoice", labelKey: "sidebar.invoice", icon: Receipt },
  { href: "/dashboard/vault", labelKey: "sidebar.vault", icon: Lock },
  { href: "/dashboard/marked", labelKey: "sidebar.marked", icon: Bookmark },
];

const BOTTOM_ITEMS: NavItem[] = [
  { href: "/dashboard/settings", labelKey: "sidebar.settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const t = useT();

  const isMyselfChildActive = MYSELF_CHILDREN.some((item) =>
    pathname.startsWith(item.href)
  );
  const [myselfOpen, setMyselfOpen] = useState(isMyselfChildActive);

  const effectiveOpen = isMyselfChildActive || myselfOpen;

  const renderLink = (item: NavItem, isActive: boolean) => {
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
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex flex-col border-r border-border bg-sidebar h-screen sticky top-0 transition-all duration-200",
          collapsed ? "w-16" : "w-56"
        )}
      >
        <div className="flex items-center h-14 pt-5 px-4 border-b border-border">
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-2 py-4">
              <Activity className="h-6 w-6 text-primary" />
              <span className="font-semibold text-lg">{t("sidebar.title")}</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8 shrink-0", collapsed ? "mx-auto" : "ml-auto")}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        <nav className="flex-1 flex flex-col justify-center gap-1 p-2">
          {/* Dashboard */}
          {renderLink(
            { href: "/dashboard", labelKey: "sidebar.dashboard", icon: LayoutDashboard },
            pathname === "/dashboard"
          )}

          {/* Myself group */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setMyselfOpen(!effectiveOpen)}
                  className={cn(
                    "flex items-center justify-center rounded-md px-2 py-2 text-sm font-medium transition-colors",
                    isMyselfChildActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <User className="h-4 w-4 shrink-0" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{t("sidebar.myself")}</TooltipContent>
            </Tooltip>
          ) : (
            <div>
              <button
                onClick={() => setMyselfOpen(!effectiveOpen)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isMyselfChildActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <User className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">{t("sidebar.myself")}</span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                    !effectiveOpen && "-rotate-90"
                  )}
                />
              </button>

              {effectiveOpen && (
                <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-2">
                  {MYSELF_CHILDREN.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return renderLink(item, isActive);
                  })}
                </div>
              )}
            </div>
          )}

          {/* My Claw */}
          {renderLink(
            { href: "/dashboard/claw", labelKey: "sidebar.myClaw", icon: Shell },
            pathname.startsWith("/dashboard/claw")
          )}
        </nav>

        <div className="border-t border-border p-2">
          {BOTTOM_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return renderLink(item, isActive);
          })}
        </div>
      </aside>
    </TooltipProvider>
  );
}
