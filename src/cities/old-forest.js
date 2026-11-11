// The Old Forest — where the trees lean and mutter and the Withywindle sings.
// One strong idea: a dense shadowy wood of leaning, threatening ancients, a
// golden-brown river curling through it, and one huge menacing willow at the heart.
import { THREE, Builder, M, C, terrainDisc, fbm, hash2, rock } from '../kit.js';
import { setInst } from './_ab_util.js';

const WATER_Y = 0.22;          // the Withywindle's surface
const WX = -0.2, WZ = 1.4;     // the great willow, on the north bank
const RIVER = [[-6.9, 4.4], [-5.2, 4.1], [-3.4, 3.4], [-1.8, 2.4], [-0.7, 1.3],
  [0.2, 0.4], [1.1, -0.2], [2.3, -0.7], [3.8, -1.2], [5.3, -2.0], [6.7, -3.3], [7.6, -4.8]];

// smooth the river into a dense polyline so the channel, band and banks hug its bends
const _CURVE = new THREE.CatmullRomCurve3(RIVER.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
const RIVER_PTS = [];
for (let i = 0; i <= 72; i++) RIVER_PTS.push(_CURVE.getPoint(i / 72));

function distToRiver(x, z) {
  let best = 1e9;
  for (let i = 0; i < RIVER_PTS.length - 1; i++) {
    const a = RIVER_PTS[i], b = RIVER_PTS[i + 1];
    const abx = b.x - a.x, abz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * abx + (z - a.z) * abz) / (abx * abx + abz * abz)));
    const dx = x - (a.x + abx * t), dz = z - (a.z + abz * t);
    const dd = dx * dx + dz * dz;
    if (dd < best) best = dd;
  }
  return Math.sqrt(best);
}

/* lerp two hex colours by t (0..1 from a to b) */
function mixHex(a, b, t) {
  const ca = parseInt(a.slice(1), 16), cb = parseInt(b.slice(1), 16);
  const r = (ca >> 16) + ((cb >> 16) - (ca >> 16)) * t;
  const g = ((ca >> 8) & 255) + (((cb >> 8) & 255) - ((ca >> 8) & 255)) * t;
  const bl = (ca & 255) + ((cb & 255) - (ca & 255)) * t;
  return '#' + (((Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl)) >>> 0).toString(16).padStart(6, '0');
}

