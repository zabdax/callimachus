import { supabase } from '@/lib/supabase/client';

export type TimeBlock = {
  id: string;
  uid: string;
  date: string; // YYYY-MM-DD in Asia/Dhaka
  startHour: number; // 0..23
  durationMin: number;
  subjectId: string;
  chapterId: string;
  completedAt: Date | null;
  source: 'manual' | 'auto-plan';
};

export function hasConflict(blocks: TimeBlock[], candidate: TimeBlock): boolean {
  const cStart = candidate.startHour * 60;
  const cEnd = cStart + candidate.durationMin;
  return blocks.some((b) => {
    if (b.completedAt) return false;
    if (b.date !== candidate.date) return false;
    const s = b.startHour * 60;
    const e = s + b.durationMin;
    return s < cEnd && cStart < e;
  });
}

type Row = {
  id: string;
  uid: string;
  date: string;
  start_hour: number;
  duration_min: number;
  subject_id: string;
  chapter_id: string;
  completed_at: string | null;
  source: string;
};

const toBlock = (r: Row): TimeBlock => ({
  id: r.id,
  uid: r.uid,
  date: r.date,
  startHour: r.start_hour,
  durationMin: r.duration_min,
  subjectId: r.subject_id,
  chapterId: r.chapter_id,
  completedAt: r.completed_at ? new Date(r.completed_at) : null,
  source: (r.source as TimeBlock['source']) ?? 'manual',
});

export async function listTimeBlocks(uid: string, date: string) {
  const { data, error } = await supabase
    .from('time_blocks')
    .select('*')
    .eq('uid', uid)
    .eq('date', date);
  if (error) throw error;
  return ((data ?? []) as unknown as Row[]).map(toBlock);
}

export async function addBlock(uid: string, b: Omit<TimeBlock, 'id' | 'uid' | 'completedAt'>) {
  const { data, error } = await supabase
    .from('time_blocks')
    .insert({
      uid,
      date: b.date,
      start_hour: b.startHour,
      duration_min: b.durationMin,
      subject_id: b.subjectId,
      chapter_id: b.chapterId,
      completed_at: null,
      source: b.source,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data as { id: string };
}

export async function completeBlock(uid: string, id: string) {
  const { error } = await supabase
    .from('time_blocks')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('uid', uid);
  if (error) throw error;
}
