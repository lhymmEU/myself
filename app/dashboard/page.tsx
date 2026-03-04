"use client";

import { BentoGrid } from "@/components/layout/bento-grid";
import { BentoCard } from "@/components/layout/bento-card";
import {
  Brain,
  CheckSquare,
  DollarSign,
  FileText,
  Repeat,
  Target,
  CalendarDays,
  Zap,
  Lock,
} from "lucide-react";
import { MindMapPreview } from "@/components/mind-map/mind-map-preview";
import { TodoPreview } from "@/components/todos/todo-preview";
import { FinancePreview } from "@/components/finance/finance-preview";
import { PlansPreview } from "@/components/plans/plans-preview";
import { HabitsPreview } from "@/components/habits/habits-preview";
import { GoalsPreview } from "@/components/goals/goals-preview";
import { CalendarWidget } from "@/components/shared/calendar-widget";
import { QuickCapture } from "@/components/shared/quick-capture";
import { VaultPreview } from "@/components/vault/vault-preview";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Your life at a glance
        </p>
      </div>

      <BentoGrid>
        <BentoCard
          title="Mind Map"
          icon={Brain}
          href="/dashboard/mind-map"
          className="md:col-span-2 md:row-span-2"
        >
          <MindMapPreview />
        </BentoCard>

        <BentoCard
          title="Todos"
          icon={CheckSquare}
          href="/dashboard/todos"
          className="md:row-span-1"
        >
          <TodoPreview />
        </BentoCard>

        <BentoCard
          title="Quick Capture"
          icon={Zap}
          className="md:row-span-1"
        >
          <QuickCapture />
        </BentoCard>

        <BentoCard
          title="Finance"
          icon={DollarSign}
          href="/dashboard/finance"
        >
          <FinancePreview />
        </BentoCard>

        <BentoCard title="Goals" icon={Target} href="/dashboard/goals">
          <GoalsPreview />
        </BentoCard>

        <BentoCard title="Habits" icon={Repeat} href="/dashboard/habits">
          <HabitsPreview />
        </BentoCard>

        <BentoCard
          title="Plans"
          icon={FileText}
          href="/dashboard/plans"
          className="md:col-span-2"
        >
          <PlansPreview />
        </BentoCard>

        <BentoCard title="Vault" icon={Lock} href="/dashboard/vault">
          <VaultPreview />
        </BentoCard>

        <BentoCard title="Upcoming" icon={CalendarDays}>
          <CalendarWidget />
        </BentoCard>
      </BentoGrid>
    </div>
  );
}
