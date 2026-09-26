import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
} as const;

const missingKeys = (Object.entries(config) as Array<[string, unknown]>)
  .filter(([, v]) => !v)
  .map(([k]) => k);

if (missingKeys.length > 0) {
  // Vite inlines VITE_* at build time — an empty value means the build ran
  // without secrets (local .env.production missing, Vercel env not set, or
  // CI build-test without secrets). Firebase would otherwise throw a bare
  // `auth/invalid-api-key` and Google redirect would loop back to /sign-in.
  console.error(
    `[firebase] Missing config: ${missingKeys.join(', ')}. ` +
      `Set them in apps/web/.env.production (local) or Vercel/CI secrets, then rebuild. ` +
      `Current origin: ${typeof window !== 'undefined' ? window.location.origin : 'ssr'}`,
  );
}

export const firebaseConfigError =
  missingKeys.length > 0 ? new Error(`Missing Firebase config: ${missingKeys.join(', ')}`) : null;

export const app: FirebaseApp = getApps()[0] ?? initializeApp(config);
