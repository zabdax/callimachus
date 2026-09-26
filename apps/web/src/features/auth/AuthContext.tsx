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
      }
    }).catch(() => undefined);
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
