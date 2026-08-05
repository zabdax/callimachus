import { NavLink, Outlet } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/AuthContext';
import { app } from '@/lib/firebase/client';

const links = [
  ['/', 'Overview'], ['/syllabus', 'Syllabus'], ['/tasks', 'Tasks'], ['/study', 'Study'], ['/subscribe', 'Pro'], ['/settings', 'Settings'],
] as const;

export function Home() {
  const { t } = useTranslation();
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-bg pb-20 text-text md:pb-0">
      <header className="sticky top-0 z-10 border-b border-surface-2 bg-surface/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div><h1 className="font-display text-xl">{t('app.title')}</h1><p className="max-w-[12rem] truncate text-xs text-text-dim">{user?.displayName || user?.email || 'Your study space'}</p></div>
          <button type="button" onClick={() => void signOut(getAuth(app))} className="rounded-md border border-surface-2 px-3 py-2 text-sm font-medium hover:bg-surface-2">Sign out</button>
        </div>
        <nav aria-label="Primary navigation" className="mx-auto mt-3 hidden max-w-6xl gap-1 md:flex">
          {links.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'bg-primary text-white' : 'text-text-dim hover:bg-surface-2 hover:text-text'}`}>{label}</NavLink>)}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl"><Outlet /></main>
      <nav aria-label="Primary navigation" className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t border-surface-2 bg-surface px-1 py-2 md:hidden">
        {links.slice(0, 5).map(([to, label]) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `rounded px-2 py-1 text-xs font-medium ${isActive ? 'text-primary' : 'text-text-dim'}`}>{label}</NavLink>)}
      </nav>
    </div>
  );
}
