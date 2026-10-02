/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { VitePWA } from 'vite-plugin-pwa';
import process from 'node:process';

export default defineConfig(({ mode }) => {
  // .env.[mode] files (e.g. .env.production) are never exposed on
  // process.env — loadEnv reads them the same way Vite itself inlines
  // them into import.meta.env. Real process env (CI/Vercel) wins.
  const fileEnv = loadEnv(mode, process.cwd(), '');
  const env = (key: string): string => process.env[key] ?? fileEnv[key] ?? '';

  return {
    plugins: [
      react(),
      tsconfigPaths(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'HSC Crackers',
          short_name: 'HSC',
          description: 'Plan, study, and track your HSC revision.',
          theme_color: '#2E5A88',
          background_color: '#0F1620',
          display: 'standalone',
          start_url: '/',
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          ],
        },
        workbox: {
          // OAuth returns to our own /auth/callback route. Exclude any
          // third-party auth callbacks from the SW fallback so the
          // provider response is never swallowed by cached index.html.
          navigateFallbackDenylist: [/^\/__\/auth\//],
          // Do not runtime-cache private API responses; stale private data must not survive sign-out.
          runtimeCaching: [],
          // Default glob is js/css/html only — fonts would always hit the
          // network, so a blocked/flaky host (e.g. *.vercel.app from some
          // ISPs) leaves the UI falling back to system fonts and spams
          // ERR_CONNECTION_TIMED_OUT. ~500KB of woff2 keeps en+bn rendering
          // fully offline.
          globPatterns: ['**/*.{js,css,html,woff2}'],
        },
      }),
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            supabase: ['@supabase/supabase-js'],
            charts: ['recharts'],
            three: ['three'],
          },
        },
      },
    },
    define: {
      // Fall back to empty strings when VITE_SUPABASE_* is missing so the
      // Supabase client logs a clear, actionable error at startup instead of
      // silently shipping broken config. Production must supply real values
      // via apps/web/.env.production or CI secrets.
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env('VITE_SUPABASE_URL')),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env('VITE_SUPABASE_ANON_KEY')),
    },
    server: { port: 5173 },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./tests/setup.ts'],
      include: ['tests/**/*.{test,spec}.{ts,tsx}'],
      exclude: ['tests/rules/**', 'tests/e2e/**', 'node_modules/**'],
    },
  };
});
