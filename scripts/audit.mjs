// Geometry + topology audit for a city diorama (no vision needed).
//   node scripts/audit.mjs <id>
// Reports bounding box, min-y, max horizontal radius, triangle & vertex counts,
// draw calls, NaN check, and whether the build fell back to the placeholder.
import { chromium } from 'playwright-core';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.BASE || 'http://127.0.0.1:5199/';
const id = process.argv[2];
if (!id) { console.log('usage: node scripts/audit.mjs <cityId>'); process.exit(1); }

const browser = await chromium.launch({
  executablePath: CHROME, headless: true,
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
await page.goto(`${BASE}?solo=${id}&view=front&t=4`, { timeout: 60000 });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
await page.waitForTimeout(800);

const audit = await page.evaluate(() => {
  const app = window.__app;
  if (!app || !app.entries) return { error: 'no __app' };
  const e = app.entries.find((x) => x.city.id === location.hash.replace('#', '') || x.city.id === new URLSearchParams(location.search).get('solo'));
  const root = e ? e.object : null;
  if (!root) return { error: 'no object (fell back?)' };
  const box = new THREE.Box3().setFromObject(root);
  const minY = box.min.y, maxY = box.max.y;
  const maxExt = Math.max(Math.abs(box.min.x), Math.abs(box.max.x), Math.abs(box.min.z), Math.abs(box.max.z));
  const maxR = Math.max(Math.hypot(box.min.x, box.min.z), Math.hypot(box.max.x, box.max.z), Math.hypot(box.min.x, box.max.z), Math.hypot(box.max.x, box.min.z));
  let tris = 0, draw = 0, nan = 0, meshes = 0;
  root.traverse((o) => {
    if (o.isMesh || o.isLineSegments || o.isPoints) {
      draw++;
      const g = o.geometry;
      if (g) {
        const pos = g.attributes.position;
        if (pos) { for (let i = 0; i < pos.count; i++) if (!isFinite(pos.getX(i)) || !isFinite(pos.getY(i)) || !isFinite(pos.getZ(i))) nan++; }
        if (g.index) tris += g.index.count / 3;
        else if (pos) tris += pos.count / 3;
        meshes++;
      }
    }
  });
  return { minY: +minY.toFixed(3), maxY: +maxY.toFixed(3), maxR: +maxR.toFixed(2), maxExt: +maxExt.toFixed(2), tris, draw, nan, meshes };
});
console.log(JSON.stringify({ id, audit, errors: errors.filter((e) => !e.includes('favicon')) }, null, 1));
await browser.close();
