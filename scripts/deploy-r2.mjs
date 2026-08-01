#!/usr/bin/env node
// v2.0 default deploy orchestrator.
//
// What it does:
//   1. Validate required env (Cloudflare + Firebase secrets).
//   2. Build apps/web (vite build → apps/web/dist).
//   3. Build apps/workers (tsc → apps/workers/lib).
//   4. wrangler pages deploy apps/web/dist --project-name hsc-crackers.
//   5. wrangler deploy --config apps/workers/wrangler.toml.
//   6. wrangler r2 bucket ... (create bucket if missing).
//   7. wrangler kv:namespace create TRACKER_CACHE (idempotent).
//   8. firebase deploy --only firestore:rules (rules still needed).
//
// Usage:
//   node scripts/deploy-r2.mjs
//   node scripts/deploy-r2.mjs --skip-build --skip-pages --targets=workers

import { spawnSync } from 'node:child_process';
import { config as loadDotenv } from 'dotenv';

/** Mirrors scripts/src/deploy-env.ts. Inlined because Node 20 cannot
 *  strip TS from a sibling .ts file at runtime without a bundler. */
const REQUIRED = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_SENTRY_DSN',
  'VITE_SENTRY_ENVIRONMENT',
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ACCOUNT_ID',
  'FIREBASE_TOKEN',
];

function findMissingEnv(env, required) {
  return required.filter((k) => !env[k] || env[k] === '');
}

const args = process.argv.slice(2);
const skipBuild = args.includes('--skip-build');
const skipPages = args.includes('--skip-pages');
const targetsArg = args.find((a) => a.startsWith('--targets='));
const onlyTargets = targetsArg ? targetsArg.split('=')[1].split(',') : null;

try {
  loadDotenv({ path: 'apps/web/.env.production' });
} catch {
  // dotenv not installed — env can be passed via shell.
}

const env = Object.fromEntries(REQUIRED.map((k) => [k, process.env[k]]));
const missing = findMissingEnv(env, REQUIRED);
if (missing.length > 0) {
  console.error(`ERROR: missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}

function run(cmd, cwd = '.') {
  console.log(`→ ${cmd} (cwd=${cwd})`);
  const r = spawnSync(cmd, {
    cwd,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env },
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function wants(target) {
  return onlyTargets === null || onlyTargets.includes(target);
}

if (!skipBuild) {
  run('npm ci --no-audit --prefer-offline', 'apps/web');
  run('npm run build', 'apps/web');
  run('npm ci --no-audit --prefer-offline', 'apps/workers');
  run('npm run build', 'apps/workers');
}

if (wants('bucket') && !skipPages) {
  run(
    `wrangler r2 bucket create hsc-tracker-screenshots || echo "bucket may already exist"`,
    'apps/workers',
  );
}

if (wants('kv') && !skipPages) {
  run(
    `wrangler kv:namespace create TRACKER_CACHE || echo "namespace may already exist"`,
    'apps/workers',
  );
}

if (wants('pages') && !skipPages) {
  run(
    'wrangler pages deploy apps/web/dist --project-name hsc-crackers --commit-dirty=true',
    '.',
  );
}

if (wants('workers')) {
  run('wrangler deploy --config apps/workers/wrangler.toml', '.');
}

if (wants('rules')) {
  run('firebase deploy --only firestore:rules', '.');
}

console.log('✓ v2.0 deploy complete.');
console.log('  Workers:  https://' + (process.env.WORKERS_BASE ?? 'hsc-crackers-workers.workers.dev'));
console.log('  Pages:    https://hsc-crackers.pages.dev');
console.log('  R2:       hsc-tracker-screenshots (presigned-URL only)');