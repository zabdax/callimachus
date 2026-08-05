import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { useProfile } from '@/features/profile/useProfile';
import { PageLoading, PageMessage } from '@/components/ui/PageState';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoading label="Loading your account…" />;
  if (!user) return <Navigate to="/sign-in" state={{ from: location }} replace />;
  return <>{children}</>;
}
export function RequireProfile({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { profile, loading, error } = useProfile(user?.uid);
  if (loading) return <PageLoading label="Loading your profile…" />;
  if (error) return <PageMessage title="We couldn’t load your profile" detail="Check your connection and refresh the page." />;
  if (!profile?.batchId) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}
