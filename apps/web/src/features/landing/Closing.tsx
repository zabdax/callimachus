import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GoogleG, StarMark } from './icons';

export function Closing() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <>
      <section className="lpg-final">
        <div className="lpg-final__stars" aria-hidden="true" />
        <div className="lpg__wrap">
          <p className="lpg__eyebrow lpg__eyebrow--amber" data-lpg-reveal style={{ justifyContent: 'center', display: 'inline-flex' }}>
            {t('landing.final.eyebrow')}
          </p>
          <h2 className="lpg-final__title" data-lpg-reveal style={{ ['--lpg-d' as string]: '80ms' }}>
            {t('landing.final.title')}
          </h2>
          <p className="lpg-final__bn" data-lpg-reveal style={{ ['--lpg-d' as string]: '150ms' }}>
            {t('landing.final.echo')}
          </p>
          <p className="lpg-final__bn" style={{ marginTop: 6 }} data-lpg-reveal>
            {t('landing.final.sub')}
          </p>
          <div className="lpg-final__actions" data-lpg-reveal style={{ ['--lpg-d' as string]: '220ms' }}>
            <Link to="/sign-in" className="lpg-btn lpg-btn--primary">
              <GoogleG />
              {t('landing.final.cta')}
            </Link>
            <Link to="/privacy" className="lpg-btn lpg-btn--ghost">
              {t('privacy.title')}
            </Link>
          </div>
        </div>
      </section>

      <footer className="lpg-footer">
        <div className="lpg__wrap lpg-footer__inner">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <StarMark size={14} />
            <span>{t('landing.footer.blurb')}</span>
          </span>
          <nav className="lpg-footer__links" aria-label="Footer">
            <Link to="/privacy">{t('privacy.title')}</Link>
            <Link to="/sign-in">{t('landing.footer.signIn')}</Link>
          </nav>
          <span>{t('landing.footer.rights', { year })}</span>
        </div>
      </footer>
    </>
  );
}
