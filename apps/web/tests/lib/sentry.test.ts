import { describe, it, expect, vi, beforeEach } from 'vitest';

const initMock = vi.fn();
const captureMock = vi.fn();

vi.mock('@sentry/browser', () => ({
  init: (...args: unknown[]) => initMock(...args),
  captureException: (...args: unknown[]) => captureMock(...args),
}));

import { initSentry, captureError, __resetSentryForTests } from '@/lib/sentry';

describe('sentry wrapper', () => {
  beforeEach(() => {
    initMock.mockClear();
    captureMock.mockClear();
    __resetSentryForTests();
  });

  it('initSentry returns false when DSN is empty', () => {
    expect(initSentry('')).toBe(false);
    expect(initMock).not.toHaveBeenCalled();
  });

  it('initSentry calls Sentry.init when DSN is set', () => {
    expect(initSentry('https://public@example.com/1')).toBe(true);
    expect(initMock).toHaveBeenCalled();
  });

  it('initSentry is idempotent', () => {
    initSentry('https://public@example.com/1');
    initSentry('https://public@example.com/1');
    expect(initMock).toHaveBeenCalledTimes(1);
  });

  it('captureError is a no-op when Sentry is not initialised', () => {
    captureError(new Error('boom'));
    expect(captureMock).not.toHaveBeenCalled();
  });

  it('captureError forwards to Sentry when initialised', () => {
    initSentry('https://public@example.com/1');
    captureError(new Error('boom'));
    expect(captureMock).toHaveBeenCalled();
  });
});