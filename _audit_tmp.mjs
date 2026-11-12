import { chromium } from 'playwright-core';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({
  executablePath: CHROME, headless: true,
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto('http://127.0.0.1:5199/?solo=isengard&view=front&t=6');
await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
await page.waitForTimeout(300);
const out = await page.evaluate(() => {
  const app = window.__app;
  const q = new URLSearchParams(location.search).get('solo');
  const root = app.entries.find((e) => e.city.id === q) || app.entries[0];
  root.holder.updateWorldMatrix(true, true);
  const st = root.stage;
  let terrainR = 0, terrainV = 0;
  let maxVerts = 0, biggest = null;
  root.object.traverse((o) => {
    if (o.isMesh && o.geometry.attributes.position.count > maxVerts) {
      maxVerts = o.geometry.attributes.position.count;
      biggest = { mat: o.material.type, count: maxVerts };
      const p = o.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const r = Math.hypot(p.getX(i), p.getZ(i));
        if (r > terrainR) terrainR = r;
      }
    }
  });
  return {
    holderPos: root.holder.position.toArray().map((x) => +x.toFixed(3)),
    holderScale: root.holder.scale.toArray().map((x) => +x.toFixed(3)),
    stagePos: st.position.toArray().map((x) => +x.toFixed(3)),
    stageScale: st.scale.toArray().map((x) => +x.toFixed(3)),
    biggest: biggest, terrainMaxR: +terrainR.toFixed(2),
  };
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
