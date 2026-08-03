/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { VitePWA } from 'vite-plugin-pwa';

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
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'firestore-cache' },
          },
        ],
      },
    }),
  ],
  server: { port: 5173 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['tests/rules/**', 'tests/e2e/**', 'node_modules/**'],
  },
});
