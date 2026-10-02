import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('supabase client init', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('reads config from VITE_SUPABASE_* env vars and exports a client', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');

    const { supabase, supabaseConfigError } = await import('@/lib/supabase/client');
    expect(supabase).toBeDefined();
    expect(supabaseConfigError).toBeNull();
  });
});
