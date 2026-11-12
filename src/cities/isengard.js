// Isengard — Orthanc. One strong idea: the black four-horned tower standing
// alone inside a flooded ring of stone — broken, but unbroken. The silhouette:
// a single tall black tower with four sharp pinnacles rising from a circular
// ruin, dark water around its base, one pale sickly light at its crown.
// Broken power, wrongness, and the green creeping back.
import { THREE, Builder, M, C, terrainDisc, fbm, hash2, glowMat } from '../kit.js';
import { figure } from './_ab_util.js';

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const shade = (hex, k) => new THREE.Color(hex).multiplyScalar(k);

const WATER_Y = 0.55;          // the flood's surface
const RING = 7.0;              // radius of the ring wall
const GATE_AM = Math.PI / 2;   // the great gate faces +z (the front)
const GATE_W = 0.17;           // half-width of the gate gap (radians)

// The flooded sector, as a RingGeometry theta range. After rotateX(-π/2) the
// ring's theta maps to world (cos θ, −sin θ), so θ 320°→580° floods the ring
// everywhere except a ~100° dry wedge centred on +z (θ 240°–300°).
const W_TH0 = 5.585, W_THL = 4.538;

/* ---- Orthanc: the tower ---- */
const T = {
  plinthY: 0.5, plinthH: 0.85, plinthR0: 1.15, plinthR1: 1.05,
  shaftY: 1.35, shaftH: 12.25, shaftR0: 0.82, shaftR1: 0.62,   // shaft top y = 13.6
  hornR: 0.5, hornH: 3.6,                                      // horns apex y = 17.2
};
const shaftR = (y) => T.shaftR0 - ((y - T.shaftY) / T.shaftH) * (T.shaftR0 - T.shaftR1);

/* ---- the broken water-wheel, half in the flood ---- */
const WX = 4.3, WZ = 3.4, W_RX = 0.3, W_RY = 0.35;

/* -------------------------------------------------------------- terrain -- */

const h = (x, z) => {
  const r = Math.hypot(x, z);
  let y = 0.34 * fbm(x * 0.55 + 5.1, z * 0.55 + 8.7, { oct: 4, seed: 17 }); // stony skin
  y += 0.25 * Math.exp(-((r - 7.0) ** 2) / 2.6);                            // the ring bank
  y -= 0.20 * Math.exp(-(r * r) / 18);                                      // valley floor dip
  y += 1.0 * Math.exp(-(r * r) / 5) + 0.2 * Math.exp(-(r * r) / 16);        // the rock island
  y += 0.16 * fbm(x * 0.2 + 3.3, z * 0.2 + 1.9, { oct: 3, seed: 31 }) * smooth(6.5, 9.5, r);
  y *= 1 - smooth(9.3, 10.5, r);                                            // fade at the rim
  return Math.max(0.06, y);
};

const colorAt = (x, z, y, up) => {
  const r = Math.hypot(x, z);
  const j = hash2(Math.round(x * 3), Math.round(z * 3), 5);
  let base;
  if (r < 6.4) base = j < 0.5 ? 0x3a3a42 : j < 0.85 ? 0x40404a : 0x35353c;      // flooded valley mud
  else if (r < 7.7) base = j < 0.6 ? 0x46464e : j < 0.9 ? 0x4c4c56 : 0x3f3f46;  // the ring bank
  else base = j < 0.45 ? 0x3d3d45 : j < 0.75 ? 0x43434b : j < 0.92 ? 0x38383f : 0x4e4e57; // outer ground
  let c = Math.round(base + (j - 0.5) * 10);
  // moss creeping over the stone — the forest taking back
  const m = hash2(Math.round(x * 2.1), Math.round(z * 2.1), 9);
  if (m > (r > 6.4 ? 0.78 : 0.92)) c = Math.round(c * 0.55 + 0x3c4a38 * 0.45);
  return '#' + c.toString(16).padStart(6, '0');
};

