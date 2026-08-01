#!/usr/bin/env node
// Deploy HSC Crackers to Firebase Hosting + Cloud Functions.
//
// Validates required env (loadable from .env.production), then shells out
// to npm build + firebase deploy.
//
// Usage:
//   node scripts/deploy.mjs [--skip-build] [--targets=hosting,functions]
//
// Required env (export before running, or put in .env.production):
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
//   FIREBASE_TOKEN (CI token) — falls back to `firebase login` otherwise

import { spawnSync } from 'node:child_process';
import { config as loadDotenv } from 'dotenv';
import { findMissingEnv, REQUIRED_PROD_ENV } from './src/deploy-env.ts';

// Load .env.production if present (does NOT override existing env)
try {
  loadDotenv({ path: 'apps/web/.env.production' });
} catch {
  // dotenv not installed yet — try without
}

const env = Object.fromEntries(
  REQUIRED_PROD_ENV.map((k) => [k, process.env[k]]),
);

const missing = findMissingEnv(env, REQUIRED_PROD_ENV);
if (missing.length > 0) {
  console.error(`ERROR: missing required env vars: ${missing.join(', ')}`);
  console.error('Export them, or put them in apps/web/.env.production (gitignored).');
  process.exit(1);
}

const args = process.argv.slice(2);
const skipBuild = args.includes('--skip-build');
const targetsArg = args.find((a) => a.startsWith('--targets='));
const targets = targetsArg ? targetsArg.split('=')[1] : 'hosting,functions,firestore:rules,storage';

function run(cmd, cwd) {
  console.log(`→ ${cmd} (cwd=${cwd})`);
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

console.log('✓ Deploy complete.');