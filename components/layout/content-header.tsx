"use client";

import { usePathname } from "next/navigation";
import {
  Activity,
  CheckSquare,
  DollarSign,
  Lock,
  Settings,
  LayoutDashboard,
  Receipt,
  Languages,
  Blend,
  MapPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT, useLanguage } from "@/lib/i18n/context";
import type { TranslationKey } from "@/lib/i18n/types";

const PAGE_META: {
  href: string;
  labelKey: TranslationKey;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}[] = [
  { href: "/dashboard", labelKey: "sidebar.dashboard", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/mind-map", labelKey: "sidebar.mindMap", icon: MapPlus },
  { href: "/dashboard/todos", labelKey: "sidebar.todos", icon: CheckSquare },
  { href: "/dashboard/finance", labelKey: "sidebar.finance", icon: DollarSign },
  { href: "/dashboard/plans", labelKey: "sidebar.plans", icon: Blend },
  { href: "/dashboard/invoice", labelKey: "sidebar.invoice", icon: Receipt },
  { href: "/dashboard/vault", labelKey: "sidebar.vault", icon: Lock },
  { href: "/dashboard/settings", labelKey: "sidebar.settings", icon: Settings },
];

export function ContentHeader() {
  const pathname = usePathname();
  const t = useT();
  const { lang, setLang } = useLanguage();

  const toggleLang = () => setLang(lang === "en" ? "zh" : "en");

  const current = PAGE_META.find((p) =>
    p.exact ? pathname === p.href : pathname.startsWith(p.href)
  );
  const Icon = current?.icon ?? Activity;
  const title = current ? t(current.labelKey) : "";

  return (
    <header className="sticky top-0 z-10 flex items-center h-14 px-8 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      </div>

      <div className="ml-auto">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground"
          onClick={toggleLang}
        >
          <Languages className="h-4 w-4" />
          <span className="text-sm">{lang === "en" ? "中文" : "English"}</span>
        </Button>
      </div>
    </header>
  );
}
