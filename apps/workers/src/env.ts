export interface Env {
  ENVIRONMENT: 'development' | 'staging' | 'production';
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  WORKERS_BASE: string;
  ALLOWED_ORIGINS: string;
  TRACKER_CACHE: KVNamespace;
}

export function requireWorkerConfig(env: Env): void {
  const missing: string[] = [];
  if (!env.SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!env.SUPABASE_SERVICE_KEY) missing.push('SUPABASE_SERVICE_KEY');
  if (missing.length > 0) {
    throw new Error(
      `${missing.join(', ')} is required. ` +
        `Set them once via \`wrangler secret put SUPABASE_SERVICE_KEY\` (and the ` +
        `SUPABASE_URL var in wrangler.toml). The service key is static — there ` +
        `is no rotation cron. Find it in the Supabase dashboard under ` +
        `Project Settings → API.`,
    );
  }
  // Fail fast when the wrong key type was pasted: the anon (publishable) key
  // is RLS-bound, so every privileged write would 401/403 and look like a
  // code bug. Service keys are either legacy JWTs (eyJ...) or new-format
  // sb_secret_... keys — both are accepted by PostgREST.
  if (env.ENVIRONMENT === 'production') {
    const key = env.SUPABASE_SERVICE_KEY;
    const looksService =
      key.startsWith('eyJ') || key.startsWith('sb_secret_');
    if (!looksService) {
      throw new Error(
        'SUPABASE_SERVICE_KEY does not look like a Supabase service key (expected eyJ... or sb_secret_...). ' +
          'Paste the service_role key from Supabase dashboard → Project Settings → API. ' +
          'Do NOT use the anon key here — it is RLS-bound and privileged writes will fail.',
      );
    }
  }
}
