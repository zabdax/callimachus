import type {
  ActiveSession,
  DbAdapter,
  PaymentRequest,
  SessionDoc,
  SubscriptionDoc,
  UserExport,
} from './db';
import type { CronAdapters } from './crons';
import type { BatchState } from './handlers/batchStatus';

export type SupabaseCreds = { url: string; serviceKey: string };

type Row = Record<string, unknown>;

function makeClient(creds: SupabaseCreds) {
  const base = `${creds.url.replace(/\/$/, '')}/rest/v1`;
  const headers = {
    apikey: creds.serviceKey,
    Authorization: `Bearer ${creds.serviceKey}`,
    'Content-Type': 'application/json',
  };
  const mergeHeaders = { ...headers, Prefer: 'resolution=merge-duplicates' };

  function supaError(op: string, table: string, status: number, body: string): Error {
    const hint =
      status === 401 || status === 403
        ? ' — SUPABASE_SERVICE_KEY is likely invalid, revoked, or for the wrong project. ' +
          'Check worker secrets (`wrangler secret list`) and the Supabase dashboard API settings.'
        : '';
    return new Error(`supabase ${op} ${table} ${status} ${body.slice(0, 200)}${hint}`);
  }

  async function req(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders?: Record<string, string>,
  ): Promise<unknown> {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { ...headers, ...extraHeaders },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.status === 204 || res.status === 205) return null;
    const text = await res.text();
    if (!res.ok) throw supaError(method, path.split('?')[0] ?? path, res.status, text);
    return text ? (JSON.parse(text) as unknown) : null;
  }

  const one = (rows: unknown): Row | null =>
    Array.isArray(rows) && rows.length > 0 ? (rows[0] as Row) : null;
  const num = (v: unknown): number | null =>
    typeof v === 'string' || typeof v === 'number' ? Number(v) : null;
  const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);

  async function select(table: string, query: string): Promise<Row[]> {
    return (await req('GET', `/${table}?${query}`)) as Row[];
  }

  return { req, one, num, str, select, mergeHeaders };
}

type Ctx = ReturnType<typeof makeClient>;

