import { test, expect } from '@playwright/test';

/**
 * Timer persistence e2e — the regression test for M4's
 * "timer must NOT pause on tab-switch" invariant.
 *
 * Strategy: visit the dev-only /__test/timer route, read the elapsed
 * counter, switch to a new tab for ~60s, switch back, and assert that
 * the displayed elapsed has grown by ~60s (±2s tolerance) without
 * the user pressing Pause.
 */
test('timer keeps running when tab is switched for 60s', async ({ page, context }) => {
  await page.goto('/__test/timer');

  // Start the timer.
  const startBtn = page.getByRole('button', { name: /^start$/i });
  await expect(startBtn).toBeVisible();
  await startBtn.click();

  // Read elapsed mm:ss once running.
  const elapsed = page.locator('[aria-label^="Elapsed"]');
  await expect(elapsed).toBeVisible();

  const before = await elapsed.getAttribute('aria-label');
  // Elapsed is rendered as "Elapsed 00:00". Parse the mm:ss portion.
  const beforeSec = parseElapsed(before ?? '');

  // Open a second tab to force the original tab into the background.
  const other = await context.newPage();
  await other.goto('about:blank');

  // Wait ~60 seconds (timer must keep ticking).
  await page.waitForTimeout(60_000);

  // Bring the original tab back to the foreground.
  await page.bringToFront();

  const after = await elapsed.getAttribute('aria-label');
  const afterSec = parseElapsed(after ?? '');

  await other.close();

  // We tolerate ±2s for the tab-switch boundary and render tick jitter.
  const delta = afterSec - beforeSec;
  expect(delta).toBeGreaterThanOrEqual(58);
  expect(delta).toBeLessThanOrEqual(62);
});

function parseElapsed(label: string): number {
  // "Elapsed 01:23" -> 83
  const m = /Elapsed\s+(\d{2}):(\d{2})/.exec(label);
  if (!m) throw new Error(`Unparseable elapsed label: ${label}`);
  return Number(m[1]) * 60 + Number(m[2]);
}
