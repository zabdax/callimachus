import type { FirestoreAdapter } from '../db';
import { WorkerError } from '../db';

const TZ = 'Asia/Dhaka';
const MAX_DRIFT_MS = 5 * 60_000;

export type SessionStartInput = { clientStartTs: number };
export type SessionStartOutput = { serverStartTs: number };

/**
 * Pure handler: stamp the user's active-session doc with the server
 * start time. The client uses serverStartTs to defeat clock drift
 * when calling processStudySession.
 */
export async function sessionStart(
  uid: string,
  input: SessionStartInput,
  db: FirestoreAdapter,
  now: () => number = () => Date.now(),
): Promise<SessionStartOutput> {
  const serverStartTs = now();
  await db.setActiveSession(uid, serverStartTs, input.clientStartTs);
  return { serverStartTs };
}

/**
 * Pure validator: throws WorkerError if drift exceeds 5 minutes.
 * Exposed for tests so the threshold is documented.
 */
export function assertDriftWithinTolerance(
  serverStartTs: number,
  clientStartTs: number,
): void {
  const drift = Math.abs(serverStartTs - clientStartTs);
  if (drift > MAX_DRIFT_MS) {
    throw new WorkerError(
      'failed-precondition',
      `clock drift ${drift}ms exceeds ${MAX_DRIFT_MS}ms`,
    );
  }
}