// Mirkwood — the great dark forest, where the Elvenking's halls lie hidden.
// One strong idea: a dense dark wood that swallows the path, and buried in a
// low hill at the back, the great stone doors of the Elvenking's halls, ajar,
// with torchlight spilling out. A black enchanted river crosses the front with
// a faint silver shimmer; grey webs sag between the trunks, fireflies drift,
// and an elf sentry keeps watch by the door. Palette: black-green forest,
// one warm torch-glow at the hill door, a faint silver river.
import { THREE, Builder, M, C, terrainDisc, fbm, hash2, rock, arch, bridge, column, Lines, solid, glowMat } from '../kit.js';
import { figure, setInst } from './_ab_util.js';

const WATER_Z = 4.6;        // the enchanted river runs along z ≈ 4.6
const WATER_Y = 0.145;      // river surface (box top ≈ 0.195)
const HILL = { x: 0, z: -7.9, a: 1.35, s: 18 };   // the hill the halls are cut into
const DOOR = { x: 0, z: -5.9 };                   // the great stone door plane

const TRUNK = '#33302a';
const DARK_GREENS = ['#263a26', '#2a3d2a', '#223522', '#1f2f22', '#2c3f2c'];

/* lerp two hex colours by t (0..1 from a to b) */
function mixHex(a, b, t) {
  const ca = parseInt(a.slice(1), 16), cb = parseInt(b.slice(1), 16);
  const r = (ca >> 16) + ((cb >> 16) - (ca >> 16)) * t;
  const g = ((ca >> 8) & 255) + (((cb >> 8) & 255) - ((ca >> 8) & 255)) * t;
  const bl = (ca & 255) + ((cb & 255) - (ca & 255)) * t;
  return '#' + (((Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl)) >>> 0).toString(16).padStart(6, '0');
}

/* shared canopy geometries */
const ICO0 = new THREE.IcosahedronGeometry(1, 0);
const ICO1 = new THREE.IcosahedronGeometry(1, 1);

