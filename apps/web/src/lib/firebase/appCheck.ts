import { initializeAppCheck, ReCaptchaEnterpriseProvider, getToken } from 'firebase/app-check';
import { app } from './client';

const siteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY;

let appCheckInstance: ReturnType<typeof initializeAppCheck> | null = null;

if (siteKey && typeof window !== 'undefined') {
  appCheckInstance = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

/**
 * Returns an App Check token for attached worker requests, or null when
 * App Check is not initialized (no site key) or the token can't be
 * refreshed. Callers proceed without the header in that case.
 */
export async function getAppCheckToken(): Promise<string | null> {
  if (!appCheckInstance) return null;
  try {
    const { token } = await getToken(appCheckInstance, false);
    return token;
  } catch {
    return null;
  }
}
