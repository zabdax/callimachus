import { useTranslation } from 'react-i18next';

export function Home() {
  const { t } = useTranslation();
  return <h1 className="p-4 text-text">{t('app.title')}</h1>;
}
