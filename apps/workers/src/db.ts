import type { FirebaseClaims } from './auth';

export type SessionDoc = {
  startedAtMs: number;
  endedAtMs: number;
  durationSec: number;
  date: string;
  presenceChecks: number;
  device: { ua: string; platform: string };
  createdAt: unknown;
  chapterId: string | null;
};

export type PaymentRequestDoc = {
  uid: string;
  planId: string;
  status: 'pending' | 'approved' | 'rejected';
  trxId: string;
  createdAt?: unknown;
  approvedAt?: number;
  approvedBy?: string;
};

export type SubscriptionDoc = {
  status: 'active' | 'inactive' | 'expired';
  plan: string;
  expiresAt: number;
  paymentRequestId: string;
};

export type ActiveSession = {
  sessionId: string;
  serverStartTs: number;
  clientStartTs: number;
};

export type PaymentRequest = {
  uid: string;
  planId: string;
  status: PaymentRequestDoc['status'];
  updateTime?: string;
};

export type UserExport = {
  profile: Record<string, unknown> | null;
  syllabus: Record<string, unknown>[];
  sessions: Record<string, unknown>[];
  tasks: Record<string, unknown>[];
  settings: Record<string, unknown> | null;
};

export interface FirestoreAdapter {
  getLastSessionEndedAt(uid: string): Promise<number | null>;
  countTodaySessions(uid: string, date: string): Promise<number>;
  writeSession(uid: string, id: string, doc: SessionDoc): Promise<void>;
  incrementDailyLeaderboard(date: string, durationSec: number, uid: string): Promise<void>;
  incrementChapterStat(uid: string, chapterId: string, durationSec: number): Promise<void>;
  setActiveSession(uid: string, session: ActiveSession | number, clientStartTs?: number): Promise<void>;
  getActiveSession(uid: string): Promise<ActiveSession | null>;
  clearActiveSession(uid: string, sessionId: string): Promise<void>;
  getPaymentRequest(id: string): Promise<PaymentRequest | null>;
  setUserSubscription(uid: string, sub: SubscriptionDoc): Promise<void>;
  markPaymentRequestApproved(id: string, by: string, atMs: number, updateTime?: string): Promise<void>;
  adminExists(uid: string): Promise<boolean>;
  exportUserData(uid: string): Promise<UserExport>;
}

export class StubFirestore implements FirestoreAdapter {
  getLastSessionEndedAt(_uid: string): Promise<number | null> { return Promise.resolve(null); }
  countTodaySessions(_uid: string, _date: string): Promise<number> { return Promise.resolve(0); }
  writeSession(_uid: string, _id: string, _doc: SessionDoc): Promise<void> { return Promise.resolve(); }
  incrementDailyLeaderboard(_date: string, _dur: number, _uid: string): Promise<void> { return Promise.resolve(); }
  incrementChapterStat(_uid: string, _cid: string, _dur: number): Promise<void> { return Promise.resolve(); }
  setActiveSession(_uid: string, _session: ActiveSession | number, _clientStartTs?: number): Promise<void> { return Promise.resolve(); }
  getActiveSession(_uid: string): Promise<ActiveSession | null> { return Promise.resolve(null); }
  clearActiveSession(_uid: string, _sessionId: string): Promise<void> { return Promise.resolve(); }
  getPaymentRequest(_id: string): Promise<PaymentRequest | null> { return Promise.resolve(null); }
  setUserSubscription(_uid: string, _sub: SubscriptionDoc): Promise<void> { return Promise.resolve(); }
  markPaymentRequestApproved(_id: string, _by: string, _at: number, _updateTime?: string): Promise<void> { return Promise.resolve(); }
  adminExists(_uid: string): Promise<boolean> { return Promise.resolve(false); }
  exportUserData(_uid: string): Promise<UserExport> {
    return Promise.resolve({ profile: null, syllabus: [], sessions: [], tasks: [], settings: null });
  }
}

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
  if (!claims?.sub || typeof claims.sub !== 'string') {
    throw new WorkerError('unauthenticated', 'Sign in first');
  }
  return claims.sub;
}
