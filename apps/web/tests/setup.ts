import '@testing-library/jest-dom/vitest';

// Provide minimal Firebase env so client init doesn't throw "invalid-api-key".
// Tests that exercise auth behavior mock firebase/auth themselves.
process.env.VITE_FIREBASE_API_KEY = 'test-api-key';
process.env.VITE_FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com';
process.env.VITE_FIREBASE_PROJECT_ID = 'test-project';
process.env.VITE_FIREBASE_STORAGE_BUCKET = 'test.appspot.com';
process.env.VITE_FIREBASE_MESSAGING_SENDER_ID = '123';
process.env.VITE_FIREBASE_APP_ID = '1:123:web:abc';

// Silence App Check site-key warning during tests.
process.env.VITE_FIREBASE_APPCHECK_SITE_KEY = '';

// Recharts' ResponsiveContainer measures via ResizeObserver, which jsdom lacks.
// Minimal polyfill — recharts only needs the observe/unobserve/disconnect surface
// and never actually invokes the callback in our tests.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
