"use client";

import { BentoGrid } from "@/components/layout/bento-grid";
import { BentoCard } from "@/components/layout/bento-card";
import {
  CheckSquare,
  DollarSign,
  FileText,
  Zap,
  Lock,
  Shell,
} from "lucide-react";
import { TodoPreview } from "@/components/todos/todo-preview";
import { FinancePreview } from "@/components/finance/finance-preview";
import { PlansPreview } from "@/components/plans/plans-preview";
import { QuickCapture } from "@/components/shared/quick-capture";
import { VaultPreview } from "@/components/vault/vault-preview";
import { ClawPreview } from "@/components/claw/claw-preview";
import { useT } from "@/lib/i18n/context";

export default function DashboardPage() {
  const t = useT();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.title")}</h1>
        <p className="text-muted-foreground">
          {t("dashboard.subtitle")}
        </p>
      </div>

      <BentoGrid>
        <BentoCard
          title={t("dashboard.cards.todos")}
          icon={CheckSquare}
          href="/dashboard/todos"
          className="md:row-span-1"
        >
          <TodoPreview />
        </BentoCard>

        <BentoCard
          title={t("dashboard.cards.quickCapture")}
          icon={Zap}
          className="md:row-span-1"
        >
          <QuickCapture />
        </BentoCard>

        <BentoCard
          title={t("dashboard.cards.finance")}
          icon={DollarSign}
          href="/dashboard/finance"
        >
          <FinancePreview />
        </BentoCard>

        <BentoCard
          title={t("dashboard.cards.plans")}
          icon={FileText}
          href="/dashboard/plans"
          className="md:col-span-2"
        >
          <PlansPreview />
        </BentoCard>

        <BentoCard title={t("dashboard.cards.vault")} icon={Lock} href="/dashboard/vault">
          <VaultPreview />
        </BentoCard>

        <BentoCard title={t("dashboard.cards.myClaw")} icon={Shell} href="/dashboard/claw">
          <ClawPreview />
        </BentoCard>
      </BentoGrid>
    </div>
  );
}
