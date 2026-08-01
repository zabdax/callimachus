#!/usr/bin/env node
// v2.0 default deploy orchestrator.
//
// Per Plan 4 no-screenshot decision: R2 is intentionally skipped.
// The previous deploy-r2.mjs is renamed to this file; R2 bucket + KV
// namespace blocks were removed. The KV namespace is still required (for
// presence nonces + leaderboard cache) and is created in Step 5 of the
// deployment runbook (or via this script's kv step).
//
// What it does:
//   1. Validate required env (Cloudflare + Firebase secrets).
//   2. Build apps/web (vite build → apps/web/dist).
//   3. Build apps/workers (tsc → apps/workers/lib).
//   4. wrangler kv:namespace create TRACKER_CACHE (idempotent).
//   5. wrangler pages deploy apps/web/dist --project-name hsc-crackers.
//   6. wrangler deploy --config apps/workers/wrangler.toml.
//   7. firebase deploy --only firestore:rules (rules still needed).
//
// Usage:
//   node scripts/deploy.mjs
//   node scripts/deploy.mjs --skip-build --targets=workers

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
console.log('  KV:       TRACKER_CACHE');
console.log('  R2:       (intentionally disabled — see HANDOFF.md §no-screenshot)');
