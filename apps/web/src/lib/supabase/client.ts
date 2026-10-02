import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const missingKeys = [
  ['VITE_SUPABASE_URL', url],
  ['VITE_SUPABASE_ANON_KEY', anonKey],
]
  .filter(([, v]) => !v)
  .map(([k]) => k);

if (missingKeys.length > 0) {
  // Supabase URL/keys are inlined at build time — an empty value means the
  // build ran without secrets (local .env.production missing, Vercel env not
  // set). Fail loudly instead of looping sign-in against a broken client.
  console.error(
    `[supabase] Missing config: ${missingKeys.join(', ')}. ` +
      `Set them in apps/web/.env.production (local) or Vercel/CI secrets, then rebuild. ` +
      `Current origin: ${typeof window !== 'undefined' ? window.location.origin : 'ssr'}`,
  );
}

export const supabaseConfigError =
  missingKeys.length > 0 ? new Error(`Missing Supabase config: ${missingKeys.join(', ')}`) : null;

/** Shared browser client (PKCE flow, first-party localStorage session). */
export const supabase: SupabaseClient = createClient(url ?? '', anonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/** Minimal user shape used across the app (stable across auth providers). */
export type AuthUser = { uid: string; email: string | null };

export function toAuthUser(id: string | undefined, email?: string | null): AuthUser | null {
  if (!id) return null;
  return { uid: id, email: email ?? null };
}

/** Current access token for Worker calls, or null when signed out. */
export async function getAccessToken(forceRefresh = false): Promise<string | null> {
  try {
    if (forceRefresh) {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) return null;
      return data.session?.access_token ?? null;
    }
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}
