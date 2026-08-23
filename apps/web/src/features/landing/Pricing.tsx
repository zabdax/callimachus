import { useTranslation } from 'react-i18next';
import { PLAN_CATALOG, formatBDT, planPerMonth, type PlanBadge } from '@/features/subscription/plans';

export function Pricing() {
  const { t } = useTranslation();

  const steps: Array<{ no: string; title: string; body: string }> = [
    { no: '1', title: t('landing.pricing.step1.title'), body: t('landing.pricing.step1.body') },
    { no: '2', title: t('landing.pricing.step2.title'), body: t('landing.pricing.step2.body') },
    { no: '3', title: t('landing.pricing.step3.title'), body: t('landing.pricing.step3.body') },
  ];

  const badgeLabel = (badge: PlanBadge): string | null =>
    badge === 'Popular' ? t('landing.pricing.popular') : badge === 'Best Value' ? t('landing.pricing.bestValue') : null;

  return (
    <section className="lpg-pricing lpg__wrap" id="pricing">
      <header className="lpg-pricing__head">
        <p className="lpg__eyebrow" data-lpg-reveal>{t('landing.pricing.eyebrow')}</p>
        <h2 className="lpg-pricing__title" data-lpg-reveal style={{ ['--lpg-d' as string]: '70ms' }}>
          {t('landing.pricing.title')}
        </h2>
        <p className="lpg-pricing__lede" data-lpg-reveal style={{ ['--lpg-d' as string]: '140ms' }}>
          {t('landing.pricing.lede')}
        </p>
      </header>

      <div className="lpg-plans">
        {PLAN_CATALOG.map((plan, index) => {
          const badge = badgeLabel(plan.badge);
          return (
            <div
              key={plan.id}
              className={`lpg-plan${plan.badge === 'Best Value' ? ' lpg-plan--best' : ''}`}
              data-lpg-reveal
              style={{ ['--lpg-d' as string]: `${index * 80}ms` }}
            >
              {badge && (
                <span className={`lpg-plan__badge${plan.badge === 'Best Value' ? ' lpg-plan__badge--best' : ' lpg-plan__badge--popular'}`}>
                  {badge}
                </span>
              )}
              <span className="lpg-plan__mo">
                {t('landing.pricing.months', { count: plan.months })}
              </span>
              <span className="lpg-plan__price">{formatBDT(plan.priceBDT)}</span>
              <span className="lpg-plan__per">
                {plan.months > 1 && `${formatBDT(planPerMonth(plan.id))}${t('landing.pricing.perMonth')}`}
              </span>
            </div>
          );
        })}
      </div>

      <div className="lpg-bkash" data-lpg-reveal>
        <div>
          <h3 style={{ fontSize: 'clamp(1.3rem, 2vw, 1.6rem)' }}>{t('landing.pricing.payWith')}</h3>
          <p style={{ color: 'var(--lpg-dim)', marginTop: 10, maxWidth: '38ch' }}>
            {t('landing.pricing.bkashNote')}
          </p>
        </div>
        <div className="lpg-bkash__steps">
          {steps.map((step) => (
            <div key={step.no} className="lpg-bkash__step">
              <span className="lpg-bkash__no">{step.no}</span>
              <p><strong>{step.title}</strong>{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
