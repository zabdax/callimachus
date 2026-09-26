export interface Env {
  ENVIRONMENT: 'development' | 'staging' | 'production';
  FIREBASE_PROJECT_ID: string;
  FIREBASE_ACCESS_TOKEN: string;
  WORKERS_BASE: string;
  ALLOWED_ORIGINS: string;
  TRACKER_CACHE: KVNamespace;
}

export function requireWorkerConfig(env: Env): void {
  const missing: string[] = [];
  if (!env.FIREBASE_PROJECT_ID) missing.push('FIREBASE_PROJECT_ID');
  if (!env.FIREBASE_ACCESS_TOKEN) missing.push('FIREBASE_ACCESS_TOKEN');
  if (missing.length > 0) {
    throw new Error(
      `${missing.join(', ')} is required. ` +
        `If this is FIREBASE_ACCESS_TOKEN, check the GitHub Actions ` +
        `'rotate-firebase-access-token' workflow (secrets GCP_SA_JSON_BASE64, ` +
        `CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID) and run it manually via ` +
        `workflow_dispatch. Do NOT put a Firebase Web API key (AIza...) or ` +
        `service-account JSON here — it must be a GCP OAuth2 access token (ya29....) ` +
        `minted by scripts/src/mint-firebase-token.mjs.`,
    );
  }
  const token = env.FIREBASE_ACCESS_TOKEN;
  // Fail fast with an actionable message when the wrong credential type was
  // pasted into the secret — otherwise every Firestore call fails with a
  // generic 401/403 and looks like a code bug.
  // Skipped outside production so unit tests (`test-token`) and local
  // `.dev.vars` placeholders keep working.
  if (env.ENVIRONMENT === 'production') {
    if (token.startsWith('AIza') || token.length < 20) {
      throw new Error(
        'FIREBASE_ACCESS_TOKEN looks like a Firebase Web API key (AIza...), not a GCP OAuth2 access token (ya29....). ' +
          'Mint a real access token with scripts/src/mint-firebase-token.mjs and push it via `wrangler secret put FIREBASE_ACCESS_TOKEN`.',
      );
    }
    if (token.trimStart().startsWith('{')) {
      throw new Error(
        'FIREBASE_ACCESS_TOKEN looks like service-account JSON, not an access token. ' +
          'Mint it first: node scripts/src/mint-firebase-token.mjs <sa.json> (outputs TOKEN:<ya29...>), then `wrangler secret put FIREBASE_ACCESS_TOKEN`.',
      );
    }
  }
}
