import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function Landing() {
  const { t } = useTranslation();
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-gradient-to-b from-slate-50 to-white">
      <h1 className="text-4xl font-bold mb-3 text-primary">{t('landing.title')}</h1>
      <p className="text-slate-600 max-w-md mb-6">{t('landing.tagline')}</p>
      <Link
        to="/sign-in"
        className="rounded-md bg-primary text-white px-6 py-3 font-medium hover:opacity-90"
      >
        {t('landing.cta')}
      </Link>
      <div className="mt-8 text-sm text-slate-500">
        <Link to="/privacy" className="underline">
          {t('privacy.title')}
        </Link>
      </div>
    </main>
  );
}