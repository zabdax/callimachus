import type { FirestoreAdapter, SessionDoc } from './db';

/**
 * Firestore adapter that talks to Firestore over its REST API
 * (https://firestore.googleapis.com/v1/projects/{project}/databases/(default)/documents/...).
 *
 * Why REST and not firebase-admin? firebase-admin requires Node.js APIs
 * (`fs`, `http.Agent`, etc.) that aren't available in Cloudflare Workers
 * V8 isolates. The Firestore REST API is what the JS SDK uses anyway —
 * it's just a thin shim over fetch().
 *
 * Each method maps to a single REST call. Multi-path atomic writes use the
 * Commit endpoint with multiple `writes` entries.
 */

export type FirestoreCreds = { projectId: string; accessToken: string };

/**
 * In Workers, `accessToken` comes from the GCP service-account JWT
 * minted by your bindings. This helper accepts a pre-minted token; the
 * actual minting (e.g. via @cloudflare/workers-firestore or jose with
 * a service-account key) is session 8 work.
 */
export function makeRestAdapter(creds: FirestoreCreds): FirestoreAdapter {
  const base = `https://firestore.googleapis.com/v1/projects/${creds.projectId}/databases/(default)/documents`;
  const auth = { Authorization: `Bearer ${creds.accessToken}` };

  async function getDoc(path: string): Promise<unknown> {
    const res = await fetch(`${base}/${path}`, { headers: auth });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`firestore GET ${path} ${res.status}`);
    return await res.json();
  }

  async function listCollection(
    path: string,
    query: Record<string, string>,
  ): Promise<{ documents?: { name: string; fields: Record<string, unknown> }[] }> {
    const params = new URLSearchParams(query);
    const res = await fetch(`${base}/${path}?${params}`, { headers: auth });
    if (!res.ok) throw new Error(`firestore LIST ${path} ${res.status}`);
    return (await res.json()) as { documents?: { name: string; fields: Record<string, unknown> }[] };
  }

  async function commit(writes: { path: string; data: SessionDoc | Record<string, unknown> }[]) {
    const res = await fetch(`${base}:commit`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ writes: writes.map((w) => ({
        update: { name: `${base}/${w.path}`, fields: toFirestoreFields(w.data) },
      })) }),
    });
    if (!res.ok) throw new Error(`firestore COMMIT ${res.status}: ${await res.text()}`);
  }

  return {
    async getLastSessionEndedAt(uid: string): Promise<number | null> {
      const out = await listCollection(`users/${uid}/sessions`, {
        'orderBy': 'endedAtMs desc',
        'pageSize': '1',
      });
      const doc = out.documents?.[0];
      if (!doc) return null;
      return intValue(doc.fields['endedAtMs']);
    },

    async countTodaySessions(uid: string, date: string): Promise<number> {
      // The REST API doesn't have a count endpoint — fall back to listing.
      // For a 10-per-day cap with at most a few hundred records, this is fine.
      const out = await listCollection(`users/${uid}/sessions`, {
        'where': `date == "${date}"`,
        'pageSize': '1000',
      });
      return out.documents?.length ?? 0;
    },

    async writeSession(uid: string, id: string, doc: SessionDoc): Promise<void> {
      await commit([{ path: `users/${uid}/sessions/${id}`, data: doc as unknown as Record<string, unknown> }]);
    },

    async incrementDailyLeaderboard(date: string, durationSec: number, uid: string): Promise<void> {
      // Two writes: parent doc + per-user subdoc.
      await commit([
        {
          path: `analytics/leaderboard_daily/${date}`,
          data: { totalDurationSec: { increment: durationSec }, activeUserCount: { increment: 0 } },
        },
        {
          path: `analytics/leaderboard_daily/${date}/users/${uid}`,
          data: { durationSec: { increment: durationSec } },
        },
      ]);
    },

    async incrementChapterStat(uid: string, chapterId: string, durationSec: number): Promise<void> {
      await commit([
        {
          path: `users/${uid}/chapterStats/${chapterId}`,
          data: { totalSec: { increment: durationSec }, lastStudiedAt: { timestampValue: new Date().toISOString() } },
        },
      ]);
    },

    async setActiveSession(uid: string, serverStartTs: number, clientStartTs: number): Promise<void> {
      await commit([
        {
          path: `users/${uid}/activeSession/current`,
          data: { serverStartTs, clientStartTs, updatedAt: { timestampValue: new Date().toISOString() } },
        },
      ]);
    },
  };
}

/* ---------- internal helpers ---------- */

function intValue(field: unknown): number | null {
  if (!field || typeof field !== 'object') return null;
  const f = field as { integerValue?: string };
  if (typeof f.integerValue === 'string') return Number(f.integerValue);
  return null;
}

/** Convert a plain JS object to Firestore REST field format. */
function toFirestoreFields(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = toFirestoreValue(v);
  }
  return out;
}

function toFirestoreValue(v: unknown): Record<string, unknown> {
  if (v === null) return { nullValue: null };
  if (typeof v === 'number') {
    // Firestore REST distinguishes int vs double. Use integerValue for ints.
    if (Number.isInteger(v)) return { integerValue: String(v) };
    return { doubleValue: v };
  }
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === 'object' && v !== null) {
    // Heuristic: serverTimestamp sentinel or explicit { increment: N }.
    const obj = v as Record<string, unknown>;
    if ('__serverTimestamp' in obj) return { timestampValue: new Date().toISOString() };
    if ('increment' in obj && typeof obj.increment === 'number') {
      return { integerValue: String(obj.increment) }; // Approximation — see note below.
    }
    return { mapValue: { fields: toFirestoreFields(obj) } };
  }
  return { stringValue: String(v) };
}

/**
 * NOTE: The Firestore REST API supports `updateTransform` for atomic
 * FieldValue.increment(). The shape above is a simplification for the
 * scaffold; real-world deployment needs `updateTransform.fieldTransforms`
 * entries. Session 8 will wire this up properly when we get a real
 * service-account JSON.
 */

/**
 * Default adapter factory used by the router. Reads FIREBASE_PROJECT_ID
 * + a pre-minted access token (FIREBASE_ACCESS_TOKEN) from env. The
 * access token is rotated every ~60 min by a Workers cron in session 8.
 *
 * For unit tests, override via `__setFirestoreAdapterForTests`.
 */
export const firestoreAdapter = makeRestAdapter({
  projectId:
    (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
      ?.FIREBASE_PROJECT_ID ?? 'test-project',
  accessToken:
    (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
      ?.FIREBASE_ACCESS_TOKEN ?? 'test-token',
});