import { useAuth } from '@/features/auth/AuthContext';
import { useProfile } from '@/features/profile/useProfile';
import { PaceCard } from '@/features/progress/PaceCard';
import { ExamCountdown } from '@/features/progress/ExamCountdown';
import { DailyPlanCard } from '@/features/dailyPlan/DailyPlanCard';
import { PageLoading, PageMessage } from '@/components/ui/PageState';
function todayKey() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date()); }
export function Overview() {
  const { user } = useAuth(); const { profile, loading, error } = useProfile(user?.uid);
  if (loading) return <PageLoading label="Preparing your dashboard…" />;
  if (error) return <PageMessage title="Your dashboard is unavailable" detail="Refresh the page to try again." />;
  if (!user || !profile?.batchId) return <PageMessage title="Finish your profile first" detail="Your study dashboard will appear once onboarding is complete." />;
  const now = new Date();
  return <div className="grid gap-4 p-4 md:grid-cols-2"><PaceCard batchId={profile.batchId} now={now} /><ExamCountdown batchId={profile.batchId} now={now} /><DailyPlanCard uid={user.uid} date={todayKey()} /></div>;
}