export default function build({ rng, city, accent }) {
  const b = new Builder();
  const object = new THREE.Group();

  /* ------------------------------ the ground ------------------------------ */
  const h = (x, z) => {
    // dark forest floor, gently breathing
    let y = 0.30 + 0.22 * fbm(x * 0.31 + 3.3, z * 0.31 + 8.9, { oct: 3, seed: 29 });
    // the low hill at the back, where the halls are carved
    const dx = x - HILL.x, dz = z - HILL.z;
    y += HILL.a * Math.exp(-(dx * dx + dz * dz) / HILL.s);
    // the black enchanted river cuts across the front
    y -= 0.55 * Math.exp(-(((z - WATER_Z) / 0.62) ** 2));
    return Math.max(0.08, y);
  };

  const TREES = [
    { x: -8.7, z: -7.8, H: 9.0 }, { x: 8.7, z: -7.9, H: 9.0 },
    { x: -5.7, z: -8.9, H: 8.0 }, { x: 5.7, z: -9.0, H: 8.0 },
    { x: -9.0, z: -4.3, H: 7.0 }, { x: 9.0, z: -4.5, H: 7.0 },
    { x: -7.8, z: 1.4, H: 7.0 },  { x: 7.8, z: 1.2, H: 7.0 },
    { x: -8.9, z: 4.8, H: 6.0 },  { x: 9.0, z: 5.0, H: 6.0 },
    { x: -5.9, z: 7.2, H: 6.0 },  { x: 6.0, z: 7.4, H: 6.0 },
    { x: -2.7, z: -2.3, H: 6.5 }, { x: 2.8, z: -2.0, H: 6.5 },
    { x: -4.4, z: 5.0, H: 5.5 },  { x: 4.6, z: 5.2, H: 5.5 },
  ];

  const colorAt = (x, z, y, up) => {
    const j = hash2(Math.round(x * 2.7), Math.round(z * 2.7), 43);
    // deep green-black forest floor with litter of dead leaves
    const floor = Math.round(0x2f452f + (j - 0.5) * 18);
    const l = hash2(Math.round(x * 3.4), Math.round(z * 3.4), 61);
    let c;
    if (l > 0.88 && y < 1.4) c = rng ? ['#4a3a28', '#3f3526', '#5a4a30', '#332c20'][Math.floor(l * 4) % 4] : '#4a3a28';
    else if (up < 0.6 && y > 1.15) c = Math.round(0x232f22 + (j - 0.5) * 12);   // the hill's steep face
    else if (y > 1.75) c = Math.round(0x262c24 + (j - 0.5) * 10);              // rocky crown
    else if (Math.abs(z - WATER_Z) < 0.75 && y < 0.5) c = Math.round(0x1c2a1c + (j - 0.5) * 12); // wet banks
    else c = floor;
    // deep shade beneath the trees
    let md2 = 1e9;
    for (const t of TREES) { const dd = (t.x - x) ** 2 + (t.z - z) ** 2; if (dd < md2) md2 = dd; }
    const md = Math.sqrt(md2);
    if (md < 1.2) c = mixHex('#' + c.toString(16).padStart(6, '0'), '#1d2a1a', 0.62 * (1 - md / 1.2));
    return '#' + c.toString(16).padStart(6, '0');
  };
  terrainDisc(b, { r: 10.5, rings: 52, segs: 88, height: h, colorAt, mat: M.stone, seed: 29 });

  /* ----------------------- the enchanted river --------------------------- */
  b.box(21, 0.05, 0.75, { x: 0, y: WATER_Y, z: WATER_Z, color: '#0a1210', mat: M.water });
  // dark pebbles in the black water
  for (let i = 0; i < 9; i++) {
    b.sphere(rng.range(0.04, 0.09), {
      x: rng.range(-8.5, 8.5), y: WATER_Y - 0.02, z: WATER_Z + rng.range(-0.17, 0.17),
      sx: 1.4, sy: 0.55, color: rng.pick(['#1a1d18', '#23251e', '#14161a']), mat: M.smooth, seg: 7,
    });
  }
  // wet rocks on the banks
  rock(b, { x: -6.3, y: h(-6.3, 4.55) + 0.02, z: 4.55, r: 0.34, h: 0.62, color: '#3a3f33', rand: rng });
  rock(b, { x: 6.5, y: h(6.5, 4.5) + 0.02, z: 4.5, r: 0.3, h: 0.55, color: '#3a3f33', rand: rng });

  /* ---------------------- the path the forest swallows ------------------- */
  const PATH = [
    [0.3, 9.4], [0.7, 7.9], [0.85, 6.3], [0.6, 5.1], [0.2, 3.9], [-0.1, 2.9],
    [-0.3, 1.8], [-0.4, 0.7], [-0.3, -0.5], [0.05, -1.7], [0.35, -3.1], [0.35, -4.4], [0.2, -5.3],
  ];
  for (let i = 0; i < PATH.length - 1; i++) {
    const a = PATH[i], c = PATH[i + 1];
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2;
    // the path narrows and darkens as it is swallowed by the wood
    const fade = Math.min(1, (PATH.length - 2 - i) / 8);
    const w = 0.5 - (1 - fade) * 0.22;
    const col = i < 5 ? '#6b5a3a' : i < 8 ? '#4a3f2e' : '#33302a';
    b.box(len, 0.05, w, {
      x: mx, y: h(mx, mz) + 0.02, z: mz,
      ry: Math.atan2(c[1] - a[1], c[0] - a[0]), color: col, mat: M.stone,
    });
  }
  // an old root reaches across the path, to trip the traveller
  b.rod([-0.95, h(-0.95, 2.0) + 0.05, 2.0], [0.5, h(0.5, 2.0) + 0.06, 2.0], 0.05, { r2: 0.026, color: TRUNK, mat: M.wood, seg: 6 });

  /* --------------------------- the small bridge -------------------------- */
  bridge(b, {
    from: [0.42, h(0.42, 4.95) + 0.05, 4.95],
    to: [0.42, h(0.42, 4.25) + 0.05, 4.25],
    w: 0.6, rise: 0.3, color: '#4a4f42', mat: M.stone, rails: true, segments: 7,
  });

  /* ------------------------------ the wood ------------------------------- */
  // keep canopy blobs on the disc so nothing hangs off the plinth
  const clampC = (cx, cz, s) => {
    const rr = Math.hypot(cx, cz);
    const maxR = 9.3 - s * 0.5;
    if (rr > maxR) { const k = maxR / rr; return [cx * k, cz * k]; }
    return [cx, cz];
  };
  function darkTree(o) {
    const { x, z, H } = o;
    const gy = h(x, z);
    // thick dark trunk
    b.cyl(H * 0.05, H * 0.08, H * 0.42, { x, y: gy, z, rx: rng.range(-0.05, 0.05), rz: rng.range(-0.05, 0.05), color: TRUNK, mat: M.wood, seg: 9 });
    // a few heavy branches
    for (let i = 0; i < 3; i++) {
      const a = rng.range(0, Math.PI * 2);
      b.rod(
        [x + Math.cos(a) * H * 0.05, gy + H * rng.range(0.3, 0.42), z + Math.sin(a) * H * 0.05],
        [x + Math.cos(a) * H * rng.range(0.12, 0.2), gy + H * rng.range(0.34, 0.48), z + Math.sin(a) * H * rng.range(0.12, 0.2)],
        H * 0.02, { r2: H * 0.012, color: TRUNK, mat: M.wood, seg: 5 },
      );
    }
    // the heavy dark canopy: one great mass + overlapping smaller ones
    const s0 = H * 0.17;
    const [m0x, m0z] = clampC(x, z, s0);
    b.geo(ICO1, { x: m0x, y: gy + H * 0.56, z: m0z, sx: s0, sy: s0 * 0.9, sz: s0, color: rng.pick(DARK_GREENS), mat: M.flat, ry: rng.range(0, 6) });
    const nb = rng.int(4, 6);
    for (let i = 0; i < nb; i++) {
      const a = rng.range(0, Math.PI * 2);
      const off = H * rng.range(0.09, 0.17);
      const s = H * rng.range(0.07, 0.13);
      const [ox, oz] = clampC(x + Math.cos(a) * off, z + Math.sin(a) * off, s);
      b.geo(ICO0, {
        x: ox, y: gy + H * rng.range(0.42, 0.66), z: oz,
        sx: s, sy: s * rng.range(0.8, 1.05), sz: s,
        color: rng.pick(DARK_GREENS), mat: M.flat, ry: rng.range(0, 6),
      });
    }
    // an occasional bare snag branch, and a tuft of moss on the bark
    if (rng.chance(0.5)) {
      const a = rng.range(0, Math.PI * 2);
      b.rod([x + Math.cos(a) * H * 0.06, gy + H * 0.4, z + Math.sin(a) * H * 0.06],
        [x + Math.cos(a) * H * 0.17, gy + H * 0.52, z + Math.sin(a) * H * 0.17], H * 0.014, { r2: H * 0.008, color: '#2c2a24', mat: M.wood, seg: 4 });
    }
    if (rng.chance(0.65)) {
      const a = rng.range(0, Math.PI * 2);
      b.geo(ICO0, {
        x: x + Math.cos(a) * H * 0.07, y: gy + H * rng.range(0.08, 0.16), z: z + Math.sin(a) * H * 0.07,
        sx: 0.2, sy: 0.13, sz: 0.2, color: rng.chance(0.5) ? accent : C.moss, mat: M.flat, ry: rng.range(0, 6),
      });
    }
  }
  for (const t of TREES) darkTree(t);

  /* --------------------- webs sagging between the trunks ----------------- */
  const webLines = new Lines();
  const webSpiders = []; // [x, y, z, ry]
  const webPair = (a, b, hgt, sag, spider = false) => {
    const ux = b.x - a.x, uz = b.z - a.z;
    const d = Math.hypot(ux, uz) || 1;
    const A = [a.x + (ux / d) * 0.32, h(a.x, a.z) + hgt, a.z + (uz / d) * 0.32];
    const B = [b.x - (ux / d) * 0.32, h(b.x, b.z) + hgt, b.z - (uz / d) * 0.32];
    webLines.rope(A, B, sag, '#8a8a8a', 8, 0.9);
    if (spider) webSpiders.push([(A[0] + B[0]) / 2, (A[1] + B[1]) / 2 - sag, (A[2] + B[2]) / 2, rng.range(0, 6)]);
  };
  webPair(TREES[2], TREES[0], 1.9, 0.3);
  webPair(TREES[0], TREES[4], 2.0, 0.45);
  webPair(TREES[4], TREES[6], 2.1, 0.5);
  webPair(TREES[12], TREES[13], 2.2, 0.5, true);   // a web across the path
  webPair(TREES[13], TREES[7], 2.0, 0.45);
  webPair(TREES[7], TREES[9], 1.9, 0.3);
  webPair(TREES[1], TREES[3], 1.9, 0.3);
  webPair(TREES[6], TREES[8], 1.8, 0.3, true);
  // a thin thread dangling from a high branch, with a spider at its end
  {
    const tx = TREES[12].x, tz = TREES[12].z, ty = h(tx, tz);
    webLines.path([[tx + 0.42, ty + 3.6, tz + 0.32], [tx + 0.46, ty + 1.7, tz + 0.36], [tx + 0.45, ty + 0.95, tz + 0.35]], '#8a8a8a', 0.9);
    webSpiders.push([tx + 0.45, ty + 0.88, tz + 0.35, rng.range(0, 6)]);
  }
  const webGroup = new THREE.Group();
  webGroup.add(webLines.build());
  const spiderMat = solid('#141414', { flatShading: true });
  const spiderInst = new THREE.InstancedMesh(ICO0, spiderMat, webSpiders.length);
  spiderInst.frustumCulled = false;
  spiderInst.castShadow = spiderInst.receiveShadow = false;
  for (let i = 0; i < webSpiders.length; i++) {
    const s = webSpiders[i];
    setInst(spiderInst, i, s[0], s[1], s[2], 0.085, s[3], 0, 0, 0.05);
  }
  webGroup.add(spiderInst);
  object.add(webGroup);

  /* ------------------- the hill and the Elvenking's door ----------------- */
  const doorBase = h(DOOR.x, DOOR.z) + 0.02;
  // the great stone arch, set into the hill's front slope
  arch(b, { x: DOOR.x, y: doorBase, z: DOOR.z, w: 2.6, h: 3.2, t: 0.3, depth: 0.5, color: '#31332a', mat: M.stone });
  // two huge stone doors, slightly ajar, iron-bound
  for (const s of [-1, 1]) {
    b.box(1.06, 2.95, 0.13, { x: s * 0.72, y: doorBase + 0.01, z: DOOR.z + 0.02, ry: s * 0.06, color: '#3a3d33', mat: M.smooth });
    b.box(0.05, 2.9, 0.16, { x: s * 1.03, y: doorBase + 0.02, z: DOOR.z + 0.02, ry: s * 0.06, color: '#1f1c16', mat: M.rough_metal });
  }
  // torchlight spilling from inside (moderate, so the bloom stays soft)
  b.quad(0.55, 3.1, { x: 0, y: doorBase + 1.55, z: DOOR.z + 0.16, mat: M.glow, color: C.lamp, glow: 1.6 });
  // carved pillars flanking the door, and a small banner in the realm colour
  for (const s of [-1, 1]) {
    column(b, { x: s * 2.05, y: h(s * 2.05, -5.8) + 0.02, z: -5.8, r: 0.17, h: 4.0, color: '#45493c', mat: M.smooth });
  }
  b.quad(0.16, 0.32, { x: -2.05, y: h(-2.05, -5.8) + 0.02 + 3.6, z: -5.68, color: accent, mat: M.cloth });
  // moss creeping over the lintel
  for (const [mx, my, mz, ms] of [
    [0, doorBase + 4.15, DOOR.z, 0.42], [0.85, doorBase + 4.15, DOOR.z, 0.36], [-0.85, doorBase + 4.15, DOOR.z, 0.36],
    [1.28, doorBase + 3.75, DOOR.z, 0.3], [-1.28, doorBase + 3.75, DOOR.z, 0.3], [0.45, doorBase + 4.35, DOOR.z, 0.24],
  ]) {
    b.geo(ICO0, { x: mx, y: my, z: mz, sx: ms, sy: ms * 0.7, sz: ms, color: rng.chance(0.5) ? accent : C.moss, mat: M.flat, ry: rng.range(0, 6) });
  }
  // rocky crown of the hill above the door, so the halls read as carved in rock
  for (const [rx, rz, rr, rh] of [
    [0, -8.9, 1.15, 2.1], [-2.6, -8.6, 0.9, 1.7], [2.6, -8.7, 0.85, 1.6],
    [-1.3, -9.4, 0.7, 1.4], [1.2, -9.5, 0.65, 1.3],
  ]) {
    rock(b, { x: rx, y: h(rx, rz) + 0.1, z: rz, r: rr, h: rh, color: rng.pick(['#2a3026', '#23291f', '#262c22']), rand: rng });
  }
  // a couple of stray rocks at the door's feet
  rock(b, { x: -1.35, y: h(-1.35, -5.6) + 0.02, z: -5.6, r: 0.3, h: 0.55, color: '#3a3f33', rand: rng });
  rock(b, { x: 1.4, y: h(1.4, -5.7) + 0.02, z: -5.7, r: 0.26, h: 0.48, color: '#3a3f33', rand: rng });

  /* ----------------------- torch posts along the path -------------------- */
  const TORCHES = [[1.05, 5.55], [-0.35, 3.5], [-0.6, 2.2], [-0.7, 0.7], [-0.15, -1.5], [0.5, -3.0]];
  const flameMeta = [];
  for (const [tx, tz] of TORCHES) {
    const ty = h(tx, tz);
    b.cyl(0.03, 0.045, 0.9, { x: tx, y: ty, z: tz, color: '#2c2922', mat: M.wood, seg: 6 });
    b.box(0.13, 0.07, 0.13, { x: tx, y: ty + 0.93, z: tz, color: '#1f1c16', mat: M.rough_metal });
    flameMeta.push([tx, ty + 1.06, tz, rng.range(0, 6.3)]);
  }

  /* ----------------------- stag, fallen log, detail ---------------------- */
  // a stag at the path's edge — stylised: body, legs, antlers as thin rods
  {
    const sx = 2.9, sz = 2.6, sy = h(sx, sz);
    const bodyC = '#5a4f3c', antlerC = '#c9c3b4';
    for (const s of [-1, 1]) { // four legs
      b.rod([sx + s * 0.09, sy + 0.26, sz + 0.14], [sx + s * 0.12, sy + 0.02, sz + 0.16], 0.014, { r2: 0.01, color: bodyC, mat: M.smooth, seg: 4 });
      b.rod([sx + s * 0.09, sy + 0.26, sz - 0.14], [sx + s * 0.12, sy + 0.02, sz - 0.16], 0.014, { r2: 0.01, color: bodyC, mat: M.smooth, seg: 4 });
    }
    b.sphere(0.15, { x: sx, y: sy + 0.32, z: sz, sx: 1.5, sy: 0.82, sz: 0.72, color: bodyC, mat: M.smooth, seg: 10 });
    b.rod([sx + 0.06, sy + 0.4, sz + 0.1], [sx + 0.02, sy + 0.55, sz + 0.22], 0.028, { r2: 0.02, color: bodyC, mat: M.smooth, seg: 5 });
    b.sphere(0.05, { x: sx, y: sy + 0.57, z: sz + 0.24, sx: 1.15, sy: 0.8, color: bodyC, mat: M.smooth, seg: 7 });
    b.rod([sx + 0.02, sy + 0.58, sz + 0.22], [sx - 0.08, sy + 0.72, sz + 0.12], 0.008, { color: antlerC, mat: M.smooth, seg: 4 });
    b.rod([sx - 0.03, sy + 0.66, sz + 0.18], [sx + 0.03, sy + 0.68, sz + 0.26], 0.006, { color: antlerC, mat: M.smooth, seg: 4 });
  }
  // a fallen log, moss reclaiming it, a few pale mushrooms
  {
    b.rod([-2.6, h(-2.6, 3.3) + 0.08, 3.3], [-0.9, h(-0.9, 2.5) + 0.1, 2.5], 0.11, { r2: 0.055, color: '#3a2f24', mat: M.wood, seg: 8 });
    b.geo(ICO0, { x: -1.95, y: h(-1.95, 3.0) + 0.24, z: 3.0, sx: 0.2, sy: 0.13, sz: 0.2, color: rng.chance(0.5) ? accent : C.moss, mat: M.flat, ry: rng.range(0, 6) });
    b.geo(ICO0, { x: -1.5, y: h(-1.5, 2.78) + 0.26, z: 2.78, sx: 0.16, sy: 0.11, sz: 0.16, color: C.moss, mat: M.flat, ry: rng.range(0, 6) });
    for (const [mx, mz] of [[-1.15, 2.62], [-1.05, 2.72], [-1.45, 3.12]]) {
      b.cone(0.045, 0.055, { x: mx, y: h(mx, mz) + 0.02, z: mz, color: '#b8a87a', mat: M.smooth, seg: 5 });
    }
  }
  // scattered rocks and their moss
  for (const [rx, rz, rr, rh] of [[-4.8, -4.2, 0.4, 0.8], [5.0, -4.7, 0.35, 0.7], [-3.4, 4.4, 0.3, 0.6]]) {
    rock(b, { x: rx, y: h(rx, rz) + 0.02, z: rz, r: rr, h: rh, color: rng.pick(['#33352c', '#3a3d33', '#2e3128']), rand: rng });
    b.geo(ICO0, { x: rx, y: h(rx, rz) + rh * 0.55, z: rz, sx: rr * 0.6, sy: rr * 0.4, sz: rr * 0.6, color: rng.chance(0.5) ? accent : C.moss, mat: M.flat, ry: rng.range(0, 6) });
  }

  /* --------------------------- the elf sentry ---------------------------- */
  {
    const sx = 1.55, sz = -5.3, sy = h(sx, sz) + 0.02;
    figure(b, { x: sx, y: sy, z: sz, h: 0.34, color: '#2f4a2f', skin: '#c9b39a', ry: -0.25 });
    // his bow — a thin arc of dark wood
    b.tube(
      [[sx + 0.13, sy + 0.08, sz + 0.04], [sx + 0.22, sy + 0.28, sz + 0.04], [sx + 0.13, sy + 0.5, sz + 0.04]],
      0.011, { mat: M.wood, color: '#6b4a2c', tseg: 6, rseg: 4 },
    );
    // a quiver on his back
    b.cyl(0.02, 0.024, 0.22, { x: sx - 0.09, y: sy + 0.18, z: sz + 0.03, rx: 0.35, color: '#3a2f24', mat: M.wood, seg: 5 });
  }

  /* ------------------------------ static build --------------------------- */
  object.add(b.build());

  /* ----------------- the silver shimmer of the enchanted river ----------- */
  const shimmerLine = new Lines();
  shimmerLine.seg([-9.8, 0.215, WATER_Z], [9.8, 0.215, WATER_Z], '#cfe0e8', 1.05);
  object.add(shimmerLine.build());
  const N_SHIM = 5;
  const shimGeo = new THREE.PlaneGeometry(0.65, 0.035);
  shimGeo.rotateX(-Math.PI / 2);
  const shimMat = glowMat('#d5e0e8', 1.3, { transparent: true, opacity: 0.5, depthWrite: false });
  const shim = new THREE.InstancedMesh(shimGeo, shimMat, N_SHIM);
  shim.frustumCulled = false;
  shim.castShadow = shim.receiveShadow = false;
  const shimMeta = [];
  for (let i = 0; i < N_SHIM; i++) {
    shimMeta.push({ x0: rng.range(-9.5, 9.5), z: WATER_Z + rng.range(-0.09, 0.09), sp: rng.range(0.4, 0.95), ph: rng.range(0, 6.3) });
    setInst(shim, i, shimMeta[i].x0, 0.215, shimMeta[i].z, 1);
  }
  object.add(shim);

  /* ----------------------- fireflies in the dark wood -------------------- */
  const N_FLY = 12;
  const flyMat = glowMat('#e3ef9a', 1.4, { transparent: true, opacity: 0.9, depthWrite: false });
  const flies = new THREE.InstancedMesh(new THREE.SphereGeometry(0.024, 6, 5), flyMat, N_FLY);
  flies.frustumCulled = false;
  flies.castShadow = flies.receiveShadow = false;
  const flyMeta = [];
  let tries = 0;
  while (flyMeta.length < N_FLY && tries++ < 400) {
    const [fx, fz] = rng.inDisc(8.0, 2.0);
    if (Math.abs(fz - WATER_Z) < 1.1) continue;              // not over the river
    if (Math.hypot(fx, fz + 4.8) < 2.0) continue;            // not in the door glow
    flyMeta.push([fx, h(fx, fz) + rng.range(0.5, 2.6), fz, rng.range(0, 6.3)]);
  }
  for (let i = 0; i < flyMeta.length; i++) setInst(flies, i, flyMeta[i][0], flyMeta[i][1], flyMeta[i][2], 1);
  object.add(flies);

  /* ------------------ torch flames (flicker together, warm) -------------- */
  const N_TORCH = flameMeta.length;
  const flameBase = new THREE.Color('#ffc477').multiplyScalar(1.9);
  const flameMat = glowMat('#ffc477', 1.9, { transparent: true, opacity: 0.95, depthWrite: false });
  const flames = new THREE.InstancedMesh(new THREE.SphereGeometry(0.085, 8, 6), flameMat, N_TORCH);
  flames.frustumCulled = false;
  flames.castShadow = flames.receiveShadow = false;
  for (let i = 0; i < N_TORCH; i++) setInst(flames, i, flameMeta[i][0], flameMeta[i][1], flameMeta[i][2], 1);
  object.add(flames);

  /* ------------ the warm glow deep in the doorway + the light pool ------- */
  const doorBase2 = doorBase;
  const innerBase = new THREE.Color('#ffcf8a').multiplyScalar(1.5);
  const innerMat = glowMat('#ffcf8a', 1.5, { transparent: true, opacity: 0.9, depthWrite: false });
  const innerGlow = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), innerMat);
  innerGlow.position.set(0, doorBase2 + 1.9, DOOR.z - 0.25);
  innerGlow.castShadow = innerGlow.receiveShadow = false;
  object.add(innerGlow);
  const poolMat = glowMat('#ffc477', 0.85, { transparent: true, opacity: 0.2, depthWrite: false });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1.5, 26), poolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0, h(0, -5.2) + 0.02, -5.2);
  pool.castShadow = pool.receiveShadow = false;
  object.add(pool);

  /* ------------------------------- update -------------------------------- */
  function update(t, dt) {
    // the webs sway very subtly
    webGroup.rotation.z = Math.sin(t * 0.2) * 0.008;
    webGroup.rotation.x = Math.sin(t * 0.16 + 1.2) * 0.005;
    webGroup.position.y = Math.sin(t * 0.11 + 0.6) * 0.01;
    // torch flames flicker
    const fk = 1 + 0.22 * Math.sin(t * 6.1) * Math.sin(t * 3.3 + 0.7);
    flameMat.color.setRGB(flameBase.r * fk, flameBase.g * fk, flameBase.b * fk);
    for (let i = 0; i < N_TORCH; i++) {
      const m = flameMeta[i];
      const s = 0.75 + 0.4 * (0.5 + 0.5 * Math.sin(t * 7.2 + m[3] * 3.1)) * (0.55 + 0.45 * Math.sin(t * 4.6 + m[3] * 5.3));
      setInst(flames, i, m[0], m[1], m[2], s);
    }
    flames.instanceMatrix.needsUpdate = true;
    // the light deep in the halls breathes
    const dk = 0.85 + 0.15 * Math.sin(t * 5.8) * Math.sin(t * 2.9 + 1.1);
    innerGlow.scale.setScalar(dk);
    innerMat.color.setRGB(innerBase.r * (0.92 + 0.08 * Math.sin(t * 4.1)), innerBase.g * (0.92 + 0.08 * Math.sin(t * 4.1)), innerBase.b * (0.92 + 0.08 * Math.sin(t * 4.1)));
    // the pool of torchlight breathes on the slope
    poolMat.opacity = 0.14 + 0.08 * Math.sin(t * 1.1 + 0.5);
    // fireflies drift through the wood
    for (let i = 0; i < flyMeta.length; i++) {
      const f = flyMeta[i];
      setInst(flies, i,
        f[0] + Math.sin(t * 0.5 + f[3]) * 0.7,
        f[1] + Math.sin(t * 0.9 + f[3] * 2) * 0.45,
        f[2] + Math.cos(t * 0.45 + f[3]) * 0.7,
        1 + 0.3 * Math.sin(t * 1.7 + f[3] * 3));
    }
    flies.instanceMatrix.needsUpdate = true;
    // the river's silver shimmer slides slowly along the water
    shimMat.opacity = 0.38 + 0.14 * Math.sin(t * 0.7);
    for (let i = 0; i < N_SHIM; i++) {
      const s = shimMeta[i];
      const xx = (((s.x0 + t * s.sp) % 19.2) + 19.2) % 19.2 - 9.6;
      setInst(shim, i, xx, 0.215 + Math.sin(t * 1.2 + s.ph) * 0.008, s.z, 1);
    }
    shim.instanceMatrix.needsUpdate = true;
  }

  return { object, update };
}
