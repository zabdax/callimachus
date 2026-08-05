import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getAuth } from 'firebase/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { signInWithGoogle } from './useGoogleSignIn';
import { app } from '@/lib/firebase/client';

export function SignInScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // After auth, redirect to where the user came from (or / for fresh sign-in).
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/';

  const onEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(getAuth(app), email.trim(), password);
      // Auth state propagates via AuthProvider.onAuthStateChanged; the
      // RequireAuth guard on / would then admit the user. We push
      // explicitly so the navigation happens immediately rather than
      // waiting for React to re-render the guard.
      navigate(from, { replace: true });
    } catch (e) {
      setError((e as Error).message ?? 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-bg p-4">
      <div className="flex flex-col gap-4 w-full max-w-sm">
        <Button variant="primary" onClick={() => void signInWithGoogle()}>
          {t('auth.signInWithGoogle')}
        </Button>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="flex-1 h-px bg-slate-200" />
          <span>or</span>
          <span className="flex-1 h-px bg-slate-200" />
        </div>

        <form onSubmit={onEmailSignIn} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in with email'}
          </Button>
        </form>
      </div>
    </main>
  );
}