import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('firebase client init', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('reads config from VITE_FIREBASE_* env vars and exports an app', async () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'test-api-key');
    vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', 'test.firebaseapp.com');
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'test-project');
    vi.stubEnv('VITE_FIREBASE_STORAGE_BUCKET', 'test.appspot.com');
    vi.stubEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', '123');
    vi.stubEnv('VITE_FIREBASE_APP_ID', '1:123:web:abc');

    const { app } = await import('@/lib/firebase/client');
    expect(app).toBeDefined();
  });
});