const WALL_COLS = ['#48484f', '#3f3f47', '#52525c', '#44444c', '#4d4d57'];

export default function build({ rng, city, accent }) {
  const b = new Builder();
  const object = new THREE.Group();

  /* ------------------------------ terrain ------------------------------ */
  terrainDisc(b, { r: 10.5, rings: 60, segs: 96, height: h, colorAt, mat: M.stone, seed: 17 });

  /* --------------------------- the flood (ring) ------------------------ */
  {
    // dark water filling most of the ring, around the tower's island; the sheet
    // reaches almost to the ring wall so the wall's lower courses are submerged
    const g = new THREE.RingGeometry(2.4, 6.95, 72, 4, W_TH0, W_THL);
    g.rotateX(-Math.PI / 2);
    b.geo(g, { y: WATER_Y, mat: M.water, color: '#2f4a52' });
    // thin faces for the water's edges (visible at low angles)
    b.cyl(6.95, 6.95, 0.07, { y: WATER_Y - 0.03, seg: 72, thetaStart: W_TH0, thetaLength: W_THL, open: true, mat: M.water, color: '#2f4a52' });
    b.cyl(2.4, 2.4, 0.07, { y: WATER_Y - 0.03, seg: 48, thetaStart: W_TH0, thetaLength: W_THL, open: true, mat: M.water, color: '#2f4a52' });
    // drowned debris in the shallows
    for (let i = 0; i < 9; i++) {
      const [x, z] = rng.inDisc(6.5, 2.7);
      const phi = ((Math.atan2(z, x) * 180 / Math.PI) + 360) % 360;
      if (phi > 40 && phi < 140) continue; // keep the dry wedge clear
      b.box(rng.range(0.12, 0.28), rng.range(0.06, 0.12), rng.range(0.12, 0.28), {
        x, y: WATER_Y - 0.14, z, rx: rng.range(-0.35, 0.35), ry: rng.range(0, Math.PI), color: rng.pick(WALL_COLS), mat: M.stone,
      });
    }
  }

  /* ---------------------- the ring wall (broken) ----------------------- */
  const SEG = 44;
  for (let i = 0; i < SEG; i++) {
    const a0 = (i / SEG) * Math.PI * 2, a1 = ((i + 1) / SEG) * Math.PI * 2;
    const am = (a0 + a1) / 2;
    let dd = Math.abs(((am - GATE_AM + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (dd < GATE_W) continue;                 // the great gate gap
    if (rng.chance(0.22)) continue;            // gaps where the wall fell
    const tall = rng.chance(0.3);
    const hgt = tall ? rng.range(1.7, 2.5) : rng.range(1.25, 1.9);
    const px = Math.cos(am) * RING, pz = Math.sin(am) * RING;
    const gy = h(px, pz);
    const len = 2 * RING * Math.sin(Math.PI / SEG) + 0.03;
    b.box(len, hgt, 0.5, { x: px, y: gy, z: pz, ry: -am + Math.PI / 2, color: rng.pick(WALL_COLS), mat: M.stone });
    // crenel stubs on the taller sections
    if (tall) {
      const nst = rng.int(1, 2);
      for (let j = 0; j < nst; j++) {
        const off = rng.range(-len * 0.28, len * 0.28);
        b.box(0.3, rng.range(0.24, 0.5), 0.44, {
          x: px + Math.sin(am) * off, y: gy + hgt, z: pz + Math.cos(am) * off,
          ry: -am + Math.PI / 2, color: rng.pick(WALL_COLS), mat: M.stone,
        });
      }
    }
    // moss creeping over the wall
    if (rng.chance(0.45)) {
      b.box(rng.range(0.22, 0.5), rng.range(0.16, 0.42), 0.07, {
        x: px + Math.cos(am) * 0.27, y: gy + 0.04, z: pz + Math.sin(am) * 0.27,
        ry: -am + Math.PI / 2, color: rng.pick(['#3f5d3f', '#4a6a44', '#36523a']), mat: M.flat,
      });
    }
  }
  // fallen blocks around the gaps
  for (let i = 0; i < 8; i++) {
    const a = rng.range(0, Math.PI * 2);
    const rr = rng.range(6.5, 7.7);
    const bx = Math.cos(a) * rr, bz = Math.sin(a) * rr;
    const by = h(bx, bz);
    const lying = rng.chance(0.6);
    b.box(rng.range(0.3, 0.8), lying ? rng.range(0.14, 0.3) : rng.range(0.3, 0.7), rng.range(0.25, 0.6), {
      x: bx, y: by + 0.04, z: bz, rx: lying ? rng.range(1.2, 1.55) : rng.range(0, 0.25), ry: rng.range(0, Math.PI * 2),
      color: rng.pick(WALL_COLS), mat: M.stone,
    });
  }

  /* ---------------------- the great gate + fallen gate ----------------- */
  {
    const jA = GATE_AM + GATE_W + 0.06, jB = GATE_AM - GATE_W - 0.06;
    for (const [ja, jh] of [[jA, 3.2], [jB, 3.0]]) {
      const px = Math.cos(ja) * RING, pz = Math.sin(ja) * RING;
      const gy = h(px, pz);
      b.box(0.62, jh, 0.62, { x: px, y: gy, z: pz, ry: -ja + Math.PI / 2, color: '#33333b', mat: M.stone });
      // a tattered banner of the Shadow (the accent)
      if (ja > GATE_AM) {
        b.box(0.2, 0.85, 0.03, {
          x: px + Math.cos(ja) * 0.4, y: gy + jh - 0.6, z: pz + Math.sin(ja) * 0.4,
          ry: -ja + Math.PI / 2, rz: 0.1, color: shade(accent, 0.9), mat: M.cloth,
        });
      }
    }
    // the fallen gate, torn down across the entrance
    const gy = h(0, 6.25);
    b.box(2.7, 0.12, 1.7, { x: 0, y: gy + 0.05, z: 6.25, rx: 0.18, ry: 0.1, color: '#2e2e36', mat: M.rough_metal });
    // rust stains (accent-tinted), and broken bars at the jambs
    b.box(0.5, 0.06, 0.3, { x: -0.7, y: gy + 0.08, z: 6.4, rx: 0.18, ry: 0.1, color: '#6f3737', mat: M.rough_metal });
    b.box(0.4, 0.06, 0.25, { x: 0.85, y: gy + 0.1, z: 6.35, rx: 0.18, ry: 0.1, color: C.rust, mat: M.rough_metal });
    for (const [sx, sh] of [[-1.2, 1.1], [-0.85, 0.7], [1.15, 0.9]]) {
      b.cyl(0.035, 0.035, sh, { x: sx, y: gy + 0.05, z: 6.85, rx: rng.range(-0.3, 0.3), color: '#2a2a32', mat: M.rough_metal, seg: 6 });
    }
  }

  /* -------------------- the broken water-wheel (half in the flood) ----- */
  const WY = h(WX, WZ);
  const wheelPoint = (ang) => {
    const ly = 1.25 * Math.cos(ang), lz = 1.25 * Math.sin(ang);
    const ry = ly * Math.cos(W_RX) - lz * Math.sin(W_RX);
    const rz = ly * Math.sin(W_RX) + lz * Math.cos(W_RX);
    return [WX + rz * Math.sin(W_RY), WY + 1.05 + ry, WZ + rz * Math.cos(W_RY)];
  };
  b.push({ x: WX, y: WY + 1.05, z: WZ, ry: W_RY, rx: W_RX });
  b.torus(1.25, 0.09, { ry: Math.PI / 2, mat: M.rough_metal, color: '#3a3a42', rseg: 7, tseg: 40 });
  // a broken arc of the rim, still attached
  b.torus(1.25, 0.09, { ry: Math.PI / 2, rx: -0.9, arc: 1.3, tseg: 14, mat: M.rough_metal, color: '#3f3f48', rseg: 6 });
  b.torus(0.7, 0.07, { ry: Math.PI / 2, mat: M.rough_metal, color: '#40404a', rseg: 6, tseg: 30 });
  // three surviving spokes
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    b.box(0.09, 2.4, 0.05, { rx: a, color: '#33333c', mat: M.rough_metal });
  }
  // hub, axle and a broken spoke
  b.cyl(0.18, 0.2, 0.22, { color: '#2e2e36', mat: M.rough_metal, seg: 8 });
  b.cyl(0.05, 0.08, 1.1, { x: 0.55, rz: Math.PI / 2, color: '#2a2a32', mat: M.rough_metal, seg: 6 });
  b.box(0.07, 1.6, 0.05, { rx: 0.5, y: 0.45, color: '#2c2c34', mat: M.rough_metal });
  b.pop();
  // a torn rim fragment lying in the shallows
  b.torus(1.25, 0.09, { x: 4.6, y: WATER_Y - 0.02, z: 3.15, rx: 0.5, ry: 0.9, arc: 1.4, tseg: 14, mat: M.rough_metal, color: '#3a3a42', rseg: 6 });

  /* ------------------------ pits and forges ---------------------------- */
  for (const [px, pz] of [[1.3, 4.1], [-2.0, 4.4]]) {
    const py = h(px, pz);
    // a spoil heap of excavated stone, then the dark pit sunk into it
    b.cyl(0.9, 1.05, 0.3, { x: px, y: py, z: pz, color: '#2e2e36', mat: M.stone, seg: 10 });
    b.cyl(0.42, 0.5, 0.3, { x: px, y: py, z: pz, color: '#16161c', mat: M.stone, seg: 10 });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + rng.range(-0.3, 0.3);
      b.box(0.3, rng.range(0.1, 0.25), 0.3, {
        x: px + Math.cos(a) * 0.62, y: py + 0.28, z: pz + Math.sin(a) * 0.62, ry: a, rx: rng.range(-0.3, 0.3),
        color: rng.pick(WALL_COLS), mat: M.stone,
      });
    }
  }
  // a faint forge ember in the nearer pit
  b.sphere(0.07, { x: 1.3, y: h(1.3, 4.1) + 0.16, z: 4.1, mat: M.glow, color: '#b24a2f', glow: 0.5, seg: 8 });

  /* --------------------- Orthanc: the black tower ---------------------- */
  {
    // black rock plinth on the island
    b.cyl(T.plinthR1, T.plinthR0, T.plinthH, { y: T.plinthY, seg: 8, color: '#22222a', mat: M.smooth });
    // the great dark gate at the base, with its iron ring
    const gr = T.plinthR1 + 0.04;
    b.quad(0.5, 0.78, { x: 0, y: 1.0, z: gr, mat: M.smooth, color: '#0d0d12' });
    b.box(0.08, 0.95, 0.1, { x: -0.29, y: 1.0, z: gr + 0.02, color: '#1c1c24', mat: M.smooth });
    b.box(0.08, 0.95, 0.1, { x: 0.29, y: 1.0, z: gr + 0.02, color: '#1c1c24', mat: M.smooth });
    b.box(0.7, 0.14, 0.1, { x: 0, y: 1.32, z: gr + 0.02, color: '#1c1c24', mat: M.smooth });
    b.torus(0.16, 0.028, { x: 0, y: 1.06, z: gr + 0.06, mat: M.rough_metal, color: '#3f3f47', rseg: 6, tseg: 18 });
    // the shaft: jet-black polished stone
    b.cyl(T.shaftR1, T.shaftR0, T.shaftH, { y: T.shaftY, seg: 8, color: '#2a2a30', mat: M.smooth });
    // narrow slit windows, black against the stone
    for (const yw of [3.6, 6.9, 10.3]) {
      for (const a of [0.55, 1.9, 3.3, 4.7]) {
        const rr = shaftR(yw) + 0.012;
        b.quad(0.09, 0.32, { x: Math.cos(a) * rr, y: yw, z: Math.sin(a) * rr, ry: Math.PI / 2 - a, mat: M.smooth, color: '#14141a' });
      }
    }
    // the flat crown between the horns
    b.cyl(0.62, 0.7, 0.14, { y: T.shaftY + T.shaftH - 0.05, seg: 8, color: '#1f1f27', mat: M.smooth });
    // four horn-pinnacles at the corners
    for (const a of [Math.PI / 4, Math.PI * 3 / 4, Math.PI * 5 / 4, Math.PI * 7 / 4]) {
      b.cone(0.085, T.hornH, {
        x: Math.cos(a) * T.hornR, y: T.shaftY + T.shaftH, z: Math.sin(a) * T.hornR,
        seg: 6, color: '#1e1e26', mat: M.smooth,
      });
    }
  }

  /* ------------------ ivy and moss (the forest taking back) ------------ */
  {
    // vines creeping up the tower's base
    const vine = (a0, y0, y1, n) => {
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const yy = y0 + (y1 - y0) * t;
        const rr = shaftR(yy) + 0.02;
        const a = a0 + t * 0.55;
        pts.push([Math.cos(a) * rr, yy, Math.sin(a) * rr]);
      }
      b.tube(pts, 0.022, { color: '#3f5d3f', mat: M.flat, tseg: 8, rseg: 4 });
      for (let i = 0; i < 6; i++) {
        const t = rng.range(0.15, 0.95);
        const yy = y0 + (y1 - y0) * t;
        const rr = shaftR(yy) + 0.05;
        const a = a0 + t * 0.55 + rng.range(-0.25, 0.25);
        b.box(0.1, 0.055, 0.02, {
          x: Math.cos(a) * rr, y: yy + rng.range(-0.12, 0.12), z: Math.sin(a) * rr,
          ry: -a, rz: rng.range(-0.5, 0.5), color: rng.pick(['#4a6a44', '#3f5d3f', '#2e452e']), mat: M.flat,
        });
      }
    };
    vine(0.5, 1.5, 3.9, 8);
    vine(2.7, 1.5, 3.4, 7);
    vine(4.9, 1.45, 4.3, 9);
    // strands over the plinth
    const plinthR = (y) => T.plinthR0 - ((y - T.plinthY) / T.plinthH) * (T.plinthR0 - T.plinthR1);
    const pvine = (a0) => {
      const pts = [];
      for (let i = 0; i <= 6; i++) {
        const t = i / 6;
        const yy = 0.62 + t * 0.72;
        const a = a0 + t * 0.5;
        pts.push([Math.cos(a) * (plinthR(yy) + 0.02), yy, Math.sin(a) * (plinthR(yy) + 0.02)]);
      }
      b.tube(pts, 0.02, { color: '#3f5d3f', mat: M.flat, tseg: 8, rseg: 4 });
    };
    pvine(1.2);
    pvine(4.4);
    // moss blobs on the island rock
    for (let i = 0; i < 7; i++) {
      const a = rng.range(0, Math.PI * 2);
      const rr = rng.range(0.6, 2.0);
      const mx = Math.cos(a) * rr, mz = Math.sin(a) * rr;
      b.geo(new THREE.IcosahedronGeometry(0.1, 0), {
        x: mx, y: h(mx, mz) + 0.03, z: mz, sx: 1.4, sy: 0.35, sz: 1.2,
        color: rng.pick(['#3f5d3f', '#4a6a44']), mat: M.flat, ry: rng.range(0, 6),
      });
    }
  }

  /* ----------------- the dead garden trees (stripped) ------------------ */
  const deadTree = (x, z, hgt) => {
    const gy = h(x, z);
    const bark = rng.pick(['#8f8a82', '#9a948c', '#857f76']);
    b.rod([x, gy, z], [x, gy + hgt * 0.62, z], 0.045, { color: bark, mat: M.wood, r2: 0.06, seg: 6 });
    const nbr = rng.int(3, 5);
    for (let i = 0; i < nbr; i++) {
      const a = rng.range(0, Math.PI * 2);
      const up = rng.range(0.3, 0.75);
      const len = rng.range(0.5, 1.0) * hgt * 0.4;
      const bx = x + Math.cos(a) * len * 0.4;
      const bz = z + Math.sin(a) * len * 0.4;
      b.rod([x, gy + hgt * up, z], [bx, gy + hgt * (up + 0.35), bz], 0.02, { color: bark, mat: M.wood, seg: 5 });
      if (rng.chance(0.7)) {
        b.rod([bx, gy + hgt * (up + 0.35), bz], [bx + Math.cos(a + 1.2) * 0.25, gy + hgt * (up + 0.5), bz + Math.sin(a + 1.2) * 0.25], 0.012, { color: bark, mat: M.wood, seg: 4 });
      }
    }
  };
  for (const [tx, tz, th] of [[7.9, 4.3, 1.9], [-8.4, 3.1, 2.3], [-6.2, -6.4, 1.7], [5.6, -8.2, 2.0], [-3.4, 8.6, 1.8], [2.9, 6.3, 1.6]]) {
    deadTree(tx, tz, th);
  }

  /* -------------------- causeway, orcs, Saruman ------------------------ */
  // stone causeway from the gate to the island
  for (let i = 0; i < 8; i++) {
    const zz = 2.45 + i * 0.56;
    const cx = (i % 2) * 0.28;
    const cy = h(cx, zz);
    b.cyl(0.3, 0.34, 0.09, { x: cx, y: cy + 0.02, z: zz, color: rng.pick(['#4c4c56', '#52525c', '#45454e']), mat: M.stone, seg: 8 });
  }
  // squat dark orcs with planted spears
  for (const [ox, oz, ry] of [[1.9, 5.6, 0.4], [-2.2, 5.0, -0.5], [0.6, 4.8, 0.15], [1.1, 3.0, 0.9]]) {
    const oy = h(ox, oz);
    figure(b, { x: ox, y: oy, z: oz, h: 0.33, color: '#2c2c30', skin: '#46463f', ry, mat: M.cloth });
    b.rod([ox + 0.12, oy, oz + 0.06], [ox + 0.16, oy + 0.72, oz + 0.1], 0.018, { color: '#33333a', mat: M.rough_metal, seg: 5 });
  }
  // Saruman, tall and dark-robed, before the tower's gate
  {
    const sy = h(0, 1.65);
    b.push({ x: 0, y: sy, z: 1.65, ry: Math.PI });
    const H = 0.56;
    b.cyl(H * 0.09, H * 0.22, H * 0.66, { color: '#3a3a42', mat: M.cloth, seg: 8 });
    b.cone(H * 0.16, H * 0.3, { y: H * 0.55, rx: 0.12, color: '#2c2c34', mat: M.cloth, seg: 8 });
    b.sphere(H * 0.05, { y: H * 0.62, z: H * 0.06, color: '#b8b2a8', mat: M.smooth, seg: 8 });
    b.rod([H * 0.16, H * 0.2, 0], [H * 0.26, H * 0.98, 0], 0.018, { color: '#3a352e', mat: M.wood, seg: 5 });
    b.sphere(0.035, { x: H * 0.26, y: H * 1.0, mat: M.glow, color: '#a8d8b0', glow: 0.4, seg: 8 });
    b.pop();
  }

  /* ------------------------------ static ------------------------------- */
  const staticGroup = b.build();
  object.add(staticGroup);

  /* ----------------- the palantír: a faint sickly light ----------------- */
  const palBase = new THREE.Color('#a8d8b0');
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10), glowMat('#a8d8b0', 0.5));
  orb.position.set(0, T.shaftY + T.shaftH + 0.17, 0);
  object.add(orb);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), glowMat('#a8d8b0', 0.16, { transparent: true, opacity: 0.14, depthWrite: false }));
  halo.position.set(0, T.shaftY + T.shaftH + 0.17, 0);
  object.add(halo);

  /* ----------------------- chains (they sway) -------------------------- */
  const chain = (anchor, len) => {
    const cb = new Builder();
    const n = Math.max(3, Math.ceil(len / 0.34));
    for (let i = 0; i < n; i++) {
      const x0 = (i % 2) * 0.045 - 0.02;
      const x1 = i % 2 === 0 ? 0.025 : -0.025;
      cb.rod([x0, -i * 0.34, 0], [x1, -i * 0.34 - 0.32, 0], 0.028, { color: '#3a3a42', mat: M.rough_metal, seg: 5 });
    }
    const grp = new THREE.Group();
    grp.position.set(anchor[0], anchor[1], anchor[2]);
    grp.add(cb.build());
    object.add(grp);
    return grp;
  };
  const chainA = chain(wheelPoint(-0.8), 1.8);
  const jBx = Math.cos(GATE_AM - GATE_W - 0.06) * RING, jBz = Math.sin(GATE_AM - GATE_W - 0.06) * RING;
  const chainB = chain([jBx, h(jBx, jBz) + 3.0, jBz], 3.0);

  /* -------------------- the slow drip into the pool --------------------- */
  const DRIPS = 9;
  const dripSrc = wheelPoint(-Math.PI / 3);
  const dripTop = dripSrc[1];
  const dripGeo = new THREE.BufferGeometry();
  const dripPos = new Float32Array(DRIPS * 3);
  const dripPh = new Float32Array(DRIPS);
  for (let i = 0; i < DRIPS; i++) dripPh[i] = rng.range(0, 1);
  dripGeo.setAttribute('position', new THREE.BufferAttribute(dripPos, 3));
  const drips = new THREE.Points(dripGeo, new THREE.PointsMaterial({
    color: '#9fb8c0', size: 0.05, transparent: true, opacity: 0.8, depthWrite: false, sizeAttenuation: true,
  }));
  drips.frustumCulled = false;
  object.add(drips);

  /* ------------------------------ update ------------------------------- */
  function update(t, dt) {
    // the palantír's pale light pulses, very slowly
    const k = 0.42 + 0.14 * Math.sin(t * 1.15) + 0.05 * Math.sin(t * 0.41 + 2.1);
    orb.material.color.copy(palBase).multiplyScalar(k);
    orb.scale.setScalar(1 + 0.05 * Math.sin(t * 1.15));
    halo.material.opacity = 0.10 + 0.05 * Math.sin(t * 0.85 + 1.3);
    // chains sway slightly
    chainA.rotation.z = 0.05 * Math.sin(t * 0.7);
    chainB.rotation.z = 0.04 * Math.sin(t * 0.55 + 1.2);
    // water drips into the pool
    for (let i = 0; i < DRIPS; i++) {
      const kk = (t * 0.4 + dripPh[i]) % 1;
      dripPos[i * 3] = dripSrc[0] + Math.sin(kk * 7 + dripPh[i] * 13) * 0.1;
      dripPos[i * 3 + 1] = dripTop - kk * (dripTop - WATER_Y + 0.05);
      dripPos[i * 3 + 2] = dripSrc[2] + Math.cos(kk * 9 + dripPh[i] * 7) * 0.08;
    }
    dripGeo.attributes.position.needsUpdate = true;
  }

  return { object, update };
}
