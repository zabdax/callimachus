import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';

/**
 * OAuth return target: exchanges the `code` query param for a session in
 * first-party storage, then routes onward. Failures surface here instead of
 * dropping the user on a blank page.
 */
export function AuthCallback() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const oauthError =
      params.get('error_description') ?? params.get('error');
    if (oauthError) {
      setError(oauthError);
      return;
    }
    if (!code) {
      setError(t('auth.error.default'));
      return;
    }
    void supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error: exchangeError }) => {
        if (exchangeError) {
          setError(exchangeError.message);
          return;
        }
        navigate('/', { replace: true });
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : t('auth.error.default'));
      });
  }, [navigate, t]);

  return (
    <main className="sgn">
      <div className="sgn__finishing" role="status">
        <span className="sgn__spin" aria-hidden="true" />
        {error ? (
          <p role="alert" className="sgn__alert">
            {error}
          </p>
        ) : (
          <p>{t('auth.finishing')}</p>
        )}
      </div>
    </main>
  );
}
