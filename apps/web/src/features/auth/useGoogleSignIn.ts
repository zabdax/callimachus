import { supabase } from '@/lib/supabase/client';

/**
 * Sign in with Google via OAuth (PKCE).
 *
 * The browser leaves to Google and returns to our own /auth/callback route,
 * which exchanges the code for a session in first-party storage — no
 * cross-origin auth handler, so Tracking Prevention has nothing to block.
 */
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      ...(typeof window !== 'undefined'
        ? { redirectTo: `${window.location.origin}/auth/callback` }
        : {}),
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  });
  if (error) throw error;
}
