"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { useT } from "@/lib/i18n/context";

interface PlanSummary {
  id: string;
  title: string;
  updatedAt: number;
}

export function PlansPreview() {
  const t = useT();
  const [plans, setPlans] = useState<PlanSummary[]>([]);

  useEffect(() => {
    fetch("/api/data?module=plans&action=list")
      .then((r) => r.json())
      .then((data) => setPlans(data.slice(0, 4)))
      .catch(() => {});
  }, []);

  if (plans.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("plans.noPlansYet")}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {plans.map((plan) => (
        <div
          key={plan.id}
          className="flex items-center gap-2 p-2 rounded-md bg-muted/50"
        >
          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-sm truncate">{plan.title}</span>
        </div>
      ))}
    </div>
  );
}
