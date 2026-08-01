/**
 * Validates that all required env vars are set.
 * Returns the list of missing keys (empty when all present).
 */
export function findMissingEnv(
  env: Record<string, string | undefined>,
  required: readonly string[],
): string[] {
  return required.filter((k) => !env[k] || env[k] === '');
}

export const REQUIRED_PROD_ENV = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_SENTRY_DSN',
  'VITE_SENTRY_ENVIRONMENT',
] as const;