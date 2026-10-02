import '@testing-library/jest-dom/vitest';

// Provide minimal Supabase env so client init doesn't log missing-config.
// Tests that exercise auth behavior mock the supabase client themselves.
process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';

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
