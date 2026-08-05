import { createApp } from './router.js';
import { cronTick } from './crons.js';
import { makeCronAdapters } from './firebase-admin.js';
import { requireWorkerConfig, type Env } from './env.js';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      requireWorkerConfig(env);
      return createApp(env).fetch(request, env, ctx);
    } catch (error) {
      console.error('worker configuration error', error);
      return Response.json({ ok: false, error: 'service_unavailable' }, { status: 503 });
    }
  },

  async scheduled(controller: ScheduledController, env: Env): Promise<void> {
    requireWorkerConfig(env);
    const date = new Date(controller.scheduledTime);
    const minute = date.getUTCMinutes();
    const hour = date.getUTCHours();
    const schedule = minute === 0 && hour !== 0
      ? 'LEADERBOARD_ROLLUP'
      : hour === 0 && minute === 0
        ? 'BATCH_STATUS'
        : hour === 23 && minute === 0
          ? 'DAILY_PLAN'
          : minute === 30
            ? 'NONCE_AND_REMINDER'
            : 'UNKNOWN';
    await cronTick(schedule, makeCronAdapters({ projectId: env.FIREBASE_PROJECT_ID, accessToken: env.FIREBASE_ACCESS_TOKEN }));
  },
};

interface ScheduledController {
  scheduledTime: number;
  cron: string;
}
