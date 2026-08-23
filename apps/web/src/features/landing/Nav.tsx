import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StarMark } from './icons';
import { scrollToEl, useRafScroll } from './scroll';

export function Nav() {
  const { t } = useTranslation();
  const [stuck, setStuck] = useState(false);

  useRafScroll((scrollY) => {
    const next = scrollY > 28;
    setStuck((prev) => (prev === next ? prev : next));
  });

  const go = (id: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const target = document.getElementById(id);
    if (target) scrollToEl(target);
  };

  return (
    <header className={`lpg-nav${stuck ? ' is-stuck' : ''}`}>
      <div className="lpg-nav__bar">
        <a href="#top" className="lpg-nav__brand" onClick={go('top')} aria-label="HSC Crackers — back to top">
          <StarMark size={17} />
          <span>HSC&nbsp;Crackers</span>
        </a>
        <nav className="lpg-nav__links" aria-label="Landing sections">
          <a href="#tracker" onClick={go('tracker')}>{t('landing.nav.tracker')}</a>
          <a href="#method" onClick={go('method')}>{t('landing.nav.method')}</a>
          <a href="#pricing" onClick={go('pricing')}>{t('landing.nav.pricing')}</a>
        </nav>
        <div className="lpg-nav__cta">
          <Link to="/sign-in" className="lpg-btn lpg-btn--ghost lpg-btn--sm">
            {t('landing.nav.signIn')}
          </Link>
          <Link to="/sign-in" className="lpg-btn lpg-btn--primary lpg-btn--sm">
            {t('landing.nav.start')}
          </Link>
        </div>
      </div>
    </header>
  );
}
