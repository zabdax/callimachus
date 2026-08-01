import clsx from 'clsx';
import {
  PLAN_CATALOG,
  formatBDT,
  planPerMonth,
  type PlanId,
} from './plans';

type Props = {
  currentPlanId: PlanId | null;
  onChoose: (id: PlanId) => void;
};

export function PlansGrid({ currentPlanId, onChoose }: Props) {
  return (
    <div
      className="grid gap-4 md:grid-cols-4"
      role="list"
      aria-label="Subscription plans"
    >
      {PLAN_CATALOG.map((p) => {
        const active = p.id === currentPlanId;
        return (
          <div
            key={p.id}
            data-testid="plan-card"
            role="listitem"
            className={clsx(
              'rounded-lg border p-4 flex flex-col gap-3 bg-white shadow-sm',
              active && 'border-primary ring-2 ring-primary/30',
              !active && 'border-slate-200',
            )}
          >
            <header className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {p.months} {p.months === 1 ? 'month' : 'months'}
              </h3>
              {p.badge && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {p.badge}
                </span>
              )}
            </header>
            <div>
              <div className="text-2xl font-bold" data-testid="plan-price">
                {formatBDT(p.priceBDT)}
              </div>
              <div className="text-xs text-slate-500" data-testid="plan-per-month">
                {formatBDT(planPerMonth(p.id))}/mo
              </div>
            </div>
            <button
              type="button"
              data-testid="plan-choose"
              disabled={active}
              onClick={() => onChoose(p.id)}
              className="mt-auto rounded-md bg-primary text-white py-2 text-sm font-medium disabled:opacity-50"
            >
              {active ? 'Current plan' : 'Choose plan'}
            </button>
          </div>
        );
      })}
    </div>
  );
}