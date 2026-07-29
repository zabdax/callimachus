import { useAuth } from '@/features/auth/AuthContext';
import { OnboardingForm } from './OnboardingForm';
import { useNavigate } from 'react-router-dom';

export function Onboarding() {
  const { user } = useAuth();
  const nav = useNavigate();
  if (!user) return null;
  return <OnboardingForm uid={user.uid} onDone={() => nav('/', { replace: true })} />;
}
