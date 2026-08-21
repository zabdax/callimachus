import type {
  ActiveSession,
  FirestoreAdapter,
  PaymentRequest,
  SessionDoc,
  SubscriptionDoc,
  UserExport,
} from './db';
import type { CronAdapters } from './crons';
import type { BatchState } from './handlers/batchStatus';

export type FirestoreCreds = { projectId: string; accessToken: string };
type FirestoreDocument = { name: string; updateTime?: string; fields?: Record<string, FirestoreValue> };
type FirestoreValue = Record<string, unknown>;
type Write = {
  update?: { name: string; fields: Record<string, FirestoreValue> };
  updateMask?: { fieldPaths: string[] };
  updateTransforms?: Array<{ fieldPath: string; increment?: FirestoreValue; setToServerValue?: 'REQUEST_TIME' }>;
  currentDocument?: { updateTime?: string; exists?: boolean };
  delete?: string;
};

function makeClient(creds: FirestoreCreds) {
  const base = `https://firestore.googleapis.com/v1/projects/${creds.projectId}/databases/(default)/documents`;
  const auth = { Authorization: `Bearer ${creds.accessToken}` };

  async function getDoc(path: string): Promise<FirestoreDocument | null> {
    const res = await fetch(`${base}/${path}`, { headers: auth });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`firestore GET ${path} ${res.status}`);
    return res.json() as Promise<FirestoreDocument>;
  }

  async function listCollection(path: string, query: Record<string, string>): Promise<FirestoreDocument[]> {
    // Follow pageToken so large collections aren't silently truncated.
    const out: FirestoreDocument[] = [];
    let pageToken: string | undefined;
    do {
      const params = new URLSearchParams(query);
      if (pageToken) params.set('pageToken', pageToken);
      const res = await fetch(`${base}/${path}?${params}`, { headers: auth });
      if (!res.ok) throw new Error(`firestore LIST ${path} ${res.status}`);
      const data = await res.json() as { documents?: FirestoreDocument[]; nextPageToken?: string };
      out.push(...(data.documents ?? []));
      pageToken = data.nextPageToken;
    } while (pageToken);
    return out;
  }

  /** Runs a structured query scoped to the collection(s) under parentPath. */
  async function runQuery(parentPath: string, structuredQuery: Record<string, unknown>): Promise<FirestoreDocument[]> {
    const url = parentPath ? `${base}/${parentPath}:runQuery` : `${base}:runQuery`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ structuredQuery }),
    });
    if (!res.ok) throw new Error(`firestore RUN_QUERY ${parentPath} ${res.status}`);
    const rows = await res.json() as Array<{ document?: FirestoreDocument }>;
    return rows.flatMap((row) => (row.document ? [row.document] : []));
  }

  async function commit(writes: Write[]): Promise<void> {
    const res = await fetch(`${base}:commit`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ writes }),
    });
    if (!res.ok) throw new Error(`firestore COMMIT ${res.status}`);
  }

  const documentName = (path: string) => `${base}/${path}`;
  return { getDoc, listCollection, runQuery, commit, documentName };
}

