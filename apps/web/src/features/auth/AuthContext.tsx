import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import { app } from '@/lib/firebase/client';

type AuthState = { user: User | null; loading: boolean };
const Ctx = createContext<AuthState>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const auth = useMemo(() => getAuth(app), []);

  useEffect(() => {
    // Capture redirect result once on mount: Firebase auto-handles the
    // signInWithRedirect return. We surface errors via getRedirectResult
    // so failures (e.g. "Google provider not enabled", "domain not
    // authorized") aren't silent.
    import('firebase/auth').then(async ({ getRedirectResult }) => {
      try {
        await getRedirectResult(auth);
      } catch (e) {
        // Don't crash the app — let the UI surface this via context if needed.
        console.error('Auth redirect error:', e);
      }
    });
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    }, (err) => {
      // Auth state errors (rare; usually token-expired). Surface them.
      console.error('Auth state error:', err);
      setLoading(false);
    });
  }, [auth]);

  return <Ctx.Provider value={{ user, loading }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
