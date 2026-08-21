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
    } catch (e) {
      if (e instanceof WorkerError && e.status < 500) {
        // Rejected by validation (overlap, cap, bad payload) — retrying on
        // every reconnect would poison the queue forever, so drop it.
        await removeQueued(q.id);
        continue;
      }
      // still offline / server error — keep for the next replay
    }
  }
}

let getReplayUid: (() => string | null) | null = null;

/**
 * Wires queued-session replay to the signed-in user. Replays once on
 * registration (app start / login) and again on every `online` event,
 * so queued sessions don't sit until the next connectivity flap.
 */
export function registerOfflineReplay(resolver: () => string | null): void {
  getReplayUid = resolver;
  const uid = resolver();
  if (uid) void replayPending(uid);
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    const uid = getReplayUid?.();
    if (uid) void replayPending(uid);
  });
}
