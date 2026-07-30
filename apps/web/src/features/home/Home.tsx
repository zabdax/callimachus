import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/AuthContext';

export function Home() {
  const { t } = useTranslation();
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="border-b border-surface-2 bg-surface px-4 py-3">
        <h1 className="font-display text-xl">{t('app.title')}</h1>
        {user && <p className="text-text-dim text-xs">{user.uid}</p>}
      </header>
      <Outlet />
    </div>
  );
}