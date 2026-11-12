// Minas Morgul — the city of the moon that fell.
// One strong idea: a crooked city of dark leaning towers glowing with a sickly
// pale-green light, in a dead vale under a pale fallen moon — beautiful and wrong.
// A great gate with an iron grate and a faint green light within, a pale stone
// bridge over a black river, and one warm gold window that remembers Minas Ithil.
import { THREE, Builder, M, C, terrainDisc, fbm, hash2, bridge, arch, tree, glowMat } from '../kit.js';

const RIVER_Z = 6.4;  // the dead river runs along x at z ≈ RIVER_Z
const WATER_Y = 0.2;  // water surface
const GATE_Z = 4.55;  // the great gate faces the viewer (+z)

const h = (x, z) => {
  // dark vale floor
  let y = 0.24 + 0.5 * fbm(x * 0.3 + 3.7, z * 0.3 + 1.9, { oct: 4, seed: 31 });
  // the wall of the vale behind the city (north)
  y += 2.8 * Math.exp(-((x + 0.4) ** 2 + (z + 8.9) ** 2) / 36);
  // low hills on either flank
  y += 0.85 * Math.exp(-((x + 8.6) ** 2 + (z + 2.6) ** 2) / 26);
  y += 0.8 * Math.exp(-((x - 8.8) ** 2 + (z + 2.2) ** 2) / 24);
  // a faint road groove from the bridge up to the gate
  const road = Math.exp(-((x * x) / 0.7)) * Math.exp(-((z - 5.6) ** 2) / 2.6);
  y = y * (1 - road) + 0.32 * road;
  // the dead river channel across the front
  const ch = Math.exp(-(((z - RIVER_Z) / 0.95) ** 2)) * Math.max(0, 1 - (Math.abs(x) / 9.2) ** 2);
  y -= 0.85 * ch;
  // a level apron around the gate
  const ap = Math.exp(-((x * x + (z - GATE_Z) ** 2) / 22));
  y = y * (1 - 0.85 * ap) + 0.4 * ap;
  return Math.max(0.06, y);
};

const colorAt = (x, z, y, up) => {
  const j = hash2(Math.round(x * 2.2), Math.round(z * 2.2), 17);
  const inRiver = Math.abs(z - RIVER_Z) < 1.2 && Math.abs(x) < 9;
  if (inRiver) {
    // the black bed of the dead river
    const c = Math.round(0x0a0d12 + (j - 0.5) * 6);
    return '#' + c.toString(16).padStart(6, '0');
  }
  if (z < -6.2) {
    // the far wall of the vale, paler under the dead moon
    const c = Math.round(0x34354a + (j - 0.5) * 16);
    return '#' + c.toString(16).padStart(6, '0');
  }
  if (up < 0.55 && y > 0.7) {
    // steep banks darker
    const c = Math.round(0x1c1d28 + (j - 0.5) * 12);
    return '#' + c.toString(16).padStart(6, '0');
  }
  const c = Math.round(0x252635 + (j - 0.5) * 14);
  return '#' + c.toString(16).padStart(6, '0');
};

/* a dark leaning tower with rings of sickly pale-green windows and a crooked spire */
function morgulTower(b, { x, y, z, r, h, rx = 0, rz = 0, rng, pennant = false }) {
  b.push({ x, y, z, rx, rz });
  // tapering dark shaft
  b.cyl(r * 0.86, r * 1.06, h, { color: '#2c2e38', mat: M.stone, seg: 12 });
  // a cornice near the top
  b.cyl(r * 0.96, r * 0.92, 0.12, { y: h - 0.55, color: '#23252e', mat: M.stone, seg: 12 });
  // rings of pale-green windows — the eyes of insects
  const nRings = Math.max(2, Math.floor((h - 1.2) / 1.7));
  const a0 = rng.range(0, Math.PI * 2);
  const wr = r + 0.012;
  for (let i = 0; i < nRings; i++) {
    const wy = 0.9 + i * ((h - 1.6) / Math.max(1, nRings));
    for (let k = 0; k < 4; k++) {
      const a = a0 + (k / 4) * Math.PI * 2;
      const lit = rng() < 0.62;
      b.quad(0.13, 0.34, {
        x: Math.cos(a) * wr, y: wy, z: Math.sin(a) * wr, ry: Math.PI / 2 - a,
        mat: lit ? M.glow : M.smooth, color: lit ? '#9fd8a8' : '#0d0f15', glow: rng.range(1.3, 1.6),
      });
    }
  }
  // cap, then the crooked spire: a thin bent spike
  b.cyl(r * 0.9, r * 0.84, 0.14, { y: h, color: '#1d1f27', mat: M.stone, seg: 12 });
  const top = h + 0.12;
  b.tube([[0, top, 0], [0.06, top + 0.75, 0.03], [0.13, top + 1.75, 0.07]], 0.045, {
    color: '#1d1f27', mat: M.stone, tseg: 8, rseg: 5,
  });
  if (pennant) {
    // a thin crimson pennant — the mark of the Shadow realm
    b.cyl(0.02, 0.02, 0.9, { x: r + 0.16, y: h - 1.3, z: 0, color: '#101116', mat: M.stone, seg: 5 });
    b.box(0.34, 0.16, 0.012, { x: r + 0.32, y: h - 0.52, z: 0, color: '#5a2f2f', mat: M.cloth });
  }
  b.pop();
}

/* a tall black cloaked rider: featureless hood, no face */
function nazgul(b, { x = 0, y = 0, z = 0, h = 1.15, ry = 0 }) {
  b.push({ x, y, z, ry });
  b.cyl(h * 0.055, h * 0.17, h * 0.78, { color: '#0b0c10', mat: M.cloth, seg: 8 });
  b.cyl(h * 0.045, h * 0.11, h * 0.3, { y: h * 0.76, rx: 0.14, color: '#0e0f14', mat: M.cloth, seg: 8 });
  b.cyl(h * 0.03, h * 0.04, h * 0.09, { y: h * 0.99, rx: 0.14, color: '#07080b', mat: M.cloth, seg: 8 });
  b.pop();
}

/* the leaning towers of the city, front-to-back */
const TOWERS = [
  { x: -2.05, z: 4.45, r: 0.55, h: 8.2, rx: 0.05, rz: 0.06, pennant: true },   // gate, west
  { x: 2.05, z: 4.45, r: 0.55, h: 8.6, rx: 0.04, rz: -0.06, pennant: true },    // gate, east
  { x: 3.1, z: -0.2, r: 0.48, h: 6.8, rx: 0.03, rz: -0.05 },                    // east
  { x: -1.1, z: -2.3, r: 0.52, h: 9.0, rx: -0.06, rz: 0.04 },                   // back
  { x: 0.4, z: 0.3, r: 0.68, h: 11.4, rx: 0.03, rz: -0.055 },                   // the old Tower of the Moon
];

export default function build({ rng, city, accent }) {
  const b = new Builder();
  const object = new THREE.Group();

  /* ------------------------------- terrain ------------------------------- */
  terrainDisc(b, { r: 10.5, rings: 56, segs: 64, height: h, colorAt, mat: M.stone, seed: 31 });

  /* ---------------------------- the dead river --------------------------- */
  // a black band of water across the front, with a faint green shimmer above it
  b.box(17.2, 0.1, 2.2, { x: 0, y: WATER_Y, z: RIVER_Z, color: '#0c1412', mat: M.water });

  /* ----------------------- the pale stone bridge ------------------------- */
  bridge(b, {
    from: [0, h(0, 7.5) + 0.06, 7.5], to: [0, h(0, 5.4) + 0.06, 5.4],
    w: 0.95, rise: 0.55, color: '#8d9196', mat: M.stone, rails: true, segments: 8,
  });
  // a flagged path from the bridge up to the gate, following the slope
  for (const rz of [4.9, 5.15, 5.35]) {
    b.box(1.05, 0.06, 0.32, { x: 0, y: h(0, rz) + 0.012, z: rz, color: '#1f212a', mat: M.stone });
  }

  /* ------------------------------- the city ------------------------------ */
  const towers = TOWERS.map((t) => ({ ...t, y: h(t.x, t.z) }));
  for (const t of towers) {
    morgulTower(b, { x: t.x, y: t.y, z: t.z, r: t.r, h: t.h, rx: t.rx, rz: t.rz, rng, pennant: t.pennant });
  }
  // a ruined stub on the west — the city has been falling for a long time
  const stx = -3.6, stz = 1.0;
  const sty = h(stx, stz);
  b.push({ x: stx, y: sty, z: stz, rz: 0.1 });
  b.cyl(0.3, 0.44, 2.6, { color: '#2c2e38', mat: M.stone, seg: 10 });
  b.box(0.2, 0.5, 0.2, { x: 0.12, y: 2.6, z: 0, rx: 0.5, ry: 0.4, color: '#23252e', mat: M.stone });
  b.box(0.16, 0.4, 0.16, { x: -0.14, y: 2.6, z: 0.1, rx: -0.4, ry: 1.2, color: '#23252e', mat: M.stone });
  b.pop();

  /* ----------------------------- the great gate -------------------------- */
  const gateY = h(0, GATE_Z) + 0.015;
  arch(b, { x: 0, y: gateY, z: GATE_Z, w: 2.4, h: 3.7, t: 0.42, depth: 0.62, color: '#23252e', mat: M.stone });
  // the iron grate at the mouth of the arch
  b.quad(1.5, 2.9, { x: 0, y: gateY + 1.55, z: GATE_Z + 0.31, mat: M.smooth, color: '#0a0c11' });
  for (const bx of [-0.52, -0.17, 0.18, 0.53]) {
    b.box(0.05, 2.9, 0.02, { x: bx, y: gateY + 1.55, z: GATE_Z + 0.32, color: '#3a3d45', mat: M.rough_metal });
  }
  for (let i = 0; i < 4; i++) {
    b.box(1.5, 0.045, 0.02, { x: 0, y: gateY + 0.45 + i * 0.7, z: GATE_Z + 0.32, color: '#3a3d45', mat: M.rough_metal });
  }
  // a faint green light from within the gate
  b.quad(1.5, 2.5, { x: 0, y: gateY + 1.45, z: GATE_Z - 0.23, mat: M.glow, color: '#8fd8a0', glow: 1.35 });

  /* --------------------- the Morgul-flower at the gate ------------------- */
  const fx = 1.5, fz = GATE_Z + 0.28;
  const fy = h(fx, fz);
  b.rod([fx, fy, fz], [fx + 0.05, fy + 0.42, fz + 0.03], 0.015, { color: '#3c4a3a', mat: M.smooth });
  b.quad(0.07, 0.09, { x: fx + 0.02, y: fy + 0.47, z: fz + 0.01, ry: 0.3, rx: 0.4, color: '#a8e0b0', mat: M.cloth });
  b.quad(0.07, 0.09, { x: fx + 0.07, y: fy + 0.45, z: fz - 0.02, ry: 1.6, rx: 0.2, color: '#a8e0b0', mat: M.cloth });

  /* -------------------- dead pale trees and pale stones ------------------- */
  tree(b, { x: -3.9, y: h(-3.9, 6.9) + 0.01, z: 6.9, h: 1.8, kind: 'bare', color: '#8a938f', trunk: '#6e7673', r: rng });
  tree(b, { x: 3.6, y: h(3.6, 7.05) + 0.01, z: 7.05, h: 1.5, kind: 'bare', color: '#7f8985', trunk: '#636c69', r: rng });
  const STONES = [[-2.6, 6.9], [2.9, 6.6], [-1.8, 5.9], [1.5, 6.2], [-3.4, 4.9], [3.2, 4.6], [-2.2, 4.2], [2.2, 4.1], [0.6, 7.6]];
  for (const [sx, sz] of STONES) {
    const s = rng.range(0.1, 0.22);
    b.geo(new THREE.IcosahedronGeometry(1, 0), {
      x: sx, y: h(sx, sz) + s * 0.31, z: sz, sx: s, sy: s * 0.62, sz: s * 0.85,
      color: rng.pick(['#5d636b', '#6a7178', '#4c525a', '#747c83']), mat: M.flat, ry: rng.range(0, 6),
    });
  }

  /* ----------------------------- the Nazgûl ------------------------------ */
  nazgul(b, { x: -0.85, y: h(-0.85, 5.2) + 0.01, z: 5.2, ry: 0.4 });
  nazgul(b, { x: 1.0, y: h(1.0, 5.35) + 0.01, z: 5.35, ry: -0.3 });
  nazgul(b, { x: -0.45, y: h(-0.45, 7.2) + 0.01, z: 7.2, ry: 3.0 });

  /* ------------------------------ static build --------------------------- */
  const staticGroup = b.build();
  object.add(staticGroup);

  /* ------------------------- drifting mist patches ----------------------- */
  const mist = [];
  const MIST = [
    { x: -3.2, z: 6.1, w: 3.4, d: 1.5, y: 0.32, ph: 0.0 },
    { x: 3.4, z: 6.8, w: 2.9, d: 1.2, y: 0.3, ph: 2.1 },
    { x: 0.6, z: 7.9, w: 3.0, d: 1.4, y: 0.28, ph: 4.0 },
    { x: -4.7, z: 3.3, w: 2.6, d: 1.2, y: 0.35, ph: 1.3 },
    { x: 4.6, z: 2.5, w: 2.8, d: 1.3, y: 0.36, ph: 3.2 },
    { x: -1.5, z: 1.2, w: 2.4, d: 3.6, y: 2.0, ph: 5.0, vert: true },
    { x: 2.3, z: 0.7, w: 2.0, d: 3.2, y: 1.9, ph: 6.3, vert: true },
  ];
  for (const c of MIST) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(c.w, c.d),
      new THREE.MeshBasicMaterial({ color: '#c9d2cd', transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide }),
    );
    m.rotation.order = 'YXZ'; // yaw first, then a shallow pitch — keeps the plane near-horizontal/vertical
    m.rotation.x = c.vert ? 0.12 : -Math.PI / 2 + 0.06;
    m.rotation.y = c.ph;
    m.position.set(c.x, c.y, c.z);
    object.add(m);
    mist.push({ mesh: m, x: c.x, y: c.y, z: c.z, ph: c.ph });
  }

  /* --------------------- the breathing pale-green lights ----------------- */
  const glows = [];
  const addGlow = (color, intensity, x, y, z, r, o0, o1, spd, ph) => {
    const m = new THREE.Mesh(
      new THREE.CircleGeometry(r, 20),
      glowMat(color, intensity, { transparent: true, depthWrite: false }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    m.material.opacity = o0;
    object.add(m);
    glows.push({ mesh: m, o0, o1, spd, ph });
  };
  // low green light lying on the water / mist at the city's foot
  addGlow('#9fd8a8', 1.1, -2.6, 0.29, 6.3, 0.85, 0.05, 0.09, 0.5, 0.7);
  addGlow('#a8e0b0', 1.1, 2.9, 0.31, 6.5, 0.7, 0.04, 0.08, 0.42, 2.4);
  // the gate's sick light spilling onto the ground
  addGlow('#8fd8a0', 1.25, 0, gateY + 0.03, 4.78, 1.15, 0.1, 0.17, 0.33, 0.0);
  // the Morgul-flower
  const flower = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 8, 6),
    glowMat('#b8e8c0', 1.45, { transparent: true, depthWrite: false }),
  );
  flower.position.set(fx + 0.03, fy + 0.5, fz + 0.01);
  object.add(flower);
  glows.push({ mesh: flower, o0: 0.6, o1: 0.95, spd: 0.55, ph: 2.0 });

  // pale-green orbs on the crooked spires (they watch the road)
  const ORBS = [
    { i: 4, r: 0.075, spd: 0.5, ph: 0.0 },   // the old Tower of the Moon
    { i: 3, r: 0.06, spd: 0.42, ph: 1.7 },   // the back tower
    { i: 0, r: 0.06, spd: 0.46, ph: 3.1 },   // the west gate tower
  ];
  for (const o of ORBS) {
    const t = towers[o.i];
    const g = new THREE.Group();
    g.position.set(t.x, t.y, t.z);
    g.rotation.set(t.rx || 0, 0, t.rz || 0, 'YXZ');
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(o.r, 8, 6),
      glowMat('#a8e0b0', 1.5, { transparent: true, depthWrite: false }),
    );
    m.position.set(0.13, t.h + 1.95, 0.07);
    g.add(m);
    object.add(g);
    glows.push({ mesh: m, o0: 0.55, o1: 0.85, spd: o.spd, ph: o.ph });
  }

  /* ------------------- one warm gold window (a memory) -------------------- */
  const ctw = towers[4];
  const warm = new THREE.Group();
  warm.position.set(ctw.x, ctw.y, ctw.z);
  warm.rotation.set(ctw.rx || 0, 0, ctw.rz || 0, 'YXZ');
  const warmWin = new THREE.Mesh(
    new THREE.PlaneGeometry(0.15, 0.34),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(C.lamp).multiplyScalar(1.35), toneMapped: false, transparent: true, depthWrite: false }),
  );
  warmWin.position.set(ctw.r + 0.012, 6.2, 0);
  warmWin.rotation.y = Math.PI / 2;
  warm.add(warmWin);
  object.add(warm);
  glows.push({ mesh: warmWin, o0: 0.8, o1: 1.0, spd: 0.35, ph: 1.1 });

  /* ------------------- the dead river's faint shimmer --------------------- */
  const shimmer = new THREE.Mesh(
    new THREE.PlaneGeometry(13, 1.3),
    glowMat('#3a5a48', 1.0, { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  shimmer.rotation.x = -Math.PI / 2;
  shimmer.position.set(0, WATER_Y + 0.09, RIVER_Z);
  object.add(shimmer);

  /* --------------------------- the dead moon ------------------------------ */
  const moon = new THREE.Mesh(
    new THREE.CircleGeometry(3.1, 28),
    new THREE.MeshBasicMaterial({ color: '#cfe6da', toneMapped: false, transparent: true, depthWrite: false, opacity: 0.13 }),
  );
  moon.position.set(-0.4, 12.4, -7.6);
  moon.rotation.x = 0.28;
  moon.rotation.z = 0.22;
  object.add(moon);

  /* ------------------------------- update -------------------------------- */
  function update(t, dt) {
    // the pale-green lights breathe, very slowly
    for (const g of glows) {
      const k = 0.5 + 0.5 * Math.sin(t * g.spd + g.ph);
      g.mesh.material.opacity = g.o0 + (g.o1 - g.o0) * k;
    }
    // the mist drifts through the vale
    for (const m of mist) {
      m.mesh.position.x = m.x + Math.sin(t * 0.11 + m.ph) * 1.5;
      m.mesh.position.z = m.z + Math.cos(t * 0.085 + m.ph * 1.7) * 1.0;
      m.mesh.position.y = m.y + Math.sin(t * 0.21 + m.ph) * 0.06;
      m.mesh.material.opacity = 0.08 + 0.05 * (0.5 + 0.5 * Math.sin(t * 0.3 + m.ph * 2.3));
      const s = 1 + 0.12 * Math.sin(t * 0.12 + m.ph);
      m.mesh.scale.set(s, s, s);
    }
    // the dead river shimmers
    shimmer.material.opacity = 0.05 + 0.035 * Math.sin(t * 0.5);
    shimmer.position.x = Math.sin(t * 0.07) * 0.4;
    // the moon itself barely breathes
    moon.material.opacity = 0.11 + 0.035 * Math.sin(t * 0.24);
  }

  return { object, update };
}
