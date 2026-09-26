import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import { app, firebaseConfigError } from '@/lib/firebase/client';
import { registerOfflineReplay } from '@/features/timer/stopAndSubmit';

type AuthState = {
  user: User | null;
  loading: boolean;
  authError: Error | null;
  clearAuthError: () => void;
};
const Ctx = createContext<AuthState>({
  user: null,
  loading: true,
  authError: null,
  clearAuthError: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<Error | null>(null);
  const auth = useMemo(() => getAuth(app), []);
  const userRef = useRef<User | null>(null);
  userRef.current = user;

  useEffect(() => {
    // Explicit local persistence: without this, private-mode / blocked
    // third-party storage drops the session on the redirect bounce-back and
    // Google sign-in loops sign-in → Google → sign-in forever.
    // Dynamic import (like getRedirectResult below) so unit tests that mock
    // firebase/auth without setPersistence don't throw on static access.
    import('firebase/auth').then(async ({ setPersistence, browserLocalPersistence }) => {
      if (typeof setPersistence !== 'function') return;
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch (e) {
        console.error('Auth persistence error (private mode / blocked storage?):', e);
        // Surface it: otherwise the redirect just loops with no message.
        setAuthError(
          Object.assign(e instanceof Error ? e : new Error(String(e)), { code: 'auth/storage-blocked' }),
        );
      }
    }).catch(() => undefined);
    const storageError = storageBlockedError();
    if (storageError) {
      console.error('Auth storage blocked (tracking prevention?):', storageError);
      setAuthError(storageError);
    }
    // Capture redirect result once on mount: Firebase auto-handles the
    // signInWithRedirect return. We surface errors via getRedirectResult
    // so failures (e.g. "Google provider not enabled", "domain not
    // authorized") aren't silent.
    import('firebase/auth').then(async ({ getRedirectResult }) => {
      try {
        await getRedirectResult(auth);
      } catch (e) {
        console.error('Auth redirect error:', e);
        setAuthError(e instanceof Error ? e : new Error(String(e)));
      }
    });
    if (firebaseConfigError) {
      console.error('Firebase config error:', firebaseConfigError);
      setAuthError(firebaseConfigError);
    }
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    }, (err) => {
      // Auth state errors (rare; usually token-expired). Surface them.
      console.error('Auth state error:', err);
      setAuthError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
    });
  }, [auth]);

  useEffect(() => {
    // Replay sessions queued while offline as soon as we know who is
    // signed in (and again on every `online` event).
    registerOfflineReplay(() => userRef.current?.uid ?? null);
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  return (
    <Ctx.Provider value={{ user, loading, authError, clearAuthError }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}

/**
 * Probe first-party storage before Firebase Auth runs. Browsers with strict
 * Tracking Prevention / blocked third-party cookies (Edge, Firefox, Safari)
 * block the gapi iframe storage and drop the redirect session, so Google
 * sign-in loops back to /sign-in with no error. Detect it here and surface
 * an actionable message instead of a silent loop.
 */
function storageBlockedError(): Error | null {
  try {
    if (typeof navigator !== 'undefined' && 'cookieEnabled' in navigator && !navigator.cookieEnabled) {
      return Object.assign(new Error('storage blocked: cookies disabled'), { code: 'auth/storage-blocked' });
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      const k = '__hsc_storage_probe__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
    }
    return null;
  } catch {
    return Object.assign(new Error('storage blocked by tracking prevention'), { code: 'auth/storage-blocked' });
  }
}
