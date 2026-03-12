"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Brain,
  CheckSquare,
  DollarSign,
  FileText,
  Lock,
  Settings,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  Shell,
  Receipt,
  Languages,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { useState } from "react";
import { useT, useLanguage } from "@/lib/i18n/context";
import type { TranslationKey } from "@/lib/i18n/types";

const NAV_ITEMS: { href: string; labelKey: TranslationKey; icon: typeof LayoutDashboard }[] = [
  { href: "/dashboard", labelKey: "sidebar.dashboard", icon: LayoutDashboard },
  { href: "/dashboard/mind-map", labelKey: "sidebar.mindMap", icon: Brain },
  { href: "/dashboard/todos", labelKey: "sidebar.todos", icon: CheckSquare },
  { href: "/dashboard/finance", labelKey: "sidebar.finance", icon: DollarSign },
  { href: "/dashboard/plans", labelKey: "sidebar.plans", icon: FileText },
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
  const { lang, setLang } = useLanguage();

  const toggleLang = () => setLang(lang === "en" ? "zh" : "en");

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex flex-col border-r border-border bg-sidebar h-screen sticky top-0 transition-all duration-200",
          collapsed ? "w-16" : "w-56"
        )}
      >
        <div className="flex items-center h-14 px-4 border-b border-border">
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
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

          {/* Language switcher */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-full h-9 mt-1"
                  onClick={toggleLang}
                >
                  <Languages className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {lang === "en" ? "切换到中文" : "Switch to English"}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 px-3 py-2 mt-1 text-sm font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              onClick={toggleLang}
            >
              <Languages className="h-4 w-4 shrink-0" />
              <span>{lang === "en" ? "中文" : "English"}</span>
            </Button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
