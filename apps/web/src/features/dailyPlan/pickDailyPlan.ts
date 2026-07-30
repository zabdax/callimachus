export type PlanTask = { id: string; type: string; minutes: number; scheduledFor: Date };

export function pickDailyPlan(tasks: PlanTask[], budgetMinutes: number): PlanTask[] {
  const sorted = [...tasks].sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
  const out: PlanTask[] = [];
  let used = 0;
  for (const t of sorted) {
    if (used + t.minutes > budgetMinutes) continue;
    out.push(t);
    used += t.minutes;
    if (out.length === 4) break;
  }
  return out;
}
