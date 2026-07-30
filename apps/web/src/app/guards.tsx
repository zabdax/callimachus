import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { useProfile } from '@/features/profile/useProfile';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return null;
  if (!user) return <Navigate to="/sign-in" state={{ from: loc }} replace />;
  return <>{children}</>;
}

export function RequireProfile({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { profile, loading } = useProfile(user?.uid);
  if (loading) return null;
  if (!profile?.batchId) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}
