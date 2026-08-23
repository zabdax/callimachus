import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Constellation } from './Constellation';
import { ArrowDown, GoogleG } from './icons';
import { scrollToEl, useRafScroll } from './scroll';

export function Hero() {
  const { t } = useTranslation();
  const beamRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useRafScroll((scrollY) => {
    if (beamRef.current) beamRef.current.style.transform = `rotate(24deg) translateY(${scrollY * 0.16}px)`;
    if (stageRef.current) stageRef.current.style.translate = `0 ${-scrollY * 0.05}px`;
  });

  const goWalk = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const target = document.getElementById('tracker');
    if (target) scrollToEl(target);
  };

  return (
    <section className="lpg-hero" id="top">
      <div className="lpg-hero__beam" ref={beamRef} aria-hidden="true" />
      <div className="lpg-hero__grid" aria-hidden="true" />

      <div className="lpg__wrap lpg-hero__inner">
        <div>
          <p className="lpg__eyebrow lpg__eyebrow--amber" data-lpg-reveal>
            {t('landing.hero.eyebrow')}
          </p>
          <h1 className="lpg-hero__title" data-lpg-reveal style={{ ['--lpg-d' as string]: '80ms' }}>
            {t('landing.hero.title1')}{' '}
            <span className="lpg__aurora-text">{t('landing.hero.title2')}</span>
          </h1>
          <p className="lpg-hero__sub" data-lpg-reveal style={{ ['--lpg-d' as string]: '160ms' }}>
            {t('landing.hero.sub')}
          </p>

          <div className="lpg-hero__actions" data-lpg-reveal style={{ ['--lpg-d' as string]: '240ms' }}>
            <Link to="/sign-in" className="lpg-btn lpg-btn--primary">
              <GoogleG />
              {t('landing.cta')}
            </Link>
            <a href="#tracker" className="lpg-btn lpg-btn--ghost" onClick={goWalk}>
              {t('landing.hero.secondary')}
              <ArrowDown size={15} />
            </a>
          </div>

          <p className="lpg-hero__facts" data-lpg-reveal style={{ ['--lpg-d' as string]: '320ms' }}>
            <span><i />{t('landing.hero.factTrial')}</span>
            <span><i />{t('landing.hero.factPrice')}</span>
            <span><i />{t('landing.hero.factOffline')}</span>
          </p>
        </div>

        <div className="lpg-hero__stage" ref={stageRef}>
          <Constellation className="lpg-hero__canvas" />
          <p className="lpg-hero__stage-hint">{t('landing.hero.stageHint')}</p>
        </div>
      </div>

      <div className="lpg-hero__scrollcue" aria-hidden="true">
        <span>{t('landing.hero.scroll')}</span>
        <i />
      </div>
    </section>
  );
}