export function makeDbAdapter(creds: SupabaseCreds): DbAdapter {
  const client = makeClient(creds);

  return {
    async getLastSessionEndedAt(uid) {
      const [row] = await client.select(
        'study_sessions',
        `select=ended_at_ms&uid=eq.${uid}&order=ended_at_ms.desc.nullslast&limit=1`,
      );
      return client.num(row?.ended_at_ms);
    },
    async countTodaySessions(uid, date) {
      const rows = await client.select(
        'study_sessions',
        `select=id&uid=eq.${uid}&date=eq.${encodeURIComponent(date)}`,
      );
      return rows.length;
    },
    async writeSession(uid, id, doc: SessionDoc) {
      await client.req(
        'POST',
        '/study_sessions?on_conflict=id',
        {
          id,
          uid,
          date: (doc as { date?: string }).date ?? '',
          duration_sec: (doc as { durationSec?: number }).durationSec ?? 0,
          chapters:
            (doc as { chapterId?: string | null }).chapterId != null
              ? [(doc as { chapterId?: string }).chapterId]
              : [],
          started_at_ms: (doc as { startedAtMs?: number }).startedAtMs ?? null,
          ended_at_ms: (doc as { endedAtMs?: number }).endedAtMs ?? null,
        },
        client.mergeHeaders,
      );
    },
    async incrementDailyLeaderboard(date, durationSec, uid) {
      const d = encodeURIComponent(date);
      const [total, mine] = await Promise.all([
        client.select('leaderboard_daily', `select=*&date=eq.${d}`),
        client.select('leaderboard_daily_users', `select=*&date=eq.${d}&uid=eq.${uid}`),
      ]);
      const t = client.one(total);
      const m = client.one(mine);
      await Promise.all([
        client.req(
          'POST',
          '/leaderboard_daily?on_conflict=date',
          {
            date,
            total_duration_sec: (client.num(t?.total_duration_sec) ?? 0) + durationSec,
            active_user_count: client.num(t?.active_user_count) ?? (m ? 1 : 1),
          },
          client.mergeHeaders,
        ),
        client.req(
          'POST',
          '/leaderboard_daily_users?on_conflict=date,uid',
          { date, uid, duration_sec: (client.num(m?.duration_sec) ?? 0) + durationSec },
          client.mergeHeaders,
        ),
      ]);
      const monthKey = date.slice(0, 7);
      const [mtotal, mmine] = await Promise.all([
        client.select('leaderboard_monthly', `select=*&month=eq.${monthKey}`),
        client.select('leaderboard_monthly_users', `select=*&month=eq.${monthKey}&uid=eq.${uid}`),
      ]);
      const mt = client.one(mtotal);
      const mm = client.one(mmine);
      await Promise.all([
        client.req(
          'POST',
          '/leaderboard_monthly?on_conflict=month',
          {
            month: monthKey,
            total_duration_sec: (client.num(mt?.total_duration_sec) ?? 0) + durationSec,
            active_user_count: client.num(mt?.active_user_count) ?? (mm ? 1 : 1),
          },
          client.mergeHeaders,
        ),
        client.req(
          'POST',
          '/leaderboard_monthly_users?on_conflict=month,uid',
          {
            month: monthKey,
            uid,
            duration_sec: (client.num(mm?.duration_sec) ?? 0) + durationSec,
          },
          client.mergeHeaders,
        ),
      ]);
    },
    async incrementChapterStat(uid, chapterId, durationSec) {
      const rows = await client.select(
        'chapter_stats',
        `select=*&uid=eq.${uid}&chapter_id=eq.${encodeURIComponent(chapterId)}`,
      );
      const row = client.one(rows);
      await client.req(
        'POST',
        '/chapter_stats?on_conflict=uid,chapter_id',
        {
          uid,
          chapter_id: chapterId,
          total_sec: (client.num(row?.total_sec) ?? 0) + durationSec,
          last_studied_at: new Date().toISOString(),
        },
        client.mergeHeaders,
      );
    },
    async setActiveSession(uid, session, legacyClientStartTs) {
      const data =
        typeof session === 'number'
          ? { sessionId: crypto.randomUUID(), serverStartTs: session, clientStartTs: legacyClientStartTs ?? session }
          : session;
      await client.req(
        'POST',
        '/active_sessions?on_conflict=uid',
        {
          uid,
          session_id: data.sessionId,
          server_start_ts: data.serverStartTs,
          client_start_ts: data.clientStartTs,
        },
        client.mergeHeaders,
      );
    },
    async getActiveSession(uid) {
      const row = client.one(
        await client.select('active_sessions', `select=*&uid=eq.${uid}`),
      );
      if (!row) return null;
      const sessionId = client.str(row.session_id);
      const serverStartTs = client.num(row.server_start_ts);
      const clientStartTs = client.num(row.client_start_ts);
      if (!sessionId || serverStartTs === null || clientStartTs === null) return null;
      return {
        sessionId,
        serverStartTs,
        clientStartTs,
        updateTime: client.str(row.updated_at) ?? undefined,
      };
    },
    async clearActiveSession(uid, sessionId, updateTime) {
      // Compare-and-set via filter: a concurrent completion that replaced the
      // row first makes this delete match nothing, so duplicate submissions
      // can't double-credit.
      let filter = `uid=eq.${uid}&session_id=eq.${encodeURIComponent(sessionId)}`;
      if (updateTime) filter += `&updated_at=eq.${encodeURIComponent(updateTime)}`;
      await client.req('DELETE', `/active_sessions?${filter}`);
    },
    async getPaymentRequest(id) {
      const row = client.one(
        await client.select('payment_requests', `select=*&id=eq.${id}`),
      );
      if (!row) return null;
      const uid = client.str(row.uid);
      const planId = client.str(row.plan_id);
      const status = client.str(row.status);
      if (!uid || !planId || (status !== 'pending' && status !== 'approved' && status !== 'rejected')) {
        return null;
      }
      return {
        uid,
        planId,
        status,
        updateTime: client.str(row.updated_at) ?? undefined,
      } as PaymentRequest;
    },
    async getUserSubscription(uid) {
      const row = client.one(
        await client.select('subscriptions', `select=*&uid=eq.${uid}`),
      );
      if (!row) return null;
      const status = client.str(row.status);
      const plan = client.str(row.plan);
      const expiresAt = client.num(row.expires_at);
      if (!status || !plan || expiresAt === null) return null;
      return {
        status: status as 'active' | 'inactive' | 'expired',
        plan,
        expiresAt,
        paymentRequestId: client.str(row.payment_request_id) ?? '',
      };
    },
    async setUserSubscription(uid, sub) {
      await client.req(
        'POST',
        '/subscriptions?on_conflict=uid',
        {
          uid,
          status: sub.status,
          plan: sub.plan,
          expires_at: sub.expiresAt,
          payment_request_id: sub.paymentRequestId,
        },
        client.mergeHeaders,
      );
    },
    async markPaymentRequestApproved(id, by, atMs, updateTime) {
      let filter = `id=eq.${id}`;
      if (updateTime) filter += `&updated_at=eq.${encodeURIComponent(updateTime)}`;
      await client.req('PATCH', `/payment_requests?${filter}`, {
        status: 'approved',
        approved_at: atMs,
        approved_by: by,
      });
    },
    async adminExists(uid) {
      const row = client.one(await client.select('admins', `select=uid&uid=eq.${uid}`));
      return row !== null;
    },
    async exportUserData(uid) {
      const [profile, syllabus, sessions, tasks, settings] = await Promise.all([
        client.select('profiles', `select=*&id=eq.${uid}`),
        client.select('syllabus_progress', `select=subject_id,chapters,updated_at&uid=eq.${uid}&limit=1000`),
        client.select('study_sessions', `select=*&uid=eq.${uid}&limit=1000`),
        client.select('tasks', `select=*&uid=eq.${uid}&limit=1000`),
        client.select('user_settings', `select=data&uid=eq.${uid}`),
      ]);
      return {
        profile: client.one(profile),
        syllabus: syllabus as Record<string, unknown>[],
        sessions: sessions as Record<string, unknown>[],
        tasks: tasks as Record<string, unknown>[],
        settings: (client.one(settings)?.data as Record<string, unknown> | undefined) ?? null,
      } satisfies UserExport;
    },
  };
}

