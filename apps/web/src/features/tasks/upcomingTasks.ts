import { supabase } from '@/lib/supabase/client';

export type TaskType = 'firstRevision' | 'secondRevision' | 'thirdRevision' | 'custom';
export type TaskSource = 'manual' | 'auto-sr';
export type TaskStatus = 'pending' | 'done' | 'skipped';

export type UpcomingTask = {
  id: string;
  uid: string;
  subjectId: string;
  subjectName?: string;
  chapterId?: string;
  chapterName?: string;
  type: TaskType;
  source: TaskSource;
  status: TaskStatus;
  scheduledFor: Date;
  createdAt: Date;
  resolvedAt?: Date | null;
};

type Row = {
  id: string;
  uid: string;
  subject_id: string;
  subject_name: string | null;
  chapter_id: string | null;
  chapter_name: string | null;
  type: string;
  source: string;
  status: string;
  scheduled_for: string | null;
  created_at: string;
  resolved_at: string | null;
};

const toDate = (v: string | null | undefined, fallback = new Date(0)): Date => {
  if (!v) return fallback;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? fallback : d;
};

export function normalizeTask(row: Row): UpcomingTask {
  return {
    id: row.id,
    uid: row.uid,
    subjectId: row.subject_id,
    ...(row.subject_name != null ? { subjectName: row.subject_name } : {}),
    ...(row.chapter_id != null ? { chapterId: row.chapter_id } : {}),
    ...(row.chapter_name != null ? { chapterName: row.chapter_name } : {}),
    type: (row.type as TaskType) ?? 'custom',
    source: (row.source as TaskSource) ?? 'manual',
    status: (row.status as TaskStatus) ?? 'pending',
    scheduledFor: toDate(row.scheduled_for, new Date()),
    createdAt: toDate(row.created_at),
    resolvedAt: row.resolved_at ? toDate(row.resolved_at) : null,
  };
}

export async function listUpcomingTasks(uid: string): Promise<UpcomingTask[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('uid', uid)
    .eq('status', 'pending')
    .order('scheduled_for', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return ((data ?? []) as unknown as Row[]).map(normalizeTask);
}

export async function addManualTask(
  uid: string,
  t: Partial<UpcomingTask> & { subjectId: string; chapterId: string },
) {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      uid,
      subject_id: t.subjectId,
      subject_name: t.subjectName ?? null,
      chapter_id: t.chapterId,
      chapter_name: t.chapterName ?? null,
      type: t.type ?? 'custom',
      source: 'manual',
      status: 'pending',
      scheduled_for: (t.scheduledFor instanceof Date ? t.scheduledFor : new Date()).toISOString(),
    })
    .select('id')
    .single();
  if (error) throw error;
  return data as { id: string };
}

export async function completeUpcomingTask(uid: string, taskId: string) {
  const { error } = await supabase
    .from('tasks')
    .update({ status: 'done', resolved_at: new Date().toISOString() })
    .eq('id', taskId)
    .eq('uid', uid);
  if (error) throw error;
}

export async function skipUpcomingTask(uid: string, taskId: string) {
  const { error } = await supabase
    .from('tasks')
    .update({ status: 'skipped', resolved_at: new Date().toISOString() })
    .eq('id', taskId)
    .eq('uid', uid);
  if (error) throw error;
}

export async function setUpcomingTask(uid: string, taskId: string, data: Partial<UpcomingTask>) {
  const patch: Record<string, unknown> = {};
  if (data.subjectId !== undefined) patch.subject_id = data.subjectId;
  if (data.subjectName !== undefined) patch.subject_name = data.subjectName;
  if (data.chapterId !== undefined) patch.chapter_id = data.chapterId;
  if (data.chapterName !== undefined) patch.chapter_name = data.chapterName;
  if (data.type !== undefined) patch.type = data.type;
  if (data.source !== undefined) patch.source = data.source;
  if (data.status !== undefined) patch.status = data.status;
  if (data.scheduledFor !== undefined)
    patch.scheduled_for = data.scheduledFor instanceof Date ? data.scheduledFor.toISOString() : data.scheduledFor;
  if (data.resolvedAt !== undefined)
    patch.resolved_at = data.resolvedAt instanceof Date ? data.resolvedAt.toISOString() : data.resolvedAt;
  const { error } = await supabase.from('tasks').update(patch).eq('id', taskId).eq('uid', uid);
  if (error) throw error;
}

export async function deleteUpcomingTask(uid: string, taskId: string) {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId).eq('uid', uid);
  if (error) throw error;
}
