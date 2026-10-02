import { describe, it, expect } from 'vitest';
import {
  findMissingEnv,
  findPlaceholderEnv,
  REQUIRED_PROD_ENV,
  PLACEHOLDER_MARKERS,
} from '../src/deploy-env';

describe('findMissingEnv', () => {
  it('returns empty when all required keys are set', () => {
    const env: Record<string, string> = Object.fromEntries(
      REQUIRED_PROD_ENV.map((k) => [k, 'value']),
    );
    expect(findMissingEnv(env, REQUIRED_PROD_ENV)).toEqual([]);
  });

  it('reports missing keys', () => {
    const env: Record<string, string> = Object.fromEntries(
      REQUIRED_PROD_ENV.map((k) => [k, 'value']),
    );
    delete env.VITE_SENTRY_DSN;
    delete env.VITE_SENTRY_ENVIRONMENT;
    expect(findMissingEnv(env, REQUIRED_PROD_ENV)).toEqual([
      'VITE_SENTRY_DSN',
      'VITE_SENTRY_ENVIRONMENT',
    ]);
  });

  it('treats empty strings as missing', () => {
    const env: Record<string, string> = Object.fromEntries(
      REQUIRED_PROD_ENV.map((k) => [k, 'value']),
    );
    env.VITE_SUPABASE_URL = '';
    expect(findMissingEnv(env, REQUIRED_PROD_ENV)).toEqual(['VITE_SUPABASE_URL']);
  });

  it('has 4 required keys covering Supabase + Sentry', () => {
    expect(REQUIRED_PROD_ENV).toHaveLength(4);
    expect(REQUIRED_PROD_ENV).toContain('VITE_SENTRY_DSN');
    expect(REQUIRED_PROD_ENV).toContain('VITE_SUPABASE_URL');
  });
});

describe('findPlaceholderEnv', () => {
  it('flags values that still contain a placeholder marker', () => {
    const env = {
      VITE_SUPABASE_URL: '<your-supabase-url>',
      VITE_SUPABASE_ANON_KEY: 'eyJhbGciOi-real-key',
      OTHER: 'fine',
    };
    expect(findPlaceholderEnv(env, PLACEHOLDER_MARKERS)).toEqual([
      'VITE_SUPABASE_URL',
    ]);
  });

  it('returns empty when no placeholders remain', () => {
    const env = { A: 'real-value', B: 'another' };
    expect(findPlaceholderEnv(env, PLACEHOLDER_MARKERS)).toEqual([]);
  });

  it('catches CHANGEME and your-project-id style markers', () => {
    const env = { X: 'CHANGEME', Y: 'your-project-id', Z: 'clean' };
    expect(findPlaceholderEnv(env, PLACEHOLDER_MARKERS).sort()).toEqual(['X', 'Y']);
  });
});