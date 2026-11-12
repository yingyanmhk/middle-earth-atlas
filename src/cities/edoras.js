// Edoras — capital of Rohan. One strong idea: a wind-blown town on a hill,
// crowned by Meduseld, the Golden Hall — a long timber hall with a roof of
// gold. Straw-gold grass, low thatched houses climbing a winding street,
// carved horse-head fence posts, horses on the plain, and gold banners
// flapping in the wind off the grass sea.
import { THREE, Builder, M, C, terrainDisc, fbm, hash2, Lines, stairs, column, solid } from '../kit.js';
import { figure } from './_ab_util.js';

const HILL = [0.5, 0.8];   // crown of the town hill (and Meduseld's centre)
const CROWN_R = 4.6;       // flat crown radius
const HILL_H = 2.55;       // crown height above the grass

const GRASS_N = [0xc9b26a, 0xb8a06a, 0xd4bd7e, 0xa8925a, 0xbfa468];
const WALLS = ['#e8dcc0', '#d8c9a8', '#cbbf9e', '#e0d2b4'];
const THATCH = ['#c9a24a', '#d9b64e', '#b58f3e', '#a8893e'];

/* ------------------------------- terrain -------------------------------- */

const h = (x, z) => {
  let y = 0.34 * fbm(x * 0.26 + 2.9, z * 0.26 + 6.1, { oct: 4, seed: 53 });
  const r = Math.hypot(x - HILL[0], z - HILL[1]);
  y += HILL_H * Math.exp(-(Math.max(0, r - CROWN_R) ** 2) / 8);
  return Math.max(0.1, y);
};

const colorAt = (x, z, y, up) => {
  const j = hash2(Math.round(x * 3.1), Math.round(z * 3.1), 61);
  let c = GRASS_N[Math.floor(j * 5) % 5];
  const k = Math.min(1, y / 2.8);
  c = Math.round(c + (0x9a864f - c) * k * 0.5 + (hash2(Math.round(x * 2.2), Math.round(z * 2.2), 67) - 0.5) * 12);
  return '#' + c.toString(16).padStart(6, '0');
};

/** lowest terrain over a footprint (so buildings sit flush on slopes) */
const groundY = (x, z, w, d) => {
  let m = Infinity;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const v = h(x + sx * w / 2, z + sz * d / 2);
    if (v < m) m = v;
  }
  return m;
};

/* ---------------------------- shared geometry --------------------------- */

// gable prism, ridge along Z (kit-style)
const GABLE = (() => {
  const s = new THREE.Shape([new THREE.Vector2(-0.5, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0, 1)]);
  const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
  g.translate(0, 0, -0.5);
  return g;
})();
// gable prism, ridge along X (for houses and the porch tier)
const GABLEX = (() => {
  const g = GABLE.clone();
  g.rotateY(Math.PI / 2);
  return g;
})();

/** a small triangular pennant, origin at its top (hangs from a pole) */
function pennantGeo(w, hgt) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 0, -hgt, 0, w, -hgt * 0.55, 0]), 3));
  g.setIndex([0, 1, 2]);
  g.computeVertexNormals();
  return g;
}

/* ---------------------------- street + houses --------------------------- */

const STREET = [
  [5.2, 9.0], [4.6, 8.4], [3.9, 7.7], [3.2, 7.1], [2.7, 6.5], [2.4, 5.9],
  [2.6, 5.3], [2.2, 4.8], [1.5, 4.6], [0.8, 4.7], [0.5, 4.8],
];

const HOUSES = [
  { x: 5.9, z: 6.7, w: 1.9, d: 1.3, hgt: 1.5, near: 'street' },
  { x: 4.8, z: 5.5, w: 1.6, d: 1.3, hgt: 1.4, near: 'street' },
  { x: 3.9, z: 4.5, w: 1.7, d: 1.4, hgt: 1.6, near: 'street' },
  { x: 3.5, z: 3.1, w: 1.5, d: 1.2, hgt: 1.3, near: 'hall' },
  { x: 1.0, z: 7.3, w: 1.6, d: 1.3, hgt: 1.4, near: 'street' },
  { x: 0.4, z: 6.0, w: 1.4, d: 1.2, hgt: 1.3, near: 'street' },
  { x: -1.2, z: 4.9, w: 1.5, d: 1.3, hgt: 1.4, near: 'street' },
  { x: -2.9, z: -1.6, w: 1.6, d: 1.3, hgt: 1.4, near: 'hall' },
  { x: -4.0, z: -2.7, w: 1.4, d: 1.2, hgt: 1.3, near: 'hall' },
  { x: -5.4, z: 1.3, w: 1.7, d: 1.4, hgt: 1.5, near: 'hall' },
  { x: -6.4, z: -0.7, w: 1.5, d: 1.3, hgt: 1.4, near: 'hall' },
];

function thatchHouse(b, rng, { x, z, w, d, hgt, ry }) {
  const y = groundY(x, z, w + 0.3, d + 0.36);
  b.push({ x, y, z, ry });
  b.box(w, hgt, d, { color: rng.pick(WALLS), mat: M.stone });
  b.box(w + 0.03, 0.14, d + 0.03, { y: 0.01, color: '#5a4a38', mat: M.stone });
  // the door
  const dw = Math.min(0.42, w * 0.4), dh = Math.min(1.0, hgt * 0.7);
  b.box(dw, dh, 0.05, { x: 0, y: 0.12, z: d / 2 + 0.012, color: '#4a2f1d', mat: M.wood });
  // thick thatch gable, slightly overhanging, ridge along X
  const rh = Math.min(w, d) * 0.52;
  b.geo(GABLEX, { y: hgt, sx: w + 0.3, sy: rh, sz: d + 0.36, mat: M.cloth, color: rng.pick(THATCH) });
  b.box(w + 0.34, 0.12, 0.18, { y: hgt + rh + 0.02, color: rng.pick(['#d9b64e', '#c9a24a']), mat: M.cloth });
  // windows: a pair on the front, one on each side
  for (const s of [-1, 1]) {
    const lit = rng.chance(0.65);
    b.quad(0.26, 0.36, { x: s * (w / 2 - 0.38), y: 0.6, z: d / 2 + 0.014, mat: lit ? M.glow : M.smooth, color: lit ? C.lamp : C.charcoal, glow: 1.55 });
  }
  for (const s of [-1, 1]) {
    const lit = rng.chance(0.4);
    b.quad(0.22, 0.3, { x: s * (w / 2 + 0.014), y: 0.55, z: 0.15, ry: s * Math.PI / 2, mat: lit ? M.glow : M.smooth, color: lit ? C.lamp : C.charcoal, glow: 1.5 });
  }
  b.pop();
}

/** a fence post with a carved horse-head top (abstract curved arc) */
function horsePost(b, x, z, hgt = 0.55, arcR = 0.055) {
  const y = h(x, z);
  b.cyl(0.035, 0.05, hgt, { x, y, z, color: C.darkwood, mat: M.wood, seg: 6 });
  b.geo(new THREE.TorusGeometry(arcR, 0.02, 4, 8, 1.35), {
    x, y: y + hgt + 0.005, z, rx: Math.PI / 2 - 0.45, color: C.darkwood, mat: M.wood,
  });
}

/** a small stylised horse, facing +x */
function horse(b, { x, z, ry, color }) {
  const y = groundY(x, z, 0.56, 0.2);
  b.push({ x, y, z, ry });
  for (const [lx, lz] of [[-0.18, -0.055], [0.18, -0.055], [-0.18, 0.055], [0.18, 0.055]]) {
    b.box(0.045, 0.24, 0.045, { x: lx, y: 0.06, z: lz, color: '#3a2c22', mat: M.smooth });
  }
  b.box(0.54, 0.22, 0.15, { y: 0.28, color, mat: M.smooth });
  b.box(0.13, 0.22, 0.1, { x: 0.29, y: 0.44, color, mat: M.smooth });
  b.box(0.2, 0.09, 0.07, { x: 0.42, y: 0.56, color, mat: M.smooth });
  b.box(0.03, 0.13, 0.03, { x: -0.3, y: 0.38, rx: 0.5, color: '#2e2a26', mat: M.smooth });
  b.pop();
}

function hay(b, x, z, s = 1) {
  const y = groundY(x, z, 0.7, 0.7);
  b.cone(0.55 * s, 0.8 * s, { x, y, z, color: '#c9a24a', mat: M.flat, seg: 10 });
  b.cone(0.28 * s, 0.3 * s, { x: x + 0.06 * s, y: y + 0.62 * s, z: z - 0.04 * s, color: '#d9b64e', mat: M.flat, seg: 8 });
}

function lantern(b, x, z, hgt = 0.9) {
  const y = h(x, z);
  b.cyl(0.04, 0.05, hgt, { x, y, z, color: C.darkwood, mat: M.wood, seg: 6 });
  b.sphere(0.1, { x, y: y + hgt + 0.02, z, mat: M.glow, color: C.lamp, glow: 2.0, seg: 8 });
}

/** thin pale lines of wind-blown grass streaking across the plain */
function grassStreaks(rng, n, tints) {
  const L = new Lines();
  let made = 0, tries = 0;
  while (made < n && tries < 400) {
    tries++;
    const a = rng.range(0, Math.PI * 2);
    const rr = rng.range(5.7, 9.4);
    const x = HILL[0] + Math.cos(a) * rr, z = HILL[1] + Math.sin(a) * rr;
    if (h(x, z) > 1.7) continue;
    let near = false;
    for (const hh of HOUSES) if (Math.hypot(x - hh.x, z - hh.z) < 1.7) { near = true; break; }
    for (const [sx, sz] of STREET) if (Math.hypot(x - sx, z - sz) < 1.2) { near = true; break; }
    if (near) continue;
    const y = h(x, z) + 0.15;
    const len = rng.range(0.7, 1.5);
    const dir = rng.range(-0.3, 0.3); // mostly +x: the west wind
    L.seg([x, y, z], [x + Math.cos(dir) * len, y + rng.range(-0.04, 0.03), z + Math.sin(dir) * len], rng.pick(tints), 1);
    made++;
  }
  return L;
}

/* ------------------------------------------------------------------------ */

