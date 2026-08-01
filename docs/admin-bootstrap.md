# Admin bootstrap (one-time, after first deploy)

The app gates admin features (`/admin/approvals`, the audit log writer, the
`approvePayment` callable) on a Firebase Auth custom claim `{ admin: true }`
AND a matching Firestore doc at `/admins/{uid}`. Both must exist.

This document covers promoting a user to admin **after** they have signed in
to the production app at least once.

## One-time setup

1. **Create a service account** with the Firebase Admin SDK role:
   - Firebase Console → Project Settings → Service Accounts → **Generate new private key**.
   - Save the JSON file outside the repo (e.g. `~/.config/hsc-tracker/sa.json`).

2. **Authenticate the script:**
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS=~/.config/hsc-tracker/sa.json
   export FIREBASE_PROJECT_ID=hsc-crackers-prod
   ```

3. **Pick the user's UID.** The user must have already signed in once via
   Google. Find their UID in:
   - Firebase Console → Authentication → Users → click the user → copy `User UID`.
   - OR `firebase auth:export users.csv` and look up by email.

4. **Promote them to admin:**
   ```bash
   cd F:/Studytracker
   node scripts/bootstrap-admin.mjs <uid> --dry-run   # preview
   node scripts/bootstrap-admin.mjs <uid>             # actually promote
   ```

   The script:
   - Sets `auth.setCustomUserClaims(uid, { admin: true })`.
   - Writes `/admins/{uid}` with `{ uid, email, role: 'admin', createdAt }`.

5. **Tell the user to sign out and back in** so the new custom claim is
   picked up by the ID token. The `/admin` route will start working
   immediately (the `useIsAdmin` hook re-checks on next sign-in).

## Removing admin access

```js
admin.auth().setCustomUserClaims(uid, null);    // remove claim
admin.firestore().doc(`admins/${uid}`).delete();  // remove gate doc
```

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `auth.getUser(uid)` throws `auth/user-not-found` | User hasn't signed in yet. Send them to `/sign-in` first. |
| `/admin` redirects to `/` even after promotion | ID token still has the old claims. User must sign out + sign in. |
| Firestore rules deny write to `/admins/{uid}` | Rules allow writes only from server-side (Cloud Functions / Admin SDK). Don't try to write from the client. |