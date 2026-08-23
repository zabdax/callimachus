import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PaceMock, SyllabusMock, TimerMock } from './mocks';
import { useMediaQuery, useTilt } from './scroll';

/** Browser-chrome glass frame that carries an app mockup. */
function AppFrame({ url, children }: { url: string; children: React.ReactNode }) {
  const tiltRef = useTilt(2.6);
  return (
    <div className="lpg-frame" ref={tiltRef}>
      <div className="lpg-frame__bar" aria-hidden="true">
        <span className="lpg-frame__dots"><i /><i /><i /></span>
        <span className="lpg-frame__url">{url}</span>
      </div>
      <div className="lpg-frame__body">{children}</div>
    </div>
  );
}

type Step = {
  no: string;
  title: string;
  body: string;
  url: string;
  screen: React.ReactNode;
};

export function Walkthrough() {
  const { t } = useTranslation();
  const isPinned = useMediaQuery('(min-width: 900px) and (prefers-reduced-motion: no-preference)');

  const steps: Step[] = [
    {
      no: '01',
      title: t('landing.walk.step1.title'),
      body: t('landing.walk.step1.body'),
      url: 'hsc.app/study',
      screen: <TimerMock />,
    },
    {
      no: '02',
      title: t('landing.walk.step2.title'),
      body: t('landing.walk.step2.body'),
      url: 'hsc.app/syllabus',
      screen: <SyllabusMock />,
    },
    {
      no: '03',
      title: t('landing.walk.step3.title'),
      body: t('landing.walk.step3.body'),
      url: 'hsc.app/overview',
      screen: <PaceMock />,
    },
  ];

  const pinWrapRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!isPinned) {
      setActive(0);
      return;
    }
    let raf = 0;
    const frame = () => {
      raf = 0;
      const el = pinWrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const span = Math.max(1, rect.height - window.innerHeight);
      const p = Math.min(1, Math.max(0, -rect.top / span));
      if (railRef.current) railRef.current.style.height = `${(p * 100).toFixed(2)}%`;
      const step = Math.min(steps.length - 1, Math.floor(p * steps.length));
      setActive((prev) => (prev === step ? prev : step));
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    kick();
    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', kick);
    return () => {
      window.removeEventListener('scroll', kick);
      window.removeEventListener('resize', kick);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [isPinned, steps.length]);

  return (
    <section className="lpg-walk" id="tracker">
      <div className="lpg-walk__grid-bg" aria-hidden="true" />

      <header className="lpg__wrap lpg-walk__head">
        <p className="lpg__eyebrow" data-lpg-reveal>{t('landing.walk.eyebrow')}</p>
        <h2 className="lpg-walk__title" data-lpg-reveal style={{ ['--lpg-d' as string]: '70ms' }}>
          {t('landing.walk.title')}
        </h2>
        <p className="lpg-walk__lede" data-lpg-reveal style={{ ['--lpg-d' as string]: '140ms' }}>
          {t('landing.walk.lede')}
        </p>
      </header>

      {isPinned ? (
        <div ref={pinWrapRef} style={{ height: '320vh' }}>
          <div style={{ position: 'sticky', top: 0, height: '100vh', display: 'flex', alignItems: 'center' }}>
            <div className="lpg__wrap lpg-walk__cols">
              <div className="lpg-walk__steps" style={{ paddingLeft: 26 }}>
                <div className="lpg-walk__rail" aria-hidden="true"><i ref={railRef} /></div>
                {steps.map((step, index) => (
                  <article key={step.no} className={`lpg-step${index === active ? ' is-active' : ''}`}>
                    <span className="lpg-step__no">{step.no}</span>
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                  </article>
                ))}
              </div>
              <AppFrame url={steps[active]?.url ?? ''}>
                {steps.map((step, index) => (
                  <div key={step.no} className={`lpg-screen${index === active ? ' is-active' : ''}`}>
                    {step.screen}
                  </div>
                ))}
              </AppFrame>
            </div>
          </div>
        </div>
      ) : (
        <div className="lpg__wrap lpg-walk__body">
          <div style={{ display: 'block' }}>
            {steps.map((step, index) => (
              <div
                key={step.no}
                data-lpg-reveal
                style={{ display: 'grid', gap: 22, margin: '64px 0', ['--lpg-d' as string]: `${index * 70}ms` }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <span className="lpg-step__no">{step.no}</span>
                  <h3 style={{ fontSize: 'clamp(1.35rem, 4vw, 1.9rem)' }}>{step.title}</h3>
                  <p style={{ color: 'var(--lpg-dim)' }}>{step.body}</p>
                </div>
                <AppFrame url={step.url}>
                  <div className="lpg-screen is-active">{step.screen}</div>
                </AppFrame>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
