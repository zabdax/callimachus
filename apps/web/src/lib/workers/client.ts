import { getAuth } from 'firebase/auth';
import { app as firebaseApp } from '@/lib/firebase/client';
import { getAppCheckToken } from '@/lib/firebase/appCheck';

/**
 * Thin wrapper that mirrors Firebase `httpsCallable` semantics against
 * a Cloudflare Worker deployment. Each call:
 *   - Reads the current Firebase ID token
 *   - POSTs to `${WORKERS_BASE}/api/<name>` with `{ data: ... }`
 *   - Returns `{ data: ... }` from the response body
 *
 * The Workers side responds with the same shape Cloud Functions use,
 * so the swap from `httpsCallable` to `callWorker` is mechanical.
 */

export const WORKERS_BASE =
  (import.meta.env.VITE_WORKERS_BASE as string | undefined) ??
  // Default to a same-origin relative path so this works on any host
  // (Cloudflare Pages custom domain, Firebase Hosting fallback, etc.).
  '';

export class WorkerError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function fetchIdToken(forceRefresh = false): Promise<string | null> {
  const auth = getAuth(firebaseApp);
  // Wait for the post-redirect auth state: reading currentUser synchronously
  // right after the /sign-in bounce-back returns null and the call goes out
  // with no Authorization header → worker 401 that looks like "login broken".
  try {
    await auth.authStateReady();
  } catch {
    // Older SDKs without authStateReady — fall through to currentUser.
  }
  const u = auth.currentUser;
  if (!u) return null;
  return u.getIdToken(forceRefresh);
}

const REQUEST_TIMEOUT_MS = 15_000;

export async function callWorker<TReq, TRes>(
  name: string,
  req: TReq,
): Promise<{ data: TRes }> {
  if (!WORKERS_BASE && typeof window !== 'undefined') {
    console.warn(
      '[workers] VITE_WORKERS_BASE is empty — calling same-origin /api/* which 404s on Vercel. ' +
        'Set VITE_WORKERS_BASE to the Worker URL and rebuild.',
    );
  }
  const doFetch = async (idToken: string | null, appCheckToken: string | null) =>
    fetch(`${WORKERS_BASE}/api/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        ...(appCheckToken ? { 'X-Firebase-AppCheck': appCheckToken } : {}),
      },
      body: JSON.stringify({ data: req }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

  const [idToken, appCheckToken] = await Promise.all([fetchIdToken(), getAppCheckToken()]);
  let res = await doFetch(idToken, appCheckToken);

  // ID tokens expire after ~1h and the worker strictly rejects expired ones.
  // Retry once with a force-refreshed token instead of surfacing 401.
  if (res.status === 401 && idToken) {
    const fresh = await fetchIdToken(true).catch(() => null);
    if (fresh && fresh !== idToken) {
      res = await doFetch(fresh, appCheckToken);
    }
  }

  const body = (await res.json().catch(() => ({}))) as {
    data?: TRes;
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new WorkerError(
      res.status,
      body.error ?? 'unknown',
      body.message ?? res.statusText,
    );
  }
  return { data: body.data as TRes };
}

/**
 * Convenience that unwraps the `{ data }` envelope — mirrors the
 * shape callers of `httpsCallable` already used.
 */
export async function callWorkerUnwrap<TReq, TRes>(name: string, req: TReq): Promise<TRes> {
  const out = await callWorker<TReq, TRes>(name, req);
  return out.data;
}