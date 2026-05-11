import type { ClawCard } from "@/lib/claw/messages";

const STEP_KEY = /^step_(\d+)$/;

/**
 * Turn flat string plan data into ClawCard[] for {@link CardRenderer}.
 * Convention: step_1..step_N → steps card; summary → alert; remainder → key-value.
 */
export function flatPlanToCards(plan: Record<string, string>): ClawCard[] {
  const cards: ClawCard[] = [];
  const reserved = new Set<string>();

  const title = plan.title?.trim();
  const summary = plan.summary?.trim();

  const stepEntries = Object.entries(plan)
    .filter(([k]) => STEP_KEY.test(k))
    .sort((a, b) => {
      const na = Number(STEP_KEY.exec(a[0])?.[1] ?? 0);
      const nb = Number(STEP_KEY.exec(b[0])?.[1] ?? 0);
      return na - nb;
    })
    .filter(([, v]) => v.trim().length > 0);

  if (summary) {
    cards.push({
      kind: "alert",
      level: "info",
      message: title ? `${title}\n\n${summary}` : summary,
    });
    reserved.add("summary");
    if (title) reserved.add("title");
  } else if (title) {
    cards.push({
      kind: "alert",
      level: "info",
      message: title,
    });
    reserved.add("title");
  }

  if (stepEntries.length > 0) {
    const items = stepEntries.map(([key, label], index) => {
      const m = STEP_KEY.exec(key);
      const n = m ? Number(m[1]) : index + 1;
      const doneKey = `done_step_${n}`;
      const raw = plan[doneKey];
      const done = raw === "true" || raw === "1" || raw === "yes";
      reserved.add(key);
      reserved.add(doneKey);
      return { label: label.trim(), done };
    });
    cards.push({
      kind: "steps",
      title: "Steps",
      items,
    });
  }

  const kvPairs = Object.entries(plan)
    .filter(([k]) => !reserved.has(k) && !/^done_step_\d+$/.test(k))
    .map(([key, value]) => ({
      key: key.replace(/_/g, " "),
      value: value.trim(),
    }))
    .filter((p) => p.value.length > 0);

  if (kvPairs.length > 0) {
    cards.push({
      kind: "key-value",
      title: "Details",
      items: kvPairs,
    });
  }

  return cards;
}