export default function build({ rng, city, accent }) {
  const b = new Builder();
  const object = new THREE.Group();

  /* ------------------------------- terrain ------------------------------ */
  terrainDisc(b, { r: 10.5, rings: 60, segs: 96, height: h, colorAt, mat: M.stone, seed: 53 });

  /* ------------------------- the winding street ------------------------- */
  for (let i = 0; i < STREET.length - 1; i++) {
    const a = STREET[i], c = STREET[i + 1];
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2;
    b.box(len, 0.08, 0.95, {
      x: mx, y: h(mx, mz) + 0.035, z: mz,
      ry: -Math.atan2(c[1] - a[1], c[0] - a[0]),
      rz: Math.atan2(h(c[0], c[1]) - h(a[0], a[1]), len),
      color: '#b7a06e', mat: M.stone,
    });
  }

  /* ------------------------------- houses ------------------------------- */
  for (const p of HOUSES) {
    const ry = p.near === 'street'
      ? (() => {
        let bi = 0, bd = 1e9;
        for (let i = 0; i < STREET.length; i++) {
          const d = (STREET[i][0] - p.x) ** 2 + (STREET[i][1] - p.z) ** 2;
          if (d < bd) { bd = d; bi = i; }
        }
        return Math.atan2(STREET[bi][0] - p.x, STREET[bi][1] - p.z) + rng.range(-0.18, 0.18);
      })()
      : Math.atan2(HILL[0] - p.x, HILL[1] - p.z) + rng.range(-0.25, 0.25);
    thatchHouse(b, rng, { x: p.x, z: p.z, w: p.w, d: p.d, hgt: p.hgt, ry });
  }

  /* ------------------------------ Meduseld ------------------------------ */
  // a raised stone terrace under the hall, sunk into the crown
  let podY = Infinity;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    podY = Math.min(podY, h(HILL[0] + sx * 3.0, HILL[1] + sz * 4.8));
  }
  const POD = podY - 0.02;
  const POD_T = POD + 0.62; // podium top
  const BASE = POD_T + 0.45; // wall base
  const WALL_T = BASE + 3.0; // wall top
  const RH = 1.5;

  b.push({ x: HILL[0], y: 0, z: HILL[1] });
  b.box(6.0, POD_T - POD, 9.6, { y: POD, color: '#a49c8c', mat: M.stone });
  b.box(4.9, 0.45, 8.6, { y: POD_T, color: '#8f8372', mat: M.stone });
  // the long timber hall
  b.box(4.4, 3.0, 8.0, { y: BASE, color: C.darkwood, mat: M.wood });
  // corner posts
  for (const [px, pz] of [[-2.2, -4.0], [2.2, -4.0], [-2.2, 4.0], [2.2, 4.0]]) {
    b.box(0.2, 3.05, 0.2, { x: px, y: BASE, z: pz, color: '#5a3a24', mat: M.wood });
  }
  // long-side posts and beams (timber frame)
  for (const sx of [-1, 1]) {
    for (const pz of [-2.6, -1.0, 1.2, 2.8]) {
      b.box(0.14, 3.05, 0.14, { x: sx * 2.21, y: BASE, z: pz, color: '#5a3a24', mat: M.wood });
    }
    for (const by of [5.3, 6.1]) b.box(0.1, 0.14, 8.02, { x: sx * 2.22, y: by, color: '#5a3a24', mat: M.wood });
  }
  // facade posts + beams
  for (const px of [-2.0, -1.1, 1.1, 2.0]) b.box(0.16, 3.05, 0.16, { x: px, y: BASE, z: 4.01, color: '#5a3a24', mat: M.wood });
  for (const by of [4.7, 5.9]) b.box(4.42, 0.14, 0.1, { x: 0, y: by, z: 4.05, color: '#5a3a24', mat: M.wood });
  // the great door — gold-trimmed, warm light spilling out
  b.box(0.72, 0.09, 0.06, { x: 0, y: 5.06, z: 4.03, color: '#e2b354', mat: M.smooth });
  for (const s of [-1, 1]) b.box(0.07, 1.62, 0.06, { x: s * 0.37, y: 3.55, z: 4.03, color: '#e2b354', mat: M.smooth });
  b.quad(0.62, 1.42, { x: 0, y: 3.62, z: 4.045, mat: M.glow, color: C.lamp, glow: 1.7 });
  for (const s of [-1, 1]) b.box(0.28, 1.5, 0.05, { x: s * 0.16, y: 3.55, z: 4.06, color: '#3a2a1e', mat: M.wood });
  // painted gold banners flat on the facade
  for (const s of [-1, 1]) b.quad(0.36, 0.85, { x: s * 1.5, y: 4.35, z: 4.09, color: '#d9b64e', mat: M.smooth });
  // windows along the long sides + the back gable
  for (const sx of [-1, 1]) {
    for (const pz of [-1.6, 0, 1.6]) {
      b.quad(0.32, 0.44, { x: sx * 2.21, y: 4.75, z: pz, ry: sx * Math.PI / 2, mat: M.glow, color: C.lamp, glow: 1.5 });
    }
  }
  b.quad(0.3, 0.42, { x: 0, y: 4.75, z: -4.01, ry: Math.PI, mat: M.glow, color: C.lamp, glow: 1.4 });
  // the roof of gold
  b.geo(GABLE, { y: WALL_T, sx: 4.7, sy: RH, sz: 8.5, mat: M.flat, color: '#d9b64e' });
  for (let z = -3.9; z <= 3.9; z += 0.52) {
    b.box(0.26, 0.1, 0.44, { x: 0, y: WALL_T + RH + 0.015, z, color: z < 0 ? '#e2b354' : '#d9b64e', mat: M.flat });
  }
  // gold finials and a carved horse-head at the front gable apex
  for (const s of [-1, 1]) b.sphere(0.08, { x: 0, y: WALL_T + RH, z: s * 4.26, color: '#e2b354', mat: M.smooth, seg: 8 });
  b.geo(new THREE.TorusGeometry(0.1, 0.028, 5, 10, 1.7), {
    x: 0, y: WALL_T + RH + 0.03, z: 4.28, rx: Math.PI / 2 - 0.5, color: '#e2b354', mat: M.smooth,
  });
  // the chimney (smoke emitter) on the back roof
  b.box(0.24, 0.95, 0.24, { x: 1.5, y: 6.55, z: -3.6, color: '#6b665f', mat: M.stone });
  // porch: deck, carved pillars, beam, lower roof tier
  b.box(5.2, 0.12, 1.4, { x: 0, y: POD_T - 0.02, z: 5.5, color: '#8a5d3d', mat: M.wood });
  for (const px of [-2.4, -1.2, 0, 1.2, 2.4]) {
    column(b, { x: px, y: POD_T + 0.1, z: 5.5, r: 0.15, h: 2.4, color: '#5a3a24', mat: M.wood });
  }
  b.box(6.2, 0.12, 0.18, { x: 0, y: 5.52, z: 5.5, color: '#4d3426', mat: M.wood });
  b.geo(GABLEX, { y: 5.62, sx: 6.6, sy: 0.55, sz: 1.9, mat: M.flat, color: '#c9a24a' });
  // tall carved roof pillars flanking the door, with horse-head caps
  for (const s of [-1, 1]) {
    b.cyl(0.13, 0.15, 2.55, { x: s * 0.85, y: POD_T + 0.1, z: 4.9, color: '#4d3426', mat: M.wood, seg: 10 });
    b.geo(new THREE.TorusGeometry(0.07, 0.022, 4, 8, 1.5), {
      x: s * 0.85, y: POD_T + 0.1 + 2.55 + 0.03, z: 4.92, rx: Math.PI / 2 - 0.5, color: '#5a3a24', mat: M.wood,
    });
  }
  // hanging porch lantern
  b.rod([0.5, 5.52, 6.3], [0.5, 5.05, 6.3], 0.02, { color: C.darkwood, mat: M.wood });
  b.sphere(0.09, { x: 0.5, y: 5.0, z: 6.3, mat: M.glow, color: C.lamp, glow: 2.1, seg: 8 });
  b.pop();
  // pennant poles on the ridge (world coords)
  b.rod([HILL[0], WALL_T + RH, HILL[1]], [HILL[0], WALL_T + RH + 0.9, HILL[1]], 0.022, { color: C.darkwood, mat: M.wood });
  b.rod([HILL[0], WALL_T + RH, HILL[1] + 4.25], [HILL[0], WALL_T + RH + 0.75, HILL[1] + 4.25], 0.02, { color: C.darkwood, mat: M.wood });

  /* ------------------------- the stairs to the hall --------------------- */
  stairs(b, { x: HILL[0], y: h(HILL[0], 4.9), z: 4.9, w: 3.4, steps: 2, rise: 0.13, run: 0.27, color: '#a49c8c', mat: M.stone });
  // two tall horse-head gateposts beside the stair
  for (const s of [-1, 1]) horsePost(b, HILL[0] + s * 2.05, 5.05, 1.15, 0.085);

  /* --------------------------- wells + fences --------------------------- */
  const WX = 4.2, WZ = 6.9;
  const wy = h(WX, WZ);
  b.torus(0.24, 0.07, { x: WX, y: wy + 0.13, z: WZ, sx: 1, sy: 0.85, sz: 1, color: '#9a9184', mat: M.stone, rseg: 6, tseg: 14 });
  b.disc(0.15, { x: WX, y: wy + 0.09, z: WZ, color: '#3d6f7d', mat: M.water, seg: 12 });
  for (const s of [-1, 1]) b.cyl(0.035, 0.045, 0.6, { x: WX + s * 0.28, y: wy + 0.16, z: WZ, color: C.darkwood, mat: M.wood, seg: 6 });
  b.rod([WX - 0.28, wy + 0.78, WZ], [WX + 0.28, wy + 0.78, WZ], 0.03, { color: C.darkwood, mat: M.wood });
  b.cone(0.5, 0.42, { x: WX, y: wy + 0.78, z: WZ, color: '#8a5d3d', mat: M.wood, seg: 10 });
  // the horse-head fence along the street's west side
  const FPOSTS = [[2.9, 7.7], [2.4, 7.2], [1.9, 6.7], [1.5, 6.3], [1.0, 6.0]];
  for (const [px, pz] of FPOSTS) horsePost(b, px, pz);
  for (let i = 0; i < FPOSTS.length - 1; i++) {
    const a = FPOSTS[i], c = FPOSTS[i + 1];
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const mid = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
    b.box(len, 0.045, 0.04, {
      x: mid[0], y: h(mid[0], mid[1]) + 0.34, z: mid[1],
      ry: -Math.atan2(c[1] - a[1], c[0] - a[0]), color: C.wood, mat: M.wood,
    });
  }
  for (const [px, pz] of [[6.3, 7.7], [5.8, 7.1], [5.4, 6.6]]) horsePost(b, px, pz);

  /* ------------------------- haystacks + horses ------------------------- */
  hay(b, 5.4, 8.4);
  hay(b, 1.2, 7.7, 0.85);
  hay(b, -4.6, -2.2, 1.1);
  hay(b, -6.1, 2.4, 0.9);
  horse(b, { x: 6.3, z: 7.85, ry: 0.4, color: '#6a4a2e' });
  const g2 = groundY(5.15, 7.05, 0.56, 0.2);
  horse(b, { x: 5.15, z: 7.05, ry: 0.9, color: '#8a4a2a' });
  figure(b, { x: 5.15, y: g2 + 0.42, z: 7.05, h: 0.34, color: '#55703f', ry: 0.9 });

  /* ------------------------------- people ------------------------------- */
  const PEOPLE = [
    { x: 4.6, z: 7.7, h: 0.4, color: '#55703f', ry: -2.5, arms: 1 },
    { x: 2.8, z: 6.1, h: 0.38, color: '#8a5d3d', ry: -2.2, arms: 0 },
    { x: 1.7, z: 4.75, h: 0.4, color: '#c9b58a', ry: 2.6, arms: 0 },
    { x: 0.2, z: 5.9, h: 0.42, color: '#d9b64e', ry: 0.1, arms: 0, deck: true },
    { x: 1.35, z: 6.15, h: 0.4, color: '#5d5345', ry: -0.6, arms: 1, deck: true },
    { x: 3.6, z: 7.0, h: 0.38, color: '#6a4a2e', ry: 1.9, arms: 0 },
    { x: 5.9, z: 7.9, h: 0.4, color: '#4a5a3e', ry: 1.7, arms: 1 },
    { x: -3.2, z: -2.7, h: 0.38, color: '#8a7a5a', ry: 0.8, arms: 0 },
    { x: -1.6, z: 3.9, h: 0.4, color: '#6e5a44', ry: 1.4, arms: 0 },
    { x: 4.1, z: 3.2, h: 0.38, color: '#5a6270', ry: 0.9, arms: 0 },
  ];
  for (const p of PEOPLE) {
    const y = p.deck ? POD_T + 0.13 : h(p.x, p.z) + 0.03;
    figure(b, { x: p.x, y, z: p.z, h: p.h, color: p.color, ry: p.ry, arms: p.arms });
  }

  /* ------------------------------ lanterns ------------------------------ */
  lantern(b, 2.1, 4.9);
  lantern(b, -1.0, 4.9);
  lantern(b, 3.6, 6.8);

  /* ---------------------------- static build ---------------------------- */
  object.add(b.build());

  /* ----------------------- banners + pennants (wind) -------------------- */
  const bannerGeo = new THREE.PlaneGeometry(0.42, 1.25).translate(0, -0.625, 0);
  const bannerMats = [
    solid('#d9b64e', { side: THREE.DoubleSide, roughness: 0.9 }),
    solid('#c9a24a', { side: THREE.DoubleSide, roughness: 0.9 }),
  ];
  const banners = [];
  const BX = [-1.8, -0.6, 0.6, 1.8];
  for (let i = 0; i < BX.length; i++) {
    const m = new THREE.Mesh(bannerGeo, bannerMats[i % 2]);
    m.position.set(HILL[0] + BX[i], 5.45, HILL[1] + 5.5);
    m.userData.ph = i * 0.7 + 0.3;
    m.castShadow = m.receiveShadow = false;
    object.add(m);
    banners.push(m);
  }
  const pennGeo = pennantGeo(0.5, 0.55);
  const pennMats = [
    solid('#d9b64e', { side: THREE.DoubleSide }),
    solid('#e8dcc0', { side: THREE.DoubleSide }),
  ];
  const pennants = [];
  const PP = [[HILL[0], WALL_T + RH + 0.87, HILL[1]], [HILL[0], WALL_T + RH + 0.72, HILL[1] + 4.25]];
  for (let i = 0; i < PP.length; i++) {
    const m = new THREE.Mesh(pennGeo, pennMats[i % 2]);
    m.position.set(PP[i][0], PP[i][1], PP[i][2]);
    m.userData.ph = i * 1.1 + 0.2;
    m.castShadow = m.receiveShadow = false;
    object.add(m);
    pennants.push(m);
  }

  /* ------------------------- wind streaks on the grass ------------------ */
  const windA = new THREE.Group();
  windA.add(grassStreaks(rng, 11, ['#d9cfae', '#e0d6b8', '#cbbf9e']).build(M.line));
  const windB = new THREE.Group();
  windB.add(grassStreaks(rng, 8, ['#d4c9a4', '#cfc39c']).build(M.line));
  object.add(windA, windB);

  /* --------------------------- smoke from the hall ---------------------- */
  const EM = [HILL[0] + 1.5, 7.5, HILL[1] - 3.6];
  const smoke = [];
  const smokeMat = new THREE.MeshBasicMaterial({ color: '#cfc8ba', transparent: true, opacity: 0.5, depthWrite: false });
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), smokeMat.clone());
    m.visible = false;
    m.position.set(EM[0], EM[1], EM[2]);
    m.castShadow = m.receiveShadow = false;
    object.add(m);
    smoke.push({ m, off: i / 10 });
  }

  /* -------------------------------- update ------------------------------ */
  function update(t, dt) {
    // banners sway between the porch pillars
    for (let i = 0; i < banners.length; i++) {
      const m = banners[i];
      const ph = m.userData.ph;
      m.rotation.y = 0.22 * Math.sin(t * 0.9 + ph) + 0.08 * Math.sin(t * 2.3 + ph * 2.1);
    }
    // pennants flap at the ridge
    for (let i = 0; i < pennants.length; i++) {
      const m = pennants[i];
      const ph = m.userData.ph;
      m.rotation.y = 0.32 * Math.sin(t * 1.15 + ph) + 0.1 * Math.sin(t * 2.7 + ph * 1.7);
    }
    // wind streaks drift slowly across the plain, then wrap
    windA.position.x = ((t * 0.42) % 1.6) - 0.8;
    windA.position.z = Math.sin(t * 0.14) * 0.3;
    windB.position.x = ((t * 0.28) % 1.3) - 0.65;
    windB.position.z = Math.sin(t * 0.11 + 1.2) * 0.25;
    // one smoke wisp from the hall chimney, blown sideways
    for (let i = 0; i < smoke.length; i++) {
      const p = smoke[i];
      const k = (t * 0.1 + p.off) % 1;
      p.m.visible = true;
      p.m.position.set(
        EM[0] + k * 0.8 + Math.sin(k * 3 + p.off * 7) * 0.12 * k,
        EM[1] + k * 1.15,
        EM[2] + Math.cos(k * 2.5 + p.off * 5) * 0.08 * k,
      );
      const sc = 0.55 + k * 1.9;
      p.m.scale.set(sc, sc * 1.3, sc);
      p.m.material.opacity = 0.42 * Math.sin(Math.PI * Math.min(1, k * 1.35));
    }
  }

  return { object, update };
}
