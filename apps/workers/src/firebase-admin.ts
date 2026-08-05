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
    const res = await fetch(`${base}/${path}?${new URLSearchParams(query)}`, { headers: auth });
    if (!res.ok) throw new Error(`firestore LIST ${path} ${res.status}`);
    const data = await res.json() as { documents?: FirestoreDocument[] };
    return data.documents ?? [];
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
  return { getDoc, listCollection, commit, documentName };
}

export function makeRestAdapter(creds: FirestoreCreds): FirestoreAdapter {
  const client = makeClient(creds);
  const partialWrite = (path: string, data: Record<string, unknown>, updateTime?: string): Write => ({
    update: { name: client.documentName(path), fields: toFirestoreFields(data) },
    updateMask: { fieldPaths: Object.keys(data) },
    ...(updateTime ? { currentDocument: { updateTime } } : {}),
  });

  return {
    async getLastSessionEndedAt(uid) {
      const [doc] = await client.listCollection(`users/${uid}/sessions`, { orderBy: 'endedAtMs desc', pageSize: '1' });
      return intValue(doc?.fields?.endedAtMs);
    },
    async countTodaySessions(uid, date) {
      const docs = await client.listCollection(`users/${uid}/sessions`, { where: `date == "${date}"`, pageSize: '1000' });
      return docs.length;
    },
    async writeSession(uid, id, doc) {
      await client.commit([partialWrite(`users/${uid}/sessions/${id}`, doc as unknown as Record<string, unknown>)]);
    },
    async incrementDailyLeaderboard(date, durationSec, uid) {
      await client.commit([
        incrementWrite(client.documentName(`analytics/leaderboard_daily/${date}`), { totalDurationSec: durationSec }),
        incrementWrite(client.documentName(`analytics/leaderboard_daily/${date}/users/${uid}`), { durationSec }),
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
      await client.commit([partialWrite(`users/${uid}/activeSession/current`, { ...data, updatedAt: { __serverTimestamp: true } })]);
    },
    async getActiveSession(uid) {
      const doc = await client.getDoc(`users/${uid}/activeSession/current`);
      const fields = doc?.fields;
      const sessionId = stringValue(fields?.sessionId);
      const serverStartTs = intValue(fields?.serverStartTs);
      const clientStartTs = intValue(fields?.clientStartTs);
      if (!sessionId || serverStartTs === null || clientStartTs === null) return null;
      return { sessionId, serverStartTs, clientStartTs };
    },
    async clearActiveSession(uid, sessionId) {
      await client.commit([partialWrite(`users/${uid}/activeSession/current`, { sessionId: '', clearedAt: { __serverTimestamp: true } })]);
    },
    async getPaymentRequest(id) {
      const doc = await client.getDoc(`paymentRequests/${id}`);
      const uid = stringValue(doc?.fields?.uid);
      const planId = stringValue(doc?.fields?.planId);
      const status = stringValue(doc?.fields?.status);
      if (!uid || !planId || (status !== 'pending' && status !== 'approved' && status !== 'rejected')) return null;
      return { uid, planId, status, updateTime: doc?.updateTime } as PaymentRequest;
    },
    async setUserSubscription(uid, sub) {
      await client.commit([partialWrite(`users/${uid}`, { subscription: sub, updatedAt: { __serverTimestamp: true } })]);
    },
    async markPaymentRequestApproved(id, by, atMs, updateTime) {
      await client.commit([partialWrite(`paymentRequests/${id}`, { status: 'approved', approvedAt: atMs, approvedBy: by }, updateTime)]);
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
    async listTodaySessions(date) { return (await client.listCollection(`analytics/leaderboard_daily/${date}/users`, { pageSize: '1000' })).map((d) => ({ uid: d.name.split('/').pop() ?? '', durationSec: intValue(d.fields?.durationSec) ?? 0 })); },
    async writeMonthlyLeaderboard(monthKey, totalDurationSec, activeUserCount) { await client.commit([{ update: { name: client.documentName(`analytics/leaderboard_monthly/${monthKey}`), fields: toFirestoreFields({ totalDurationSec, activeUserCount }) } }]); },
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

function incrementWrite(name: string, values: Record<string, number>): Write {
  return { update: { name, fields: {} }, updateTransforms: Object.entries(values).map(([fieldPath, value]) => ({ fieldPath, increment: { integerValue: String(value) } })) };
}
function intValue(value: FirestoreValue | undefined): number | null { const raw = value?.integerValue ?? value?.doubleValue; return typeof raw === 'string' || typeof raw === 'number' ? Number(raw) : null; }
function stringValue(value: FirestoreValue | undefined): string | null { return typeof value?.stringValue === 'string' ? value.stringValue : null; }
function timestampValue(value: FirestoreValue | undefined): number { return typeof value?.timestampValue === 'string' ? new Date(value.timestampValue).getTime() : 0; }
function documentData(doc: FirestoreDocument | null): Record<string, unknown> | null { return doc?.fields ? Object.fromEntries(Object.entries(doc.fields).map(([key, value]) => [key, fromFirestoreValue(value)])) : null; }
function fromFirestoreValue(value: FirestoreValue): unknown { if ('stringValue' in value || 'integerValue' in value || 'doubleValue' in value || 'booleanValue' in value || 'timestampValue' in value || 'nullValue' in value) return value.stringValue ?? (value.integerValue !== undefined ? Number(value.integerValue) : value.doubleValue ?? value.booleanValue ?? value.timestampValue ?? null); if (value.mapValue && typeof value.mapValue === 'object') return Object.fromEntries(Object.entries((value.mapValue as { fields?: Record<string, FirestoreValue> }).fields ?? {}).map(([k, v]) => [k, fromFirestoreValue(v)])); if (value.arrayValue && typeof value.arrayValue === 'object') return ((value.arrayValue as { values?: FirestoreValue[] }).values ?? []).map(fromFirestoreValue); return null; }
function toFirestoreFields(data: Record<string, unknown>): Record<string, FirestoreValue> { return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, toFirestoreValue(value)])); }
function toFirestoreValue(value: unknown): FirestoreValue { if (value === null) return { nullValue: null }; if (typeof value === 'string') return { stringValue: value }; if (typeof value === 'boolean') return { booleanValue: value }; if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }; if (value instanceof Date) return { timestampValue: value.toISOString() }; if (typeof value === 'object' && value !== null) { const object = value as Record<string, unknown>; if ('__serverTimestamp' in object) return { timestampValue: new Date().toISOString() }; return { mapValue: { fields: toFirestoreFields(object) } }; } return { stringValue: String(value) }; }
