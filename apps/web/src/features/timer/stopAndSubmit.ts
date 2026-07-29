import { httpsCallable, getFunctions } from 'firebase/functions';
import { app } from '@/lib/firebase/client';
import { enqueueSession, listPending, removeQueued, type QueuedSession } from './offlineQueue';

export async function stopAndSubmit(s: QueuedSession) {
  try {
    const fn = httpsCallable(getFunctions(app), 'processStudySession');
    const res = await fn(s);
    return res.data as { ok: true; sessionIds: string[] };
  } catch {
    await enqueueSession(s);
    return { ok: true, sessionIds: [], queued: true } as const;
  }
}

export async function replayPending(uid: string) {
  const items = (await listPending()).filter((q) => q.uid === uid);
  for (const q of items) {
    try {
      const fn = httpsCallable(getFunctions(app), 'processStudySession');
      await fn(q);
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