export function makeRestAdapter(creds: FirestoreCreds): FirestoreAdapter {
  const client = makeClient(creds);

  return {
    async getLastSessionEndedAt(uid) {
      const [doc] = await client.listCollection(`users/${uid}/sessions`, { orderBy: 'endedAtMs desc', pageSize: '1' });
      return intValue(doc?.fields?.endedAtMs);
    },
    async countTodaySessions(uid, date) {
      // documents.list has no `where` parameter — filtering must go through
      // runQuery, otherwise the count includes ALL sessions ever (turning
      // the daily cap into a lifetime cap).
      const docs = await client.runQuery(`users/${uid}`, {
        from: [{ collectionId: 'sessions' }],
        where: { fieldFilter: { field: { fieldPath: 'date' }, op: 'EQUAL', value: { stringValue: date } } },
      });
      return docs.length;
    },
    async writeSession(uid, id, doc) {
      await client.commit([partialWrite(client.documentName(`users/${uid}/sessions/${id}`), doc as unknown as Record<string, unknown>)]);
    },
    async incrementDailyLeaderboard(date, durationSec, uid) {
      // One atomic commit maintains daily AND month-to-date totals plus the
      // per-user breakdowns. Paths must be even-segment document paths —
      // `analytics/leaderboard_daily/{date}` (3 segments) is not a valid
      // Firestore document name and every write to it would 400.
      const monthKey = date.slice(0, 7);
      await client.commit([
        incrementWrite(client.documentName(`analytics/leaderboard/daily/${date}`), { totalDurationSec: durationSec }),
        incrementWrite(client.documentName(`analytics/leaderboard/daily/${date}/users/${uid}`), { durationSec }),
        incrementWrite(client.documentName(`analytics/leaderboard/monthly/${monthKey}`), { totalDurationSec: durationSec }),
        incrementWrite(client.documentName(`analytics/leaderboard/monthly/${monthKey}/users/${uid}`), { durationSec }),
      ]);
    },
    async incrementChapterStat(uid, chapterId, durationSec) {
      await client.commit([{
        update: { name: client.documentName(`users/${uid}/chapterStats/${chapterId}`), fields: {} },
        updateTransforms: [
          { fieldPath: 'totalSec', increment: { integerValue: String(durationSec) } },
          { fieldPath: 'lastStudiedAt', setToServerValue: 'REQUEST_TIME' },
        ],
      }]);
    },
    async setActiveSession(uid, session, legacyClientStartTs) {
      const data = typeof session === 'number'
        ? { sessionId: crypto.randomUUID(), serverStartTs: session, clientStartTs: legacyClientStartTs ?? session }
        : session;
      await client.commit([partialWrite(client.documentName(`users/${uid}/activeSession/current`), { ...data, updatedAt: { __serverTimestamp: true } })]);
    },
    async getActiveSession(uid) {
      const doc = await client.getDoc(`users/${uid}/activeSession/current`);
      const fields = doc?.fields;
      const sessionId = stringValue(fields?.sessionId);
      const serverStartTs = intValue(fields?.serverStartTs);
      const clientStartTs = intValue(fields?.clientStartTs);
      if (!sessionId || serverStartTs === null || clientStartTs === null) return null;
      return { sessionId, serverStartTs, clientStartTs, updateTime: doc?.updateTime };
    },
    async clearActiveSession(uid, sessionId, updateTime) {
      // With updateTime this is a compare-and-set: a concurrent completion
      // that cleared the session first makes this commit fail, so duplicate
      // submissions can't double-credit.
      await client.commit([partialWrite(client.documentName(`users/${uid}/activeSession/current`), { sessionId: '', clearedAt: { __serverTimestamp: true } }, updateTime)]);
    },
    async getPaymentRequest(id) {
      const doc = await client.getDoc(`paymentRequests/${id}`);
      const uid = stringValue(doc?.fields?.uid);
      const planId = stringValue(doc?.fields?.planId);
      const status = stringValue(doc?.fields?.status);
      if (!uid || !planId || (status !== 'pending' && status !== 'approved' && status !== 'rejected')) return null;
      return { uid, planId, status, updateTime: doc?.updateTime } as PaymentRequest;
    },
    async getUserSubscription(uid) {
      const doc = await client.getDoc(`users/${uid}`);
      const subRaw = doc?.fields?.subscription as { mapValue?: { fields?: Record<string, FirestoreValue> } } | undefined;
      const fields = subRaw?.mapValue?.fields;
      const status = stringValue(fields?.status);
      const plan = stringValue(fields?.plan);
      const expiresAt = intValue(fields?.expiresAt);
      if (!status || !plan || expiresAt === null) return null;
      return { status: status as 'active' | 'inactive' | 'expired', plan, expiresAt, paymentRequestId: stringValue(fields?.paymentRequestId) ?? '' };
    },
    async setUserSubscription(uid, sub) {
      await client.commit([partialWrite(client.documentName(`users/${uid}`), { subscription: sub, updatedAt: { __serverTimestamp: true } })]);
    },
    async markPaymentRequestApproved(id, by, atMs, updateTime) {
      await client.commit([partialWrite(client.documentName(`paymentRequests/${id}`), { status: 'approved', approvedAt: atMs, approvedBy: by }, updateTime)]);
    },
    async adminExists(uid) { return (await client.getDoc(`admins/${uid}`)) !== null; },
    async exportUserData(uid) {
      const [profile, syllabus, sessions, tasks, settings] = await Promise.all([
        client.getDoc(`users/${uid}`),
        client.listCollection(`users/${uid}/syllabus`, { pageSize: '1000' }),
        client.listCollection(`users/${uid}/sessions`, { pageSize: '1000' }),
        client.listCollection(`users/${uid}/upcomingTasks`, { pageSize: '1000' }),
        client.getDoc(`users/${uid}/meta/settings`),
      ]);
      return {
        profile: documentData(profile),
        syllabus: syllabus.map(documentData).filter((value): value is Record<string, unknown> => value !== null),
        sessions: sessions.map(documentData).filter((value): value is Record<string, unknown> => value !== null),
        tasks: tasks.map(documentData).filter((value): value is Record<string, unknown> => value !== null),
        settings: documentData(settings),
      } satisfies UserExport;
    },
  };
}

export function makeCronAdapters(creds: FirestoreCreds): CronAdapters {
  const client = makeClient(creds);
  return {
    now: () => Date.now(),
    async listBatches() { return (await client.listCollection('batches', { pageSize: '100' })).map((d) => ({ id: d.name.split('/').pop() ?? '', collegeStart: timestampValue(d.fields?.collegeStart), examStart: timestampValue(d.fields?.examStart), examEnd: timestampValue(d.fields?.examEnd) })); },
    async writeBatchStatus(id, state: BatchState) { await client.commit([{ update: { name: client.documentName(`batches/${id}`), fields: toFirestoreFields({ status: state.kind }) }, updateMask: { fieldPaths: ['status'] }, updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }] }]); },
    async listTodaySessions(date) { return (await client.listCollection(`analytics/leaderboard/daily/${date}/users`, { pageSize: '1000' })).map((d) => ({ uid: d.name.split('/').pop() ?? '', durationSec: intValue(d.fields?.durationSec) ?? 0 })); },
    async listMonthSessions(monthKey) { return (await client.listCollection(`analytics/leaderboard/monthly/${monthKey}/users`, { pageSize: '1000' })).map((d) => ({ uid: d.name.split('/').pop() ?? '', durationSec: intValue(d.fields?.durationSec) ?? 0 })); },
    async writeDailyLeaderboardAggregate(date, activeUsers) {
      await client.commit([partialWrite(client.documentName(`analytics/leaderboard/daily/${date}`), { activeUserCount: activeUsers })]);
    },
    async writeMonthlyLeaderboardAggregate(monthKey, totalDurationSec, activeUsers) {
      // Totals are reconciled from the per-user docs so the aggregate can't
      // drift from the incrementally-maintained breakdown.
      await client.commit([partialWrite(client.documentName(`analytics/leaderboard/monthly/${monthKey}`), { totalDurationSec, activeUserCount: activeUsers })]);
    },
    async listActiveSessions() { return []; },
    async writeNonce() { return; },
    async listUpcomingTasksForReminders() { return []; },
    async sendPush() { return; },
    async listFcmTokens() { return []; },
    async listPendingTasksForDailyPlan() { return []; },
    async writeDailyPlan() { return; },
    async listAllUids() { return (await client.listCollection('users', { pageSize: '1000' })).map((d) => d.name.split('/').pop() ?? '').filter(Boolean); },
  };
}

/**
 * Audit logger for financial/admin actions — writes immutable docs to
 * /audit/{id} (client rules deny writes there; the REST client uses an
 * access token and bypasses security rules).
 */
export function makeAuditLogger(creds: FirestoreCreds): { log(opts: { actor: string; action: string; target: string; after: Record<string, unknown>; at?: number }): Promise<void> } {
  const client = makeClient(creds);
  return {
    async log({ actor, action, target, after, at }) {
      await client.commit([{
        update: {
          name: client.documentName(`audit/${crypto.randomUUID()}`),
          fields: toFirestoreFields({ actor, action, target, after, atMs: at ?? Date.now(), createdAt: { __serverTimestamp: true } }),
        },
      }]);
    },
  };
}

function incrementWrite(name: string, values: Record<string, number>): Write {
  return { update: { name, fields: {} }, updateTransforms: Object.entries(values).map(([fieldPath, value]) => ({ fieldPath, increment: { integerValue: String(value) } })) };
}
function partialWrite(name: string, data: Record<string, unknown>, updateTime?: string): Write {
  return {
    update: { name, fields: toFirestoreFields(data) },
    updateMask: { fieldPaths: Object.keys(data) },
    ...(updateTime ? { currentDocument: { updateTime } } : {}),
  };
}
function intValue(value: FirestoreValue | undefined): number | null { const raw = value?.integerValue ?? value?.doubleValue; return typeof raw === 'string' || typeof raw === 'number' ? Number(raw) : null; }
function stringValue(value: FirestoreValue | undefined): string | null { return typeof value?.stringValue === 'string' ? value.stringValue : null; }
function timestampValue(value: FirestoreValue | undefined): number { return typeof value?.timestampValue === 'string' ? new Date(value.timestampValue).getTime() : 0; }
function documentData(doc: FirestoreDocument | null): Record<string, unknown> | null { return doc?.fields ? Object.fromEntries(Object.entries(doc.fields).map(([key, value]) => [key, fromFirestoreValue(value)])) : null; }
function fromFirestoreValue(value: FirestoreValue): unknown { if ('stringValue' in value || 'integerValue' in value || 'doubleValue' in value || 'booleanValue' in value || 'timestampValue' in value || 'nullValue' in value) return value.stringValue ?? (value.integerValue !== undefined ? Number(value.integerValue) : value.doubleValue ?? value.booleanValue ?? value.timestampValue ?? null); if (value.mapValue && typeof value.mapValue === 'object') return Object.fromEntries(Object.entries((value.mapValue as { fields?: Record<string, FirestoreValue> }).fields ?? {}).map(([k, v]) => [k, fromFirestoreValue(v)])); if (value.arrayValue && typeof value.arrayValue === 'object') return ((value.arrayValue as { values?: FirestoreValue[] }).values ?? []).map(fromFirestoreValue); return null; }
function toFirestoreFields(data: Record<string, unknown>): Record<string, FirestoreValue> { return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, toFirestoreValue(value)])); }
function toFirestoreValue(value: unknown): FirestoreValue { if (value === null) return { nullValue: null }; if (typeof value === 'string') return { stringValue: value }; if (typeof value === 'boolean') return { booleanValue: value }; if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }; if (value instanceof Date) return { timestampValue: value.toISOString() }; if (typeof value === 'object' && value !== null) { const object = value as Record<string, unknown>; if ('__serverTimestamp' in object) return { timestampValue: new Date().toISOString() }; return { mapValue: { fields: toFirestoreFields(object) } }; } return { stringValue: String(value) }; }
