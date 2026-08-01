import { describe, it, expect } from 'vitest';
import {
  PLAN_CATALOG,
  planPriceTotal,
  planPerMonth,
  planExpiresAt,
  cheapestPlan,
  formatBDT,
} from '@/features/subscription/plans';

describe('subscription plans', () => {
  it('exposes 4 plans with the agreed prices', () => {
    expect(PLAN_CATALOG).toHaveLength(4);
    expect(PLAN_CATALOG.map((p) => p.months)).toEqual([1, 3, 6, 12]);
    expect(PLAN_CATALOG.map((p) => p.priceBDT)).toEqual([50, 140, 270, 500]);
  });

  it('flags the 3-month plan as Popular', () => {
    const popular = PLAN_CATALOG.find((p) => p.badge === 'Popular');
    expect(popular?.months).toBe(3);
  });

  it('flags the 6-month plan as Best Value', () => {
    const best = PLAN_CATALOG.find((p) => p.badge === 'Best Value');
    expect(best?.months).toBe(6);
  });

  it('planPriceTotal returns the price for the chosen plan', () => {
    expect(planPriceTotal('1m')).toBe(50);
    expect(planPriceTotal('12m')).toBe(500);
  });

  it('planPerMonth rounds to nearest taka and rewards longer plans', () => {
    expect(planPerMonth('1m')).toBe(50);
    expect(planPerMonth('3m')).toBe(47); // 140 / 3 = 46.67 -> 47
    expect(planPerMonth('6m')).toBe(45);
    expect(planPerMonth('12m')).toBe(42); // 500 / 12 = 41.67 -> 42
    expect(planPerMonth('3m')).toBeLessThan(planPerMonth('1m'));
  });

  it('planExpiresAt returns now + months * 30 days in ms', () => {
    const start = Date.UTC(2026, 0, 1); // 2026-01-01
    expect(planExpiresAt('1m', start)).toBe(start + 30 * 86_400_000);
    expect(planExpiresAt('12m', start)).toBe(start + 360 * 86_400_000);
  });

  it('cheapestPlan returns the lowest per-month plan', () => {
    expect(cheapestPlan().months).toBe(12);
  });

  it('formatBDT renders with ৳ prefix and grouping', () => {
    expect(formatBDT(50)).toBe('৳50');
    expect(formatBDT(500)).toBe('৳500');
    expect(formatBDT(140)).toBe('৳140');
  });
});