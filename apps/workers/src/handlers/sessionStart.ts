import type { FirestoreAdapter } from '../db';
import { WorkerError } from '../db';

const MAX_DRIFT_MS = 5 * 60_000;

export type SessionStartInput = { clientStartTs: number };
export type SessionStartOutput = { sessionId: string; serverStartTs: number };

export async function sessionStart(
  uid: string,
  input: SessionStartInput,
  db: FirestoreAdapter,
  now: () => number = () => Date.now(),
): Promise<SessionStartOutput> {
  if (!Number.isSafeInteger(input.clientStartTs)) {
    throw new WorkerError('invalid-argument', 'clientStartTs must be an integer timestamp');
  }
  const serverStartTs = now();
  assertDriftWithinTolerance(serverStartTs, input.clientStartTs);
  const sessionId = crypto.randomUUID();
  await db.setActiveSession(uid, { sessionId, serverStartTs, clientStartTs: input.clientStartTs });
  return { sessionId, serverStartTs };
}

export function assertDriftWithinTolerance(serverStartTs: number, clientStartTs: number): void {
  const drift = Math.abs(serverStartTs - clientStartTs);
  if (drift > MAX_DRIFT_MS) {
    throw new WorkerError('failed-precondition', `clock drift ${drift}ms exceeds ${MAX_DRIFT_MS}ms`);
  }
}