export default function build({ rng, city, accent }) {
  const b = new Builder();
  const object = new THREE.Group();

  /* --------------- tree positions first (the terrain shades under them) ---- */
  const TREES = [];
  let tries = 0;
  while (TREES.length < 12 && tries++ < 900) {
    const [x, z] = rng.inDisc(8.7, 3.6);
    if (distToRiver(x, z) < 1.45) continue;                 // keep the river open
    if (Math.hypot(x - WX, z - WZ) < 3.0) continue;         // keep the willow's clearing
    let ok = true;
    for (const t of TREES) if (Math.hypot(t.x - x, t.z - z) < 2.8) { ok = false; break; }
    if (!ok) continue;
    const th = rng.range(4.6, 6.8);
    const lean = rng.range(0.25, 0.95);                     // some nearly horizontal
    let dir = rng.range(0, Math.PI * 2);
    const reach = Math.sin(lean) * th;
    if (Math.hypot(x + Math.sin(dir) * reach, z + Math.cos(dir) * reach) > 8.6) dir += Math.PI; // keep crowns on the disc
    TREES.push({ x, z, h: th, lean, dir });
  }

  /* ------------------------------ terrain -------------------------------- */
  const h = (x, z) => {
    let y = 0.34 + 0.09 * fbm(x * 0.3 + 4.1, z * 0.3 + 8.3, { oct: 3, seed: 17 });
    const d = distToRiver(x, z);
    y -= 0.32 * Math.exp(-(d * d) / 0.64);                            // the river channel
    y += 0.30 * Math.exp(-((x + 4.2) ** 2 + (z + 3.4) ** 2) / 16);     // the wood rises away from the water
    y += 0.26 * Math.exp(-((x - 4.6) ** 2 + (z - 3.8) ** 2) / 20);
    y -= 0.10 * Math.exp(-((x - WX) ** 2 + (z - WZ) ** 2) / 4.5);      // a damp hollow at the willow's feet
    return Math.max(0.08, y);
  };

  const colorAt = (x, z, y, up) => {
    if (distToRiver(x, z) < 0.52 && y < 0.3) return '#4a4433';         // tea-dark bed
    const j = hash2(Math.round(x * 2.5), Math.round(z * 2.5), 29);
    let c;
    if (up < 0.6 && y > 0.3) c = ['#3a5238', '#415a3d'][Math.floor(j * 2) % 2];
    else c = ['#41613f', '#3f5d3f', '#4a6a45', '#39523a'][Math.floor(j * 4) % 4];
    // deep shade beneath the big trees and the willow
    let md2 = (x - WX) ** 2 + (z - WZ) ** 2;
    for (const t of TREES) {
      const dd = (t.x - x) ** 2 + (t.z - z) ** 2;
      if (dd < md2) md2 = dd;
    }
    const md = Math.sqrt(md2);
    if (md < 1.3) c = mixHex(c, '#2b3828', 0.55 * (1 - md / 1.3));
    return c;
  };

  terrainDisc(b, { r: 10.5, rings: 56, segs: 96, height: h, colorAt, mat: M.stone, seed: 17 });

  /* ------------------------------ the Withywindle ------------------------ */
  for (let i = 0; i < RIVER_PTS.length - 1; i++) {
    const a = RIVER_PTS[i], c = RIVER_PTS[i + 1];
    const len = Math.hypot(c.x - a.x, c.z - a.z);
    b.box(len, 0.06, 0.8, {
      x: (a.x + c.x) / 2, y: WATER_Y - 0.03, z: (a.z + c.z) / 2,
      ry: Math.atan2(c.z - a.z, c.x - a.x), color: '#6a5a3a', mat: M.water,
    });
  }
  // stepping stones across the shallow bend
  for (const [sx, sz, sr] of [[2.2, -0.28, 0.24], [2.45, -0.5, 0.2], [2.7, -0.78, 0.22], [2.95, -1.04, 0.2], [3.2, -1.3, 0.24]]) {
    b.cyl(sr * 0.6, sr, 0.1, { x: sx, y: WATER_Y - 0.02, z: sz, color: '#6f6a5c', mat: M.smooth, seg: 10 });
  }

  /* --------------------------- the fading path ---------------------------- */
  const PATH = [[8.0, 2.9], [6.9, 2.3], [5.7, 1.6], [4.5, 1.0], [3.4, 0.4], [2.5, -0.15]];
  for (let i = 0; i < PATH.length - 1; i++) {
    const a = PATH[i], c = PATH[i + 1];
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2;
    b.box(len, 0.05, 0.55, { x: mx, y: h(mx, mz) + 0.02, z: mz, ry: Math.atan2(c[1] - a[1], c[0] - a[0]), color: '#7d6c4a', mat: M.stone });
  }
  // the path continues on the far bank, then fades into the dark
  const PATH2 = [[1.9, -1.6], [1.1, -2.4], [0.3, -3.1], [-0.5, -3.75], [-1.2, -4.35]];
  const W2 = [0.5, 0.46, 0.4, 0.32, 0.24];
  for (let i = 0; i < PATH2.length - 1; i++) {
    const a = PATH2[i], c = PATH2[i + 1];
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2;
    const dim = i / (PATH2.length - 2);
    b.box(len, 0.05, W2[i], { x: mx, y: h(mx, mz) + 0.02, z: mz, ry: Math.atan2(c[1] - a[1], c[0] - a[0]), color: mixHex('#7d6c4a', '#4c4431', dim * 0.85), mat: M.stone });
  }
  // roots across the path, to trip the traveller
  b.rod([4.3, h(4.3, 0.95) + 0.02, 0.95], [3.5, h(3.5, 0.45) + 0.04, 0.45], 0.05, { r2: 0.03, color: '#45301f', mat: M.wood, seg: 5 });
  b.rod([0.75, h(0.75, -2.7) + 0.02, -2.7], [-0.25, h(-0.25, -3.4) + 0.04, -3.4], 0.05, { r2: 0.03, color: '#45301f', mat: M.wood, seg: 5 });

  /* --------------------------- a fallen tree across the river ------------ */
  const gyA = h(0.35, 0.65), gyB = h(1.95, -1.05);
  b.rod([0.35, gyA + 0.04, 0.65], [1.95, gyB + 0.16, -1.05], 0.17, { r2: 0.1, color: '#45301f', mat: M.wood, seg: 8 });
  for (const [a, len] of [[2.9, 0.5], [3.6, 0.6], [2.1, 0.55], [4.0, 0.45]]) {
    const ex = 0.35 + Math.cos(a) * len, ez = 0.65 + Math.sin(a) * len;
    const ey = Math.max(0.05, h(ex, ez) + 0.02);
    b.rod([0.35, gyA + 0.04, 0.65], [ex, ey, ez], 0.06, { r2: 0.02, color: '#45301f', mat: M.wood, seg: 5 });
  }
  // a root tip groping into the water
  b.rod([0.5, gyA + 0.05, 0.55], [0.82, WATER_Y + 0.02, 0.18], 0.05, { r2: 0.02, color: '#45301f', mat: M.wood, seg: 5 });
  // broken stubs of branches
  b.rod([1.95, gyB + 0.2, -1.05], [2.17, gyB + 0.6, -1.0], 0.05, { r2: 0.02, color: '#45301f', mat: M.wood, seg: 5 });
  b.rod([0.55, gyA + 0.18, 0.6], [0.8, gyA + 0.62, 0.85], 0.05, { r2: 0.02, color: '#45301f', mat: M.wood, seg: 5 });

  /* ------------------------------ mossy rocks ----------------------------- */
  for (const [rx, rz, rr, rh] of [[-4.3, 2.8, 0.5, 0.9], [2.9, -2.3, 0.45, 0.85], [5.9, 0.6, 0.5, 0.95], [-3.4, -3.2, 0.4, 0.75], [6.4, -3.9, 0.4, 0.8]]) {
    const ry = h(rx, rz);
    rock(b, { x: rx, y: ry + 0.45 * rh, z: rz, r: rr, h: rh, color: rng.pick(['#5a6450', '#4f5a44', '#626b55']), rand: rng, detail: 1 });
    b.geo(new THREE.IcosahedronGeometry(1, 0), { x: rx, y: ry + rh * 0.7, z: rz, sx: rr * 0.8, sy: rr * 0.5, sz: rr * 0.8, color: accent, mat: M.flat, ry: rng.range(0, 6) });
  }

  /* ------------------------- low undergrowth bushes ----------------------- */
  for (let i = 0; i < 14; i++) {
    const [ux, uz] = rng.inDisc(8.6, 1.5);
    if (distToRiver(ux, uz) < 0.9) continue;
    if (Math.hypot(ux - WX, uz - WZ) < 2.2) continue;
    const s = rng.range(0.35, 0.6);
    b.geo(new THREE.IcosahedronGeometry(1, 0), { x: ux, y: h(ux, uz) + s * 0.8, z: uz, sx: s, sy: s * 0.8, sz: s, color: rng.pick([C.darkleaf, C.pine, '#4a6a45', '#35523a']), mat: M.flat, ry: rng.range(0, 6) });
  }

  /* ------------------------- the leaning ancients ------------------------- */
  function oldTree(t) {
    const { x, z, h: th, lean, dir } = t;
    const gy = h(x, z);
    const dx = Math.sin(dir), dz = Math.cos(dir);
    const lx = dx * Math.sin(lean), lz = dz * Math.sin(lean);
    const cy = Math.cos(lean);
    const top = [x + lx * th, gy + cy * th, z + lz * th];
    const r0 = rng.range(0.3, 0.42), r1 = rng.range(0.16, 0.22), r2 = rng.range(0.09, 0.13);
    const wob1 = rng.range(0.05, 0.18), wob2 = rng.range(0.04, 0.15);
    const p1 = [x + lx * th * 0.34 + Math.cos(dir + 1.6) * wob1, gy + cy * th * 0.34, z + lz * th * 0.34 + Math.sin(dir + 1.6) * wob1];
    const p2 = [x + lx * th * 0.68 + Math.cos(dir - 1.2) * wob2, gy + cy * th * 0.68, z + lz * th * 0.68 + Math.sin(dir - 1.2) * wob2];
    const col = '#45301f';
    b.rod([x, gy + 0.02, z], p1, r0, { r2: r1, color: col, mat: M.wood, seg: 8 });
    b.rod(p1, p2, r1, { r2: r2, color: col, mat: M.wood, seg: 8 });
    b.rod(p2, top, r2, { r2: rng.range(0.05, 0.08), color: col, mat: M.wood, seg: 8 });
    // splayed roots
    for (let i = 0, n = rng.int(3, 5); i < n; i++) {
      const a = rng.range(0, Math.PI * 2);
      const len = rng.range(0.5, 1.0);
      const ex = x + Math.cos(a) * len, ez = z + Math.sin(a) * len;
      const ey = Math.max(0.05, h(ex, ez) + 0.03);
      b.rod([x, gy + 0.02, z], [ex, ey, ez], rng.range(0.03, 0.055), { r2: 0.015, color: col, mat: M.wood, seg: 5 });
    }
    // a low bush at the base, then heavy canopy blobs along the lean
    const s0 = rng.range(0.8, 1.2);
    b.geo(new THREE.IcosahedronGeometry(1, 0), {
      x: x + dx * 0.15, y: gy + s0 * 0.85, z: z + dz * 0.15,
      sx: s0, sy: s0 * 0.8, sz: s0, color: rng.pick([C.darkleaf, C.pine, '#35523a']), mat: M.flat, ry: rng.range(0, 6),
    });
    const nb = rng.int(4, 6);
    for (let i = 0; i < nb; i++) {
      const t0 = 0.22 + (i / nb) * 0.78;
      const cxp = x + lx * th * t0, czp = z + lz * th * t0;
      const cyp = gy + cy * th * t0;
      const s = rng.range(1.15, 1.75) * (1 - t0 * 0.35);
      const wob = rng.range(0, Math.PI * 2);
      const ox = Math.cos(wob) * s * 0.4, oz = Math.sin(wob) * s * 0.4;
      const oy = s * rng.range(0.85, 1.25);
      b.geo(new THREE.IcosahedronGeometry(1, 0), {
        x: cxp + ox, y: cyp + oy, z: czp + oz,
        sx: s, sy: s * rng.range(0.9, 1.2), sz: s,
        color: rng.pick([C.darkleaf, C.pine, '#4a6a45', '#35523a', '#41613f']), mat: M.flat, ry: rng.range(0, 6),
      });
    }
    // ragged branches off the top
    for (let i = 0; i < 2; i++) {
      const a = rng.range(0, Math.PI * 2);
      b.rod(top, [top[0] + Math.cos(a) * rng.range(0.5, 0.9), top[1] + rng.range(0.4, 0.9), top[2] + Math.sin(a) * rng.range(0.5, 0.9)], rng.range(0.04, 0.07), { r2: 0.02, color: col, mat: M.wood, seg: 6 });
    }
    // a tuft of moss (realm accent) low on the trunk
    b.geo(new THREE.IcosahedronGeometry(1, 0), {
      x: p1[0] + dx * 0.12, y: p1[1] + 0.4, z: p1[2] + dz * 0.12,
      sx: 0.32, sy: 0.28, sz: 0.32, color: accent, mat: M.flat, ry: rng.range(0, 6),
    });
  }
  for (const t of TREES) oldTree(t);

  /* ---------------------------- the great willow -------------------------- */
  function willow(gy) {
    const trunk = '#3d2c1c';
    const lean = 0.16, dir = 2.5;                       // leans a little toward the river
    const lx = Math.sin(dir) * Math.sin(lean), lz = Math.cos(dir) * Math.sin(lean);
    const H = 3.3;
    const p1 = [WX + lx * H * 0.4 + 0.14, gy + H * 0.4, WZ + lz * H * 0.4 - 0.1];
    const p2 = [WX + lx * H * 0.75 - 0.07, gy + H * 0.75, WZ + lz * H * 0.75 + 0.12];
    const top = [WX + lx * H + 0.06, gy + H, WZ + lz * H - 0.05];
    b.rod([WX, gy + 0.02, WZ], p1, 0.55, { r2: 0.4, color: trunk, mat: M.wood, seg: 10 });
    b.rod(p1, p2, 0.4, { r2: 0.28, color: trunk, mat: M.wood, seg: 10 });
    b.rod(p2, top, 0.28, { r2: 0.16, color: trunk, mat: M.wood, seg: 10 });
    // a gnarled root-crown
    b.geo(new THREE.SphereGeometry(1, 12, 8), { x: WX + 0.1, y: gy + 0.42, z: WZ, sx: 0.8, sy: 0.52, sz: 0.72, color: trunk, mat: M.wood });
    // roots reaching toward the water
    for (const [a, len] of [[0.35, 1.4], [0.85, 1.15], [-0.4, 1.05], [2.5, 1.3], [1.9, 1.4], [3.6, 1.0]]) {
      const ex = WX + Math.cos(a) * len, ez = WZ + Math.sin(a) * len;
      const ey = Math.max(0.05, h(ex, ez) + 0.02);
      b.rod([WX, gy + 0.03, WZ], [ex, ey, ez], 0.13, { r2: 0.045, color: trunk, mat: M.wood, seg: 6 });
    }
    // main branches out and up
    const BR = [[-1.6, 4.6, -0.5], [1.7, 4.8, 1.0], [0.8, 5.1, -1.4], [-0.8, 4.9, 1.8], [2.0, 4.3, -0.8], [-1.9, 4.2, 1.0]];
    for (const [bx, by, bz] of BR) b.rod(top, [WX + bx, gy + by, WZ + bz], 0.1, { r2: 0.04, color: trunk, mat: M.wood, seg: 6 });
    // drooping fronds from the branch ends
    const FR = [];
    for (const [bx, by, bz] of BR) FR.push([WX + bx, gy + by, WZ + bz]);
    FR.push([WX + 0.2, gy + 5.0, WZ - 0.3], [WX - 1.3, gy + 4.5, WZ + 0.4], [WX + 1.4, gy + 4.3, WZ + 0.7]);
    for (const [fx, fy, fz] of FR) {
      const n = rng.int(2, 4);
      for (let i = 0; i < n; i++) {
        const drop = rng.range(1.0, 1.8);
        const dx = fx + rng.range(-0.28, 0.28), dz = fz + rng.range(-0.28, 0.28);
        b.rod([fx, fy, fz], [dx, fy - drop, dz], 0.017, { r2: 0.009, color: '#7a8c5e', mat: M.wood, seg: 5 });
        b.geo(new THREE.IcosahedronGeometry(1, 0), {
          x: dx, y: fy - drop + 0.08, z: dz, sx: 0.24, sy: 0.3, sz: 0.24,
          color: rng.pick(['#8aa36a', '#7d9a63', '#a3b57a', '#71905a']), mat: M.flat, ry: rng.range(0, 6),
        });
      }
    }
    // the pale willow crown
    const CROWN = [[0.15, 5.4, -0.1, 1.6], [-1.5, 5.0, 0.5, 1.1], [1.6, 4.9, 0.7, 1.05], [0.6, 5.1, -1.5, 1.05],
      [-0.7, 4.8, 1.9, 0.95], [1.8, 4.5, -1.0, 0.9], [-1.7, 4.4, 1.3, 0.85], [1.0, 4.3, 1.4, 0.8]];
    for (const [cx, cy, cz, s] of CROWN) {
      b.geo(new THREE.IcosahedronGeometry(1, 0), {
        x: WX + cx, y: gy + cy, z: WZ + cz, sx: s, sy: s * 0.92, sz: s,
        color: rng.pick(['#8aa36a', '#7d9a63', '#a3b57a']), mat: M.flat, ry: rng.range(0, 6),
      });
    }
  }
  willow(h(WX, WZ));

  /* ------------------ a traveller who stopped to listen ------------------- */
  const ty = h(0.6, 2.0);
  b.cyl(0.08, 0.12, 0.3, { x: 0.6, y: ty + 0.03, z: 2.0, rx: Math.PI / 2 + 0.16, color: '#7a4a2c', mat: M.cloth, seg: 7 });
  b.sphere(0.06, { x: 0.7, y: ty + 0.05, z: 1.72, color: '#d7b08c', mat: M.smooth, seg: 8 });
  b.box(0.1, 0.08, 0.14, { x: 0.48, y: ty + 0.02, z: 2.2, ry: 0.5, color: '#5d5a4a', mat: M.cloth });

  /* ------------------------------ static build ---------------------------- */
  object.add(b.build());

  /* -------------------------- two faint watchful lights -------------------- */
  const willowLight = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), glowMatSoft('#cfd9a8', 1.35));
  willowLight.position.set(WX + 0.1, h(WX, WZ) + 2.1, WZ);
  willowLight.castShadow = willowLight.receiveShadow = false;
  object.add(willowLight);
  const deepLight = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), glowMatSoft('#d9b48a', 1.2));
  deepLight.position.set(-4.6, h(-4.6, 2.6) + 0.42, 2.6);
  deepLight.castShadow = deepLight.receiveShadow = false;
  object.add(deepLight);

  /* ------------------------------- fireflies ------------------------------ */
  const N_FLY = 16;
  const flies = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 6, 5), glowMatSoft('#ffd98a', 1.7), N_FLY);
  flies.frustumCulled = false;
  flies.castShadow = flies.receiveShadow = false;
  const FLY = [];
  for (let i = 0; i < 10; i++) {
    const [x, z] = rng.inDisc(7.6, 1.2);
    FLY.push([x, h(x, z) + rng.range(0.35, 0.8), z, rng.range(0.3, 0.55)]);
  }
  for (let i = 0; i < 6; i++) {
    const a = rng.range(0, Math.PI * 2), rr = rng.range(0.5, 2.3);
    const x = WX + Math.cos(a) * rr, z = WZ + Math.sin(a) * rr;
    FLY.push([x, h(x, z) + rng.range(0.5, 1.0), z, rng.range(0.3, 0.5)]);
  }
  const flyPh = FLY.map(() => rng.range(0, Math.PI * 2));
  for (let i = 0; i < N_FLY; i++) setInst(flies, i, FLY[i][0], FLY[i][1], FLY[i][2]);
  object.add(flies);

  /* --------------------------- drifting pollen motes ---------------------- */
  const N_POL = 22;
  const pollen = new THREE.InstancedMesh(new THREE.SphereGeometry(0.022, 6, 5), glowMatSoft('#e3e9c0', 1.1), N_POL);
  pollen.frustumCulled = false;
  pollen.castShadow = pollen.receiveShadow = false;
  const POL = [];
  for (let i = 0; i < N_POL; i++) {
    const [x, z] = rng.inDisc(8.4, 1.0);
    POL.push([x, h(x, z) + rng.range(3.5, 5.5), z, rng.range(0, Math.PI * 2)]);
  }
  for (let i = 0; i < N_POL; i++) setInst(pollen, i, POL[i][0], POL[i][1], POL[i][2]);
  object.add(pollen);

  /* -------------------------------- update -------------------------------- */
  function update(t, dt) {
    // fireflies drift among the trees
    for (let i = 0; i < N_FLY; i++) {
      const a = FLY[i], ph = t * 0.45 + flyPh[i];
      setInst(flies, i,
        a[0] + Math.sin(ph) * a[3],
        a[1] + Math.sin(ph * 1.7 + flyPh[i] * 1.3) * 0.25,
        a[2] + Math.cos(ph * 1.3) * a[3]);
    }
    flies.instanceMatrix.needsUpdate = true;
    // pollen motes sink slowly through the wood
    for (let i = 0; i < N_POL; i++) {
      const a = POL[i], k = (t * 0.055 + a[3]) % 1;
      setInst(pollen, i,
        a[0] + Math.sin(k * 6 + a[3] * 7) * 0.7 * (1 - k * 0.5),
        a[1] - k * (a[1] - 0.25),
        a[2] + Math.cos(k * 5 + a[3] * 5) * 0.7 * (1 - k * 0.5),
        1 + k * 0.25);
    }
    pollen.instanceMatrix.needsUpdate = true;
    // the two watchful lights breathe
    const wl = 1 + 0.12 * Math.sin(t * 0.7);
    willowLight.scale.setScalar(wl);
    deepLight.scale.setScalar(1 + 0.09 * Math.sin(t * 0.5 + 2));
  }

  return { object, update };
}

/* a soft unlit glow material for stand-alone animated lights */
function glowMatSoft(color, intensity) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), toneMapped: false });
}
