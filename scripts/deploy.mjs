#!/usr/bin/env node
// Deploy Callimachus (PWA + Cloud Functions + rules) to Firebase.
//
// This is the TEMPLATE deploy script. It validates that no placeholder
// values are still in the environment and refuses to run if anything is
// missing. The real production deploy for the Callimachus maintainers
// uses a private script in the maintainer's private infrastructure.
//
// Usage:
//   node scripts/deploy.mjs [--skip-build] [--targets=hosting,functions]
//
// Required env (export before running, or put in apps/web/.env.production):
//   VITE_FIREBASE_API_KEY
//   VITE_FIREBASE_AUTH_DOMAIN
//   VITE_FIREBASE_PROJECT_ID
//   VITE_FIREBASE_STORAGE_BUCKET
//   VITE_FIREBASE_MESSAGING_SENDER_ID
//   VITE_FIREBASE_APP_ID
//   VITE_SENTRY_DSN
//   VITE_SENTRY_ENVIRONMENT
// Optional:
//   VITE_FIREBASE_APPCHECK_SITE_KEY
//   FIREBASE_TOKEN (CI token). Falls back to `firebase login` otherwise.

import { spawnSync } from 'node:child_process';
import { config as loadDotenv } from 'dotenv';
import { findMissingEnv, REQUIRED_PROD_ENV, PLACEHOLDER_MARKERS } from './src/deploy-env.ts';

// Load .env.production if present (does NOT override existing env).
try {
  loadDotenv({ path: 'apps/web/.env.production' });
} catch {
  // dotenv not installed yet - run from the repo root after `npm ci` in scripts/.
}

const env = Object.fromEntries(
  REQUIRED_PROD_ENV.map((k) => [k, process.env[k]]),
);

const missing = findMissingEnv(env, REQUIRED_PROD_ENV);
if (missing.length > 0) {
  console.error(`ERROR: missing required env vars: ${missing.join(', ')}`);
  console.error('Set them in apps/web/.env.production (gitignored) or export them in your shell.');
  process.exit(1);
}

// Refuse to run if any value still contains a placeholder marker
// (e.g. <your-project-id>). This catches users who copy-pasted the
// template and forgot to substitute their own values.
const stillTemplate = Object.entries(env)
  .filter(([, v]) => PLACEHOLDER_MARKERS.some((m) => String(v).includes(m)))
  .map(([k]) => k);
if (stillTemplate.length > 0) {
  console.error(`ERROR: env still contains template placeholders: ${stillTemplate.join(', ')}`);
  console.error('Replace every <your-...> marker with your real value, or remove the line.');
  process.exit(1);
}

const args = process.argv.slice(2);
const skipBuild = args.includes('--skip-build');
const targetsArg = args.find((a) => a.startsWith('--targets='));
const targets = targetsArg ? targetsArg.split('=')[1] : 'hosting,functions,firestore:rules,storage';

function run(cmd, cwd) {
  console.log(`-> ${cmd} (cwd=${cwd})`);
  const r = spawnSync(cmd, { cwd, stdio: 'inherit', shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

if (!skipBuild) {
  run('npm ci --no-audit --prefer-offline', 'apps/web');
  run('npm run build', 'apps/web');
  run('npm ci --no-audit --prefer-offline', 'apps/functions');
  run('npm run build', 'apps/functions');
}

run(`firebase deploy --only ${targets}`, '.');

console.log('Deploy complete.');
