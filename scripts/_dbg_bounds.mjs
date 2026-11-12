// Dump per-mesh world bounds + material type, to identify every mesh.
import { chromium } from 'playwright-core';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.BASE || 'http://127.0.0.1:5199/';
const id = process.argv[2] || 'shelobs-lair';
const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(`${BASE}?solo=${id}&view=front&t=1`, { timeout: 60000 });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
await page.waitForTimeout(600);
const out = await page.evaluate(() => {
  const app = window.__app;
  const e = app.entries.find((x) => x.city.id === new URLSearchParams(location.search).get('solo'));
  const root = e.object;
  const res = [];
  root.traverse((o) => {
    if (o.isMesh || o.isLineSegments) {
      const b = new THREE.Box3().setFromObject(o);
      res.push({
        kind: o.isLineSegments ? 'lines' : 'mesh',
        mat: o.material ? (o.material.type + (o.material.vertexColors ? '|vc' : '')) : '?',
        minY: +b.min.y.toFixed(3), maxY: +b.max.y.toFixed(3),
        minX: +b.min.x.toFixed(2), maxX: +b.max.x.toFixed(2),
        minZ: +b.min.z.toFixed(2), maxZ: +b.max.z.toFixed(2),
      });
    }
  });
  return res;
});
out.sort((a, b) => a.minY - b.minY);
for (const r of out) console.log(JSON.stringify(r));
await browser.close();
