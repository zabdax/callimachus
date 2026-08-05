/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { VitePWA } from 'vite-plugin-pwa';
import process from 'node:process';

export default defineConfig({
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
        // Critical: Firebase Auth returns to /__/auth/handler?code=... after
        // signInWithRedirect. If the SW serves the cached index.html for that
        // navigation (default navigateFallback), Firebase never sees the auth
        // code. The denylist below excludes those callbacks from the fallback.
        navigateFallbackDenylist: [/^\/__\/auth\//],
        // Do not runtime-cache private Firestore responses; stale private data must not survive sign-out.
        runtimeCaching: [],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          charts: ['recharts'],
        },
      },
    },
  },
  define: {
    // Fall back to empty strings when VITE_FIREBASE_* is missing so the
    // Firebase SDK throws a clear, actionable error at startup instead of
    // silently shipping broken config. Production must supply real values
    // via apps/web/.env.production or CI secrets.
    'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(process.env.VITE_FIREBASE_API_KEY ?? ''),
    'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(process.env.VITE_FIREBASE_AUTH_DOMAIN ?? ''),
    'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(process.env.VITE_FIREBASE_PROJECT_ID ?? ''),
    'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(process.env.VITE_FIREBASE_STORAGE_BUCKET ?? ''),
    'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(process.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? ''),
    'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(process.env.VITE_FIREBASE_APP_ID ?? ''),
  },
  server: { port: 5173 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['tests/rules/**', 'tests/e2e/**', 'node_modules/**'],
  },
});
