import { describe, it, expect } from 'vitest';
import { requireWorkerConfig, type Env } from '../src/env';

const base: Env = {
  ENVIRONMENT: 'production',
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_SERVICE_KEY: '',
  WORKERS_BASE: '',
  ALLOWED_ORIGINS: '',
  TRACKER_CACHE: undefined as unknown as KVNamespace,
};

describe('requireWorkerConfig', () => {
  it('accepts legacy JWT service keys', () => {
    expect(() =>
      requireWorkerConfig({ ...base, SUPABASE_SERVICE_KEY: 'eyJ0ZXN0LWtleQ' }),
    ).not.toThrow();
  });

  it('accepts new-format sb_secret_ service keys', () => {
    expect(() =>
      requireWorkerConfig({ ...base, SUPABASE_SERVICE_KEY: 'sb_secret_test123' }),
    ).not.toThrow();
  });

  it('rejects anon-looking keys in production', () => {
    expect(() =>
      requireWorkerConfig({ ...base, SUPABASE_SERVICE_KEY: 'sb_publishable_test' }),
    ).toThrow(/service key/i);
  });

  it('requires both vars', () => {
    expect(() => requireWorkerConfig({ ...base, SUPABASE_URL: '' })).toThrow(
      /SUPABASE_URL/,
    );
  });
});
