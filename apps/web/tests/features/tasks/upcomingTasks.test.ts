import { describe, it, expect } from 'vitest';
import { normalizeTask } from '@/features/tasks/upcomingTasks';

describe('normalizeTask', () => {
  it('converts a Supabase row to a Task with Date', () => {
    const t = normalizeTask({
      id: 't1',
      uid: 'u1',
      subject_id: 's',
      subject_name: null,
      chapter_id: 'c',
      chapter_name: null,
      type: 'firstRevision',
      source: 'auto-sr',
      status: 'pending',
      scheduled_for: '2026-08-05T00:00:00+06:00',
      created_at: '2026-07-29T00:00:00+06:00',
      resolved_at: null,
    });
    expect(t.scheduledFor).toBeInstanceOf(Date);
    expect(t.type).toBe('firstRevision');
    expect(t.id).toBe('t1');
  });
});
