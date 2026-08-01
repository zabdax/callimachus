import * as Sentry from '@sentry/browser';

let initialised = false;

/**
 * Initialise Sentry with an explicit DSN. Idempotent. Returns true if
 * initialised, false when DSN was empty (no-op).
 *
 * The default `initSentry()` reads VITE_SENTRY_DSN from import.meta.env.
 * Pass an explicit DSN in tests so the wrapper is unit-testable without
 * touching the build-time env.
 */
export function initSentry(dsn?: string): boolean {
  if (initialised) return true;
  const value = dsn ?? import.meta.env.VITE_SENTRY_DSN;
  if (!value) return false;
  Sentry.init({
    dsn: value,
    tracesSampleRate: 0.1,
    environment: import.meta.env.MODE,
  });
  initialised = true;
  return true;
}

export function captureError(e: unknown): void {
  if (!initialised) return;
  Sentry.captureException(e);
}

/** Test-only: reset the idempotency flag so the next initSentry runs again. */
export function __resetSentryForTests(): void {
  initialised = false;
}