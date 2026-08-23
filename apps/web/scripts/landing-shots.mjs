/* Visual check helper — screenshots the landing at several scroll positions. */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const outDir = new URL('./shots/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});

await page.goto('http://localhost:4173/welcome', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3500);

const stops = [
  ['marquee', 700],
  ['hero', 0],
  ['walk-1', 1500],
  ['walk-2', 2400],
  ['walk-3', 3200],
  ['method', 4400],
  ['features', 5400],
  ['pricing', 5950],
  ['final', 6352],
];
const height = await page.evaluate(() => document.body.scrollHeight);
for (const [name, factor] of stops) {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), factor);
  await page.waitForTimeout(1300);
  await page.screenshot({ path: `${outDir}${name}.png` });
}

// mobile pass
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto('http://localhost:4173/welcome', { waitUntil: 'domcontentloaded' });
await mobile.waitForTimeout(3000);
await mobile.screenshot({ path: `${outDir}mobile-hero.png` });
await mobile.evaluate(() => window.scrollTo({ top: 2600, behavior: 'instant' }));
await mobile.waitForTimeout(1200);
await mobile.screenshot({ path: `${outDir}mobile-mid.png` });

console.log('page height:', height);
console.log('console/page errors:', errors.length ? errors.slice(0, 10) : 'none');
await browser.close();
