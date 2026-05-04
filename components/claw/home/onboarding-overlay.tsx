"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bot, Sparkles, MessageSquare, ChevronRight } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "claw-home-onboarding-done";

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

interface OnboardingOverlayProps {
  /** Force-show the overlay regardless of localStorage flag. */
  forceOpen?: boolean;
  /** Show the "Connect your Claw" CTA on the final step. */
  showSetupCta?: boolean;
}

/**
 * First-run overlay shown to new users with no connection. The final
 * step nudges them into `/dashboard/claw/setup` so onboarding ends in
 * a connected, usable companion. Subsequent visits skip the overlay
 * (tracked via `localStorage`).
 */
export function OnboardingOverlay({
  forceOpen,
  showSetupCta,
}: OnboardingOverlayProps) {
  const t = useT();
  // Initial visibility: synchronous read on first render. We do the
  // localStorage probe lazily so SSR doesn't mismatch — `null` means
  // "not yet decided" until the post-mount effect resolves.
  const [visible, setVisible] = useState<boolean | null>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const done = localStorage.getItem(STORAGE_KEY);
    const next = forceOpen ? true : !done;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration of overlay visibility against localStorage; safe because there's no incoming render-time signal we can derive `visible` from synchronously without breaking SSR.
    setVisible(next);
  }, [forceOpen]);

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

  if (visible !== true) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

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
            {isLast && showSetupCta ? (
              <Button size="sm" asChild onClick={dismiss}>
                <Link href="/dashboard/claw/setup">
                  {t("claw.home.cta.button")}
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            ) : (
              <Button size="sm" onClick={next}>
                {isLast ? (
                  t("claw.dm.onboarding.getStarted")
                ) : (
                  <>
                    {t("claw.dm.onboarding.next")}
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
