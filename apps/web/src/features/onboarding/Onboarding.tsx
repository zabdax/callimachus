import { useTranslation } from 'react-i18next';

export function Onboarding() {
  const { t } = useTranslation();
  return <p className="p-4 text-text">{t('onboarding.step1.title')}</p>;
}
