import { getAccessToken, supabase } from '@/lib/supabase/client';

/**
 * Thin wrapper against a Cloudflare Worker deployment. Each call:
 *   - Reads the current Supabase access token
 *   - POSTs to `${WORKERS_BASE}/api/<name>` with `{ data: ... }`
 *   - Returns `{ data: ... }` from the response body
 */

export const WORKERS_BASE =
  (import.meta.env.VITE_WORKERS_BASE as string | undefined) ??
  // Default to a same-origin relative path so this works on any host
  // (Cloudflare Pages custom domain, Vercel, etc.).
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
  // Wait for any in-flight OAuth callback to settle: reading the session
  // synchronously right after /auth/callback can return null and the call
  // goes out with no Authorization header → worker 401 that looks like
  // "login broken".
  try {
    await supabase.auth.getSession();
  } catch {
    // Older clients — fall through to the token read.
  }
  return getAccessToken(forceRefresh);
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
  const doFetch = async (idToken: string | null) =>
    fetch(`${WORKERS_BASE}/api/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify({ data: req }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

  const idToken = await fetchIdToken();
  let res = await doFetch(idToken);

  // Access tokens expire after ~1h and the worker strictly rejects expired
  // ones. Retry once with a force-refreshed token instead of surfacing 401.
  if (res.status === 401 && idToken) {
    const fresh = await fetchIdToken(true).catch(() => null);
    if (fresh && fresh !== idToken) {
      res = await doFetch(fresh);
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
