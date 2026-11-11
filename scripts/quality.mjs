// Objective visual-sanity check for a city diorama (no vision model needed).
//   node scripts/quality.mjs <id>            -> renders front+close, reports metrics
// Metrics: coverage (fraction of frame with non-background pixels), luminance
// variance, edge density, and console errors. Use it to gate mass production:
// a healthy diorama has coverage > 0.15, variance > 0.02, edges > 0.02.
import { chromium } from 'playwright-core';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.BASE || 'http://127.0.0.1:5199/';
const id = process.argv[2];
if (!id) { console.log('usage: node scripts/quality.mjs <cityId>'); process.exit(1); }

const browser = await chromium.launch({
  executablePath: CHROME, headless: true,
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });

async function metrics(view, t) {
  await page.goto(`${BASE}?solo=${id}&view=${view}&t=${t}`, { timeout: 60000 });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  await page.waitForTimeout(500);
  return page.evaluate(() => {
    const c = document.getElementById('gl');
    const w = c.width, h = c.height;
    const off = document.createElement('canvas');
    off.width = 128; off.height = 128;
    const g = off.getContext('2d');
    g.drawImage(c, 0, 0, 128, 128);
    const d = g.getImageData(0, 0, 128, 128).data;
    let lumSum = 0, lum2 = 0, dark = 0, bright = 0, edge = 0, n = 0;
    const prev = new Float32Array(128);
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) {
        const i = (y * 128 + x) * 4;
        const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        lumSum += l; lum2 += l * l; n++;
        if (l < 18) dark++;
        if (l > 235) bright++;
        if (y > 0 && Math.abs(l - prev[x]) > 30) edge++;
        prev[x] = l;
      }
    }
    const mean = lumSum / n;
    const variance = Math.max(0, lum2 / n - mean * mean);
    return {
      coverage: 1 - dark / n,
      brightPct: bright / n,
      luminance: Math.round(mean),
      variance: +variance.toFixed(4),
      edges: +(edge / (128 * 128)).toFixed(4),
    };
  });
}

const front = await metrics('front', 6);
const close = await metrics('close', 10);
console.log(JSON.stringify({ id, front, close, errors: errors.filter((e) => !e.includes('favicon')) }, null, 1));
await browser.close();
