import { GoogleAuthProvider, getAuth, signInWithRedirect } from 'firebase/auth';
import { app } from '@/lib/firebase/client';

/**
 * Sign in with Google via redirect (not popup).
 *
 * Popup is blocked in modern browsers when the sign-in origin differs
 * from the popup origin. Our app is on Cloudflare Pages (hsc-tracker.pages.dev)
 * but Firebase Auth redirects via firebaseapp.com — popup is blocked.
 * Redirect-based sign-in works regardless of origin.
 */
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.addScope('profile');
  provider.addScope('email');
  return signInWithRedirect(getAuth(app), provider);
}