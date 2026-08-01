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
    env.VITE_FIREBASE_API_KEY = '';
    expect(findMissingEnv(env, REQUIRED_PROD_ENV)).toEqual(['VITE_FIREBASE_API_KEY']);
  });

  it('has 8 required keys covering Firebase + Sentry', () => {
    expect(REQUIRED_PROD_ENV).toHaveLength(8);
    expect(REQUIRED_PROD_ENV).toContain('VITE_SENTRY_DSN');
    expect(REQUIRED_PROD_ENV).toContain('VITE_FIREBASE_PROJECT_ID');
  });
});

describe('findPlaceholderEnv', () => {
  it('flags values that still contain a placeholder marker', () => {
    const env = {
      VITE_FIREBASE_PROJECT_ID: '<your-project-id>',
      VITE_FIREBASE_API_KEY: 'AIza-real-key',
      OTHER: 'fine',
    };
    expect(findPlaceholderEnv(env, PLACEHOLDER_MARKERS)).toEqual([
      'VITE_FIREBASE_PROJECT_ID',
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