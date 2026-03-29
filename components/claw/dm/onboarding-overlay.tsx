"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bot, Sparkles, MessageSquare, ChevronRight } from "lucide-react";
import { useT } from "@/lib/i18n/context";

const STORAGE_KEY = "claw-dm-onboarding-done";

interface Step {
  icon: React.ReactNode;
  titleKey: string;
  bodyKey: string;
}

const STEPS: Step[] = [
  {
    icon: <Bot className="h-10 w-10 text-foreground" />,
    titleKey: "claw.dm.onboarding.step1Title",
    bodyKey: "claw.dm.onboarding.step1Body",
  },
  {
    icon: <Sparkles className="h-10 w-10 text-foreground" />,
    titleKey: "claw.dm.onboarding.step2Title",
    bodyKey: "claw.dm.onboarding.step2Body",
  },
  {
    icon: <MessageSquare className="h-10 w-10 text-foreground" />,
    titleKey: "claw.dm.onboarding.step3Title",
    bodyKey: "claw.dm.onboarding.step3Body",
  },
];

export function OnboardingOverlay() {
  const t = useT();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) setVisible(true);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "1");
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  };

  if (!visible) return null;

  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-8 shadow-lg">
        <div className="flex flex-col items-center text-center space-y-4">
          {current.icon}
          <h3 className="text-lg font-semibold">
            {t(current.titleKey as Parameters<typeof t>[0])}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t(current.bodyKey as Parameters<typeof t>[0])}
          </p>
        </div>

        <div className="flex items-center justify-between mt-8">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${
                  i === step ? "bg-foreground" : "bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={dismiss}>
              {t("claw.dm.onboarding.skip")}
            </Button>
            <Button size="sm" onClick={next}>
              {step < STEPS.length - 1 ? (
                <>
                  {t("claw.dm.onboarding.next")}
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </>
              ) : (
                t("claw.dm.onboarding.getStarted")
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
