export type PlanId = '1m' | '3m' | '6m' | '12m';
export type PlanBadge = 'Popular' | 'Best Value' | null;

export type Plan = {
  id: PlanId;
  months: number;
  priceBDT: number;
  badge: PlanBadge;
};

export const PLAN_CATALOG: Plan[] = [
  { id: '1m', months: 1, priceBDT: 50, badge: null },
  { id: '3m', months: 3, priceBDT: 140, badge: 'Popular' },
  { id: '6m', months: 6, priceBDT: 270, badge: 'Best Value' },
  { id: '12m', months: 12, priceBDT: 500, badge: null },
];

export function planPriceTotal(id: PlanId): number {
  return PLAN_CATALOG.find((p) => p.id === id)!.priceBDT;
}

export function planPerMonth(id: PlanId): number {
  const p = PLAN_CATALOG.find((plan) => plan.id === id)!;
  return Math.round(p.priceBDT / p.months);
}

export function planExpiresAt(id: PlanId, nowMs: number): number {
  const p = PLAN_CATALOG.find((plan) => plan.id === id)!;
  return nowMs + p.months * 30 * 86_400_000;
}

export function cheapestPlan(): Plan {
  return PLAN_CATALOG.reduce((best, p) =>
    planPerMonth(p.id) < planPerMonth(best.id) ? p : best,
  );
}

export function formatBDT(amount: number): string {
  return `৳${amount.toLocaleString('en-IN')}`;
}