import { describe, it, expect } from 'vitest';
import { findMissingEnv, REQUIRED_PROD_ENV } from '../src/deploy-env';

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
    env.VITE_FIREBASE_API_KEY = '';
    expect(findMissingEnv(env, REQUIRED_PROD_ENV)).toEqual(['VITE_FIREBASE_API_KEY']);
  });

  it('has 8 required keys covering Firebase + Sentry', () => {
    expect(REQUIRED_PROD_ENV).toHaveLength(8);
    expect(REQUIRED_PROD_ENV).toContain('VITE_SENTRY_DSN');
    expect(REQUIRED_PROD_ENV).toContain('VITE_FIREBASE_PROJECT_ID');
  });
});