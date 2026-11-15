// Phone screenshots of every page, for design review. Signed in against the fake Supabase.
// Usage: npm run build && npx tsx scripts/mobile-shots.ts [width]   (shots go to scratch/mobile/)
/// <reference lib="dom" />
import fs from 'node:fs';
import path from 'node:path';
import { preview } from 'vite';
import { chromium, type Page } from 'playwright';
import { FakeSupabase } from './lib/fake-supabase.ts';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'scratch', 'mobile');
fs.mkdirSync(out, { recursive: true });
const width = Number(process.argv[2] ?? 390);
const theme = process.argv[3] ?? 'dark';

const server = await preview({ root, preview: { port: 4181, strictPort: true, open: false }, logLevel: 'silent' });
const base = 'http://localhost:4181/';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
await ctx.addInitScript((t) => localStorage.setItem('eastdeca:theme', t), theme);
const shot = (p: Page, name: string, full = false) => p.screenshot({ path: path.join(out, `${name}.png`), fullPage: full });

try {
  // Signed out
  const lctx = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await lctx.addInitScript((t) => localStorage.setItem('eastdeca:theme', t), theme);
  await new FakeSupabase().attach(lctx, { signedIn: false });
  const lp = await lctx.newPage();
  await lp.goto(base);
  await lp.waitForSelector('text=Sign in');
  await shot(lp, '01-login', true);
  await lctx.close();

  const db = new FakeSupabase();
  await db.attach(ctx);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('pageerror', e.message));
  await p.goto(base);
  await p.waitForSelector('[role=radiogroup]');
  await shot(p, '02-practice');
  await shot(p, '02b-practice-full', true);
  await p.locator('[role=radio]').nth(1).tap();
  await p.waitForSelector('text=Answer:');
  await shot(p, '03-practice-answered');
  await shot(p, '03b-practice-answered-full', true);
  // a few more answers so review/dashboard have data
  for (let i = 0; i < 6; i++) {
    await p.keyboard.press('Enter');
    await p.waitForTimeout(150);
    await p.locator('[role=radio]').nth(i % 4).tap();
    await p.waitForSelector('text=Answer:');
  }
  await p.keyboard.press('s');

  await p.goto(base + '#/mock');
  await p.waitForSelector('text=Start replay');
  await shot(p, '04-mock-start', true);
  await p.click('text=Start replay');
  await p.waitForSelector('text=Question 1');
  await p.locator('[role=radio]').first().tap().catch(() => p.keyboard.press('a'));
  await shot(p, '05-mock-running');
  await shot(p, '05b-mock-running-full', true);
  for (let i = 0; i < 4; i++) {
    await p.keyboard.press('abcd'[i]);
    await p.keyboard.press('ArrowRight');
  }
  await p.click('button:has-text("Submit")');
  await p.waitForTimeout(200);
  await shot(p, '06-mock-submit-dialog');
  await p.click('text=Submit now');
  await p.waitForSelector('text=By instructional area');
  await shot(p, '07-mock-results', true);

  await p.goto(base + '#/review');
  await p.waitForSelector('h1:has-text("Review")');
  await shot(p, '08-review', true);
  await p.click('role=tab[name=/All missed/]').catch(() => {});
  const item = p.locator('main li button[aria-expanded]').first();
  if (await item.count()) await item.tap();
  await shot(p, '08b-review-open', true);

  await p.goto(base + '#/dashboard');
  await p.waitForSelector('text=Weakness heatmap');
  await shot(p, '09-dashboard', true);

  await p.goto(base + '#/settings');
  await p.waitForSelector('h1');
  await shot(p, '10-settings', true);
  console.log('ok', out);
} finally {
  await browser.close();
  await new Promise<void>((r) => server.httpServer.close(() => r()));
}
