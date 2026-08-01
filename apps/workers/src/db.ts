import type { FirebaseClaims } from './auth';

/**
 * Firestore document shapes used by the handlers. These mirror the
 * Plan 1+2 schemas and the existing rules. Keep field names identical
 * so the Firestore rules and the web client work without changes.
 */
export type SessionDoc = {
  startedAtMs: number;
  endedAtMs: number;
  durationSec: number;
  date: string;
  presenceChecks: number;
  device: { ua: string; platform: string };
  createdAt: unknown; // serverTimestamp sentinel
  chapterId: string | null;
};

/**
 * A small abstract Firestore adapter that the handlers depend on.
 * Production code injects the Firebase Admin SDK client; tests inject
 * a stub. This keeps handlers pure-Node-compatible and unit-testable.
 */
export interface FirestoreAdapter {
  getLastSessionEndedAt(uid: string): Promise<number | null>;
  countTodaySessions(uid: string, date: string): Promise<number>;
  writeSession(uid: string, id: string, doc: SessionDoc): Promise<void>;
  incrementDailyLeaderboard(date: string, durationSec: number, uid: string): Promise<void>;
  incrementChapterStat(uid: string, chapterId: string, durationSec: number): Promise<void>;
  setActiveSession(uid: string, serverStartTs: number, clientStartTs: number): Promise<void>;
}

/** A no-op adapter for tests. Each method must be overridable. */
export class StubFirestore implements FirestoreAdapter {
  getLastSessionEndedAt(_uid: string): Promise<number | null> {
    return Promise.resolve(null);
  }
  countTodaySessions(_uid: string, _date: string): Promise<number> {
    return Promise.resolve(0);
  }
  writeSession(_uid: string, _id: string, _doc: SessionDoc): Promise<void> {
    return Promise.resolve();
  }
  incrementDailyLeaderboard(_date: string, _dur: number, _uid: string): Promise<void> {
    return Promise.resolve();
  }
  incrementChapterStat(_uid: string, _cid: string, _dur: number): Promise<void> {
    return Promise.resolve();
  }
  setActiveSession(_uid: string, _serverTs: number, _clientTs: number): Promise<void> {
    return Promise.resolve();
  }
}

/** Standard validation errors mirror Firebase HttpsError semantics. */
export class WorkerError extends Error {
  constructor(public code: 'unauthenticated' | 'invalid-argument' | 'failed-precondition' | 'resource-exhausted' | 'not-found' | 'permission-denied', message: string) {
    super(message);
  }
  toResponse(): { status: number; body: { ok: false; error: string; message: string } } {
    const map: Record<string, number> = {
      unauthenticated: 401,
      'invalid-argument': 400,
      'failed-precondition': 412,
      'resource-exhausted': 429,
      'not-found': 404,
      'permission-denied': 403,
    };
    return { status: map[this.code] ?? 500, body: { ok: false, error: this.code, message: this.message } };
  }
}

export function requireUid(claims: FirebaseClaims | undefined): string {
  if (!claims?.sub) throw new WorkerError('unauthenticated', 'Sign in first');
  return claims.sub;
}