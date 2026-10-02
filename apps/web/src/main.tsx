import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from '@/app/ErrorBoundary';
import { AppRouter } from '@/app/router';
import { initSentry } from '@/lib/sentry';
import { registerSW } from 'virtual:pwa-register';
import '@/styles/index.css';

initSentry();

// Register the PWA service worker via the plugin's full client (replaces
// the plain injected registerSW.js). In autoUpdate mode this workbox-window
// client auto-reloads the page the moment a new SW activates — without it,
// a tab that loaded under the previous SW keeps running the OLD bundle
// until the next manual reload, so a fixed auth flow still looks broken.
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AppRouter />
    </ErrorBoundary>
  </StrictMode>,
);
