import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getAuth } from 'firebase/auth';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { signInWithGoogle } from './useGoogleSignIn';
import { useAuth } from './AuthContext';
import { app } from '@/lib/firebase/client';
import { GoogleG, StarMark } from '@/features/landing/icons';
import './sign-in.css';

/**
 * Map Firebase auth error codes to friendly i18n keys. Raw messages like
 * "Firebase: error (auth/unauthorized-domain)" are meaningless to users.
 */
function errorKey(e: unknown): string {
  const code = (e as { code?: string } | null)?.code ?? '';
  const message = (e as Error | null)?.message ?? '';
  // Missing VITE_* build-time config surfaces as invalid-api-key or a
  // generic config error from client.ts — point at the real fix.
  if (code === 'auth/invalid-api-key' || /Missing Firebase config/.test(message)) {
    return 'auth.error.invalidApiKey';
  }
  switch (code) {
    case 'auth/unauthorized-domain':
      return 'auth.error.unauthorizedDomain';
    case 'auth/operation-not-allowed':
      return 'auth.error.operationNotAllowed';
    case 'auth/network-request-failed':
      return 'auth.error.network';
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'auth.error.badCredentials';
    case 'auth/too-many-requests':
      return 'auth.error.tooMany';
    case 'auth/user-disabled':
      return 'auth.error.userDisabled';
    case 'auth/account-exists-with-different-credential':
      return 'auth.error.accountExists';
    case 'auth/popup-blocked':
    case 'auth/cancelled-popup-request':
      return 'auth.error.popupBlocked';
    default:
      return 'auth.error.default';
  }
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

  // Google sign-in completes as a full page reload back onto /sign-in —
  // auth state arrives via onAuthStateChanged, not via the promise. Route
  // the user onward from here; without this they land back on an
  // identical-looking form and appear "stuck". The ref guards against a
  // second hop: once navigated, `location.state` is gone, `from` becomes
  // "/", and the effect would otherwise fire again and redirect to /.
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
      await signInWithEmailAndPassword(getAuth(app), email.trim(), password);
      navigate(from, { replace: true });
    } catch (e) {
      setFormError(t(errorKey(e)));
    } finally {
      setBusy(false);
    }
  };

  const onGoogleSignIn = async () => {
    setBusy(true);
    setFormError(null);
    clearAuthError();
    try {
      // signInWithRedirect resolves when the redirect BEGINS, not when it
      // completes. The result is handled by the effect above after the
      // bounce-back (and by AuthContext for errors).
      await signInWithGoogle();
    } catch (e) {
      setFormError(t(errorKey(e)));
      setBusy(false);
    }
  };

  // A redirect failure (e.g. domain not authorized in Firebase) lands the
  // user back here with authError set but nothing else changed — show it.
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
