import { useAuth } from '@/features/auth/AuthContext';
import { useProfile } from '@/features/profile/useProfile';
import { PaceCard } from '@/features/progress/PaceCard';
import { ExamCountdown } from '@/features/progress/ExamCountdown';
import { DailyPlanCard } from '@/features/dailyPlan/DailyPlanCard';

function todayKey(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());
}

export function Overview() {
  const { user } = useAuth();
  const { profile } = useProfile(user?.uid);
  if (!user || !profile?.batchId) return null;
  const now = new Date();
  const date = todayKey();
  return (
    <div className="grid gap-4 p-4 md:grid-cols-2">
      <PaceCard batchId={profile.batchId} now={now} />
      <ExamCountdown batchId={profile.batchId} now={now} />
      <DailyPlanCard uid={user.uid} date={date} />
    </div>
  );
}
