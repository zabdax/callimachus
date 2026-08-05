import { callWorkerUnwrap, WorkerError } from '@/lib/workers/client';
import { enqueueSession, listPending, removeQueued, type QueuedSession } from './offlineQueue';

export async function stopAndSubmit(s: QueuedSession) {
  try {
    return await callWorkerUnwrap<QueuedSession, { ok: true; sessionIds: string[] }>(
      'processStudySession',
      s,
    );
  } catch (e) {
    if (e instanceof WorkerError && e.status < 500) {
      throw e; // validation error — do NOT queue, surface to caller
    }
    await enqueueSession(s);
    return { ok: true, sessionIds: [], queued: true } as const;
  }
}

export async function replayPending(uid: string) {
  const items = (await listPending()).filter((q) => q.uid === uid);
  for (const q of items) {
    try {
      await callWorkerUnwrap<QueuedSession, { ok: true; sessionIds: string[] }>(
        'processStudySession',
        q,
      );
      await removeQueued(q.id);
    } catch {
      // still offline — keep
    }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    const uid = (window as unknown as { __hscUid?: string }).__hscUid;
    if (uid) void replayPending(uid);
  });
}