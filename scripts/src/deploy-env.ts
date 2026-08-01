/**
 * Validate that all required env vars are set and that none of them
 * still contain a placeholder marker (e.g. "<your-project-id>").
 *
 * Returns the list of failing key names. Empty means "ok to deploy".
 */
export function findMissingEnv(
  env: Record<string, string | undefined>,
  required: readonly string[],
): string[] {
  return required.filter((k) => !env[k] || env[k] === '');
}

export function findPlaceholderEnv(
  env: Record<string, string | undefined>,
  markers: readonly string[],
): string[] {
  return Object.entries(env)
    .filter(([, v]) => v && markers.some((m) => String(v).includes(m)))
    .map(([k]) => k);
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

// Any of these substrings in an env value means "the user forgot to
// substitute a placeholder." Adapt as needed; the defaults cover the
// templates in apps/web/.env.example and .env.production.example.
export const PLACEHOLDER_MARKERS = [
  '<your-',
  '<project-id>',
  '<api-key>',
  '<app-id>',
  'your-project-id',
  'your-api-key',
  'your-app-id',
  'CHANGEME',
];
