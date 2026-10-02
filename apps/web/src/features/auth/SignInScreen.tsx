import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';
import { signInWithGoogle } from './useGoogleSignIn';
import { useAuth } from './AuthContext';
import { GoogleG, StarMark } from '@/features/landing/icons';
import './sign-in.css';

/**
 * Map Supabase auth errors to friendly i18n keys. Raw messages like
 * "Invalid login credentials" are kept internal; users see guidance.
 */
function errorKey(e: unknown): string {
  const message = (e as Error | null)?.message ?? '';
  const code = (e as { code?: string } | null)?.code ?? '';
  if (code === 'auth/storage-blocked') return 'auth.error.storageBlocked';
  if (/Missing Supabase config/.test(message)) return 'auth.error.invalidApiKey';
  if (/invalid login credentials/i.test(message)) return 'auth.error.badCredentials';
  if (/email not confirmed/i.test(message)) return 'auth.error.unconfirmed';
  if (/rate limit|too many requests|too_many/i.test(message)) return 'auth.error.tooMany';
  if (/network|fetch|failed to fetch/i.test(message)) return 'auth.error.network';
  return 'auth.error.default';
}

export function SignInScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, authError, clearAuthError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // After auth, redirect to where the user came from (or / for fresh sign-in).
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/';

  // Google sign-in leaves to Google and returns via /auth/callback, which
  // establishes the session and routes onward. If a session already exists
  // here (e.g. second tab), route onward directly.
  const navigatedFor = useRef<string | null>(null);
  useEffect(() => {
    if (user && navigatedFor.current !== user.uid) {
      navigatedFor.current = user.uid;
      navigate(from, { replace: true });
    }
  }, [user, from, navigate]);

  const onEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    clearAuthError();
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      navigate(from, { replace: true });
    } catch (err) {
      setFormError(t(errorKey(err)));
    } finally {
      setBusy(false);
    }
  };

  const onGoogleSignIn = async () => {
    setBusy(true);
    setFormError(null);
    clearAuthError();
    try {
      // Redirects to Google; the session is established in /auth/callback.
      await signInWithGoogle();
    } catch (e) {
      setFormError(t(errorKey(e)));
      setBusy(false);
    }
  };

  // An OAuth exchange failure (or storage/config problem) lands the user
  // back here with authError set — show it instead of failing silently.
  const shownError = formError ?? (authError ? t(errorKey(authError)) : null);

  return (
    <main className="sgn">
      <div className="sgn__sky" aria-hidden="true" />
      <div className="sgn__glow sgn__glow--iris" aria-hidden="true" />
      <div className="sgn__glow sgn__glow--amber" aria-hidden="true" />

      {loading ? (
        <div className="sgn__finishing" role="status">
          <span className="sgn__spin" aria-hidden="true" />
          <p>{t('auth.finishing')}</p>
        </div>
      ) : (
        <section className="sgn__card">
          <div className="sgn__brand">
            <span className="sgn__brand-mark">
              <StarMark size={15} />
            </span>
            <span className="sgn__brand-name">HSC&nbsp;Crackers</span>
          </div>

          <h1 className="sgn__title">{t('auth.title')}</h1>
          <p className="sgn__sub">{t('auth.subtitle')}</p>

          <button type="button" className="sgn__google" onClick={() => void onGoogleSignIn()} disabled={busy}>
            <GoogleG size={19} />
            <span>{t('auth.signInWithGoogle')}</span>
          </button>
          <p className="sgn__hint">{t('auth.googleHint')}</p>

          <div className="sgn__divider" aria-hidden="true">
            <i />
            <span>{t('auth.or')}</span>
            <i />
          </div>

          <form onSubmit={onEmailSignIn} className="sgn__form">
            <label className="sgn__field">
              <span>{t('auth.emailLabel')}</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </label>
            <label className="sgn__field">
              <span>{t('auth.passwordLabel')}</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </label>

            {shownError && (
              <p role="alert" className="sgn__alert">
                {shownError}
              </p>
            )}

            <button type="submit" className="sgn__submit" disabled={busy}>
              {busy ? t('auth.redirecting') : t('auth.signInEmail')}
            </button>
          </form>

          <footer className="sgn__foot">
            <Link to="/welcome">{t('auth.back')}</Link>
            <Link to="/privacy">{t('auth.privacy')}</Link>
          </footer>
        </section>
      )}
    </main>
  );
}
