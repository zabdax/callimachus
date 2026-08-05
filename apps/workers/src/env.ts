export interface Env {
  ENVIRONMENT: 'development' | 'staging' | 'production';
  FIREBASE_PROJECT_ID: string;
  FIREBASE_ACCESS_TOKEN: string;
  WORKERS_BASE: string;
  ALLOWED_ORIGINS: string;
  TRACKER_CACHE: KVNamespace;
}

export function requireWorkerConfig(env: Env): void {
  if (!env.FIREBASE_PROJECT_ID) {
    throw new Error('FIREBASE_PROJECT_ID is required');
  }
  if (!env.FIREBASE_ACCESS_TOKEN) {
    throw new Error('FIREBASE_ACCESS_TOKEN is required');
  }
}
