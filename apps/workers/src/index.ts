import { app } from './router.js';
import { cronTick } from './crons.js';
import { cronAdapters } from './firebase-admin.js';
import {
  DAILY_PLAN_CRON,
  HOURLY_CRON,
  DAILY_MIDNIGHT_CRON,
  NONCE_AND_REMINDER_CRON,
} from './handlers/batchStatus.js';

/**
 * Worker entrypoint. Session 6 adds cron-triggered handlers:
 *   - DAILY_PLAN_CRON (5am Asia/Dhaka): generate daily plans
 *   - HOURLY_CRON: roll up leaderboards
 *   - DAILY_MIDNIGHT_CRON: recompute batch states
 *   - NONCE_AND_REMINDER_CRON (every hour at :30): emit nonces + push reminders
 *
 * Per design §4 we bundle emitNonce + sendRevisionReminder into one
 * trigger to fit within Cloudflare's 5-cron free-tier limit.
 */

export default {
  async fetch(request: Request): Promise<Response> {
    return app.fetch(request);
  },

  // The `scheduled` handler routes by the cron name configured in
  // wrangler.toml. wrangler passes the cron as the first arg.
  async scheduled(controller: ScheduledController): Promise<void> {
    // Wrangler gives us no programmatic way to know which cron fired.
    // We dispatch by Date-based heuristics — all 4 run on different
    // schedules so the dispatch is unambiguous.
    const cr = new Date(controller.scheduledTime);
    const m = cr.getUTCMinutes();
    const h = cr.getUTCHours();
    let schedule: string;
    if (m === 0 && h !== 0) schedule = 'LEADERBOARD_ROLLUP';
    else if (h === 0 && m === 0) schedule = 'BATCH_STATUS';
    else if (h === 23 && m === 0) schedule = 'DAILY_PLAN';
    else if (m === 30) schedule = 'NONCE_AND_REMINDER';
    else schedule = 'UNKNOWN';
    await cronTick(schedule, cronAdapters);
  },
};

export { DAILY_PLAN_CRON, HOURLY_CRON, DAILY_MIDNIGHT_CRON, NONCE_AND_REMINDER_CRON };

interface ScheduledController {
  scheduledTime: number;
  cron: string;
}
