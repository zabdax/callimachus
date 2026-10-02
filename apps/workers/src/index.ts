import { createApp } from './router.js';
import { cronTick } from './crons.js';
import { makeCronAdapters } from './supabase.js';
import { requireWorkerConfig, type Env } from './env.js';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      requireWorkerConfig(env);
      return createApp(env).fetch(request, env, ctx);
    } catch (error) {
      const message = (error as Error)?.message ?? 'worker misconfigured';
      console.error('worker configuration error', error);
      return Response.json({ ok: false, error: 'service_unavailable', message }, { status: 503 });
    }
  },

  async scheduled(controller: ScheduledController, env: Env): Promise<void> {
    try {
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
      if (schedule === 'UNKNOWN') {
        // Schedule drift or a new trigger missing from wrangler.toml — make
        // it visible in logs instead of silently no-oping.
        console.error(`unmapped cron trigger: ${controller.cron}`);
        return;
      }
      await cronTick(schedule, makeCronAdapters({ url: env.SUPABASE_URL, serviceKey: env.SUPABASE_SERVICE_KEY }));
    } catch (error) {
      // A thrown cron would surface as an unhandled rejection and silently
      // skip; log so failures are observable in Workers logs.
      console.error('cron tick failed', error);
    }
  },
};

interface ScheduledController {
  scheduledTime: number;
  cron: string;
}