export function makeCronAdapters(creds: SupabaseCreds): CronAdapters {
  const client = makeClient(creds);
  const toMs = (v: unknown): number => {
    if (typeof v === 'string') {
      const t = new Date(v).getTime();
      return Number.isNaN(t) ? 0 : t;
    }
    return typeof v === 'number' ? v : 0;
  };
  return {
    now: () => Date.now(),
    async listBatches() {
      const rows = await client.select('batches', 'select=*&limit=100');
      return rows.map((d) => ({
        id: String(d.id ?? ''),
        collegeStart: toMs(d.college_start),
        examStart: toMs(d.exam_start),
        examEnd: toMs(d.exam_end),
      }));
    },
    async writeBatchStatus(id, state: BatchState) {
      await client.req('PATCH', `/batches?id=eq.${encodeURIComponent(id)}`, {
        status: state.kind,
      });
    },
    async listTodaySessions(date) {
      const rows = await client.select(
        'leaderboard_daily_users',
        `select=uid,duration_sec&date=eq.${encodeURIComponent(date)}&limit=1000`,
      );
      return rows.map((d) => ({
        uid: String(d.uid ?? ''),
        durationSec: client.num(d.duration_sec) ?? 0,
      }));
    },
    async listMonthSessions(monthKey) {
      const rows = await client.select(
        'leaderboard_monthly_users',
        `select=uid,duration_sec&month=eq.${encodeURIComponent(monthKey)}&limit=1000`,
      );
      return rows.map((d) => ({
        uid: String(d.uid ?? ''),
        durationSec: client.num(d.duration_sec) ?? 0,
      }));
    },
    async writeDailyLeaderboardAggregate(date, activeUsers) {
      await client.req(
        'POST',
        '/leaderboard_daily?on_conflict=date',
        { date, active_user_count: activeUsers },
        client.mergeHeaders,
      );
    },
    async writeMonthlyLeaderboardAggregate(monthKey, totalDurationSec, activeUsers) {
      await client.req(
        'POST',
        '/leaderboard_monthly?on_conflict=month',
        { month: monthKey, total_duration_sec: totalDurationSec, active_user_count: activeUsers },
        client.mergeHeaders,
      );
    },
    async listActiveSessions() { return []; },
    async writeNonce() { return; },
    async listUpcomingTasksForReminders() { return []; },
    async sendPush() { return; },
    async listFcmTokens() { return []; },
    async listPendingTasksForDailyPlan() { return []; },
    async writeDailyPlan() { return; },
    async listAllUids() {
      const rows = await client.select('profiles', 'select=id&limit=1000');
      return rows.map((d) => String(d.id ?? '')).filter(Boolean);
    },
  };
}

/**
 * Audit logger for financial/admin actions — writes to audit_log
 * (no client RLS policy exists; the service key bypasses RLS).
 */
export function makeAuditLogger(creds: SupabaseCreds): {
  log(opts: { actor: string; action: string; target: string; after: Record<string, unknown>; at?: number }): Promise<void>;
} {
  const client = makeClient(creds);
  return {
    async log({ actor, action, target, after, at }) {
      await client.req('POST', '/audit_log', {
        actor,
        action,
        target,
        after,
        at_ms: at ?? Date.now(),
      });
    },
  };
}

export type { SubscriptionDoc };
