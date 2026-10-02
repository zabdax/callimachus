import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { supabase, supabaseConfigError, toAuthUser, type AuthUser } from '@/lib/supabase/client';
import { registerOfflineReplay } from '@/features/timer/stopAndSubmit';

type AuthState = {
  user: AuthUser | null;
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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<Error | null>(null);
  const userRef = useRef<AuthUser | null>(null);
  userRef.current = user;

  useEffect(() => {
    let active = true;
    // Supabase persists the session in first-party localStorage. If storage
    // is blocked (private mode / tracking prevention), surface it instead of
    // looping sign-in silently.
    const storageError = storageBlockedError();
    if (storageError) {
      console.error('Auth storage blocked (tracking prevention?):', storageError);
      setAuthError(storageError);
    }
    if (supabaseConfigError) {
      console.error('Supabase config error:', supabaseConfigError);
      setAuthError(supabaseConfigError);
    }
    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error('Auth session error:', error);
          setAuthError(error);
        }
        setUser(toAuthUser(data.session?.user.id, data.session?.user.email));
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (!active) return;
        console.error('Auth session error:', e);
        setAuthError(e instanceof Error ? e : new Error(String(e)));
        setLoading(false);
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(toAuthUser(session?.user.id, session?.user.email));
      setLoading(false);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

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
 * Probe first-party storage before auth runs. Browsers with strict Tracking
 * Prevention / blocked cookies drop the session, so sign-in would loop back
 * with no error. Detect it here and surface an actionable message instead.
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
