// Dunharrow — a stony upland under the Dwimorberg, where the host of the West
// camps before the Paths of the Dead. One strong idea: rows of white standing
// stones of forgotten kings march across a cold grey plateau toward a dark
// door in the cliff — a door that no living thing passes — thin mist seeping
// out, and only two torch-fires for warmth.
import { THREE, Builder, M, C, terrainDisc, fbm, hash2, rock, arch, Lines, solid, glowMat } from '../kit.js';
import { figure } from './_ab_util.js';

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const PALE = ['#b8b3a8', '#a8a294', '#c0baab', '#b2ac9e'];
const GRASS = ['#9a967f', '#8d8a70', '#a29d84'];
const ROCK_C = ['#6b675f', '#726e64', '#635f57', '#6e6a61'];
const ROCK_D = ['#5a574f', '#4f4c45', '#56534b', '#514e46'];
const STONE_W = ['#e6dfd0', '#ece5d4', '#ddd4c0', '#d3cab4'];
const TENT_C = ['#6f7a62', '#77836a', '#64705a', '#7c8770', '#5f6b57'];
const GONDOR = ['#8a8f96', '#7c828a', '#94999f'];
const ROHAN = ['#d9b64e', '#c9a24a', '#b8903e'];
const CLOTH_D = ['#5f5a4e', '#6a6357', '#736c5e', '#58544a'];

/* ------------------------------- terrain -------------------------------- */

const h = (x, z) => {
  // a high, mostly flat upland with gentle undulation
  let y = 0.26 + 0.1 * fbm(x * 0.3 + 2.1, z * 0.3 + 5.7, { oct: 4, seed: 83 });
  const r = Math.hypot(x, z);
  // the ground climbs toward the cliff at the back (-z)
  y += 2.6 * Math.exp(-((z + 9.6) ** 2) / 3.5) * (1 - smooth(9.5, 10.5, r));
  return Math.max(0.22, y);
};

const colorAt = (x, z, y, up) => {
  if (up < 0.5) return ROCK_C[1]; // the skirt
  const j = hash2(Math.round(x * 2.6), Math.round(z * 2.6), 41);
  if (y > 1.5) return ROCK_C[Math.floor(j * 4) % 4];
  const dry = hash2(Math.round(x * 1.9), Math.round(z * 1.9), 57) > 0.62;
  const base = dry ? GRASS : PALE;
  let c = parseInt(base[Math.floor(j * base.length) % base.length].slice(1), 16);
  const k = smooth(0.8, 1.6, y); // greyer where it climbs toward the cliff
  c = Math.round(c + (0x6b675f - c) * k);
  return '#' + c.toString(16).padStart(6, '0');
};

/* ------------------------- the standing stones --------------------------- */

function standStone(b, rng, { x, z, hgt, w, ry = 0, lean = 0 }) {
  const y = h(x, z);
  const color = rng.pick(STONE_W);
  b.push({ x, y, z, ry, rx: lean });
  b.box(w, hgt, w * 0.3, { color, mat: M.smooth });
  // a rough broken top
  b.box(w * 0.72, hgt * 0.28, w * 0.22, {
    x: rng.range(-0.04, 0.04), y: hgt * 0.74, z: rng.range(-0.03, 0.03), color, mat: M.smooth,
  });
  b.pop();
}

function fallenStone(b, rng, { x, z, len, ry }) {
  b.box(len, 0.13, 0.15, { x, y: h(x, z) + 0.02, z, ry, rz: rng.range(-0.06, 0.06), color: rng.pick(STONE_W), mat: M.smooth });
}

/* ----------------------------- tents & camp ------------------------------ */

function tent(b, rng, { x, z, r, hgt, color }) {
  const y = h(x, z);
  b.cone(r, hgt, { x, y, z, seg: 8, color, mat: M.cloth });
  // a slim apex pole, slightly askew
  b.rod([x, y + hgt, z], [x + rng.range(-0.04, 0.04), y + hgt + 0.18, z + rng.range(-0.04, 0.04)], 0.02, { color: C.darkwood, mat: M.wood });
}

function fireRing(b, rng, x, z) {
  const y = h(x, z) + 0.02;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + rng.range(0, 0.35);
    b.sphere(0.05, {
      x: x + Math.cos(a) * 0.21, y: y + 0.02, z: z + Math.sin(a) * 0.21,
      sx: 1.25, sy: 0.7, color: rng.pick(['#7c7468', '#8a8478', '#6e6760']), mat: M.stone, seg: 7,
    });
  }
  for (const ry of [0.4, 2.85]) {
    b.box(0.44, 0.07, 0.09, { x, y: y + 0.015, z, rx: 0.28, ry, color: '#4a3626', mat: M.wood });
  }
}

function horse(b, { x, z, ry, color }) {
  const y = h(x, z);
  b.push({ x, y, z, ry });
  for (const [lx, lz] of [[-0.16, -0.05], [0.16, -0.05], [-0.16, 0.05], [0.16, 0.05]]) {
    b.box(0.045, 0.22, 0.045, { x: lx, y: 0.06, z: lz, color: '#3a2c22', mat: M.smooth });
  }
  b.box(0.5, 0.2, 0.14, { y: 0.27, color, mat: M.smooth });
  b.box(0.12, 0.2, 0.09, { x: 0.27, y: 0.43, color, mat: M.smooth });
  b.box(0.18, 0.08, 0.06, { x: 0.4, y: 0.54, color, mat: M.smooth });
  b.box(0.03, 0.12, 0.03, { x: -0.29, y: 0.37, rx: 0.5, color: '#2e2a26', mat: M.smooth });
  b.pop();
}

/* ------------------------------------------------------------------------ */

export default function build({ rng, city, accent }) {
  const b = new Builder();
  const object = new THREE.Group();

  /* ------------------------------- terrain ------------------------------- */
  terrainDisc(b, { r: 10.5, rings: 56, segs: 88, height: h, colorAt, mat: M.stone, seed: 83 });

  /* ------------------------- the standing stones ------------------------- */
  // two rows of white kings' stones marching toward the door, growing taller
  const ROWS = [
    { s: [-6.9, 6.6], e: [-2.7, -6.0], hs: [1.5, 1.8, 2.2, 2.6, 3.0] },
    { s: [6.9, 6.6], e: [2.7, -6.0], hs: [1.5, 1.8, 2.2, 2.6, 3.0] },
  ];
  for (const row of ROWS) {
    for (let i = 0; i < row.hs.length; i++) {
      const t = i / (row.hs.length - 1);
      const x = row.s[0] + (row.e[0] - row.s[0]) * t;
      const z = row.s[1] + (row.e[1] - row.s[1]) * t;
      standStone(b, rng, {
        x, z, hgt: row.hs[i] + rng.range(-0.08, 0.08),
        w: rng.range(0.34, 0.5), ry: rng.range(-0.07, 0.09), lean: rng.range(-0.05, 0.05),
      });
    }
  }
  // a processional marker, a nearer stone, and some fallen ones
  standStone(b, rng, { x: 0, z: 2.6, hgt: 1.9, w: 0.42, ry: 0.03 });
  standStone(b, rng, { x: 0.6, z: -1.7, hgt: 2.1, w: 0.4 });
  fallenStone(b, rng, { x: -0.8, z: 0.9, len: 1.3, ry: 0.5 });
  fallenStone(b, rng, { x: 1.3, z: -3.6, len: 1.5, ry: -0.3 });
  fallenStone(b, rng, { x: -4.4, z: -4.4, len: 1.4, ry: 1.2 });
  // small white fragments scattered on the approach to the door
  for (let i = 0; i < 8; i++) {
    const sx = rng.range(-2.4, 2.4), sz = rng.range(-6.9, -4.9);
    b.sphere(rng.range(0.05, 0.09), { x: sx, y: h(sx, sz) + 0.03, z: sz, sx: 1, sy: 0.6, color: accent, mat: M.smooth, seg: 7 });
  }
  // a pale threshold stone before the door
  b.box(1.5, 0.08, 0.5, { x: 0, y: h(0, -6.9) + 0.02, z: -6.9, color: accent, mat: M.smooth });

  /* ------------------------------ the cliff ------------------------------ */
  const DOOR_Z = -7.6;
  const doorY = h(0, DOOR_Z);
  // a black rock face, and in it the dark door that no living thing passes
  b.box(3.4, 5.0, 1.2, { x: 0, y: doorY, z: -8.2, color: '#16181d', mat: M.flat });
  arch(b, { x: 0, y: doorY + 0.04, z: DOOR_Z, w: 1.9, h: 2.1, t: 0.24, depth: 0.5, color: '#3a383e', mat: M.smooth });
  // jagged crags on top of the door-face
  for (const [cx, cr, chh] of [[0, 1.0, 1.8], [-1.2, 0.7, 1.5], [1.2, 0.7, 1.5]]) {
    rock(b, { x: cx, z: -8.2, y: doorY + 5.02, r: cr, h: chh, color: rng.pick(ROCK_D), rand: rng, detail: 1 });
  }
  // two rocky spurs flanking the door
  for (const sx of [-2.9, 2.9]) {
    b.box(2.0, 4.2, 1.9, { x: sx, y: h(sx, -8.0), z: -8.0, color: rng.pick(ROCK_C), mat: M.flat });
    rock(b, { x: sx, z: -8.0, y: h(sx, -8.0) + 4.22, r: 1.0, h: 1.9, color: rng.pick(ROCK_D), rand: rng, detail: 1 });
  }
  // the tall blocky tiers of the cliff wall behind
  const TIER1 = [[-5.1, 5.5], [-3.1, 6.0], [-1.1, 5.2], [1.3, 5.4], [3.3, 6.2], [5.3, 5.6]];
  const TIER2 = [[-4.3, 8.5], [-1.6, 9.0], [1.0, 9.5], [3.4, 8.2]];
  const TIER3 = [[-2.2, 9.6], [0, 10.2], [2.2, 9.6]];
  for (const [x, hgt] of TIER1) b.box(1.9, hgt, 1.7, { x, y: h(x, -8.7), z: -8.7, color: rng.pick(ROCK_C), mat: M.flat });
  for (const [x, hgt] of TIER2) b.box(2.5, hgt, 2.0, { x, y: h(x, -9.5), z: -9.5, color: rng.pick(ROCK_D), mat: M.flat });
  for (const [x, hgt] of TIER3) b.box(2.2, hgt, 1.6, { x, y: h(x, -9.9), z: -9.9, color: rng.pick(ROCK_D), mat: M.flat });
  // jagged boulders capping the tiers
  for (const [x, z, baseH, r, hgt] of [
    [-3.1, -8.7, 6.0, 1.1, 2.0], [1.3, -8.7, 5.4, 1.2, 2.2], [5.3, -8.7, 5.6, 1.0, 1.8],
    [-1.6, -9.5, 9.0, 1.4, 2.6], [3.4, -9.5, 8.2, 1.3, 2.4],
    [0, -9.9, 10.2, 1.5, 1.6],
  ]) {
    rock(b, { x, z, y: h(x, z) + baseH + 0.02, r, h: hgt, color: rng.pick(ROCK_D), rand: rng, detail: 1 });
  }

  /* ----------------------------- the torches ----------------------------- */
  for (const sx of [-1.35, 1.35]) {
    const ty = h(sx, -7.15);
    b.cyl(0.035, 0.045, 1.5, { x: sx, y: ty, z: -7.15, color: C.darkwood, mat: M.wood, seg: 6 });
  }

  /* ------------------------------- the camp ------------------------------ */
  const TENTS = [
    [-4.9, 6.7, 1.0, 0.85], [-3.5, 4.4, 0.85, 0.75], [-2.3, 6.8, 0.9, 0.8],
    [2.6, 6.6, 0.95, 0.85], [4.8, 7.1, 0.8, 0.7], [3.3, 3.7, 0.85, 0.75], [6.1, -0.5, 0.8, 0.7],
  ];
  for (const [tx, tz, tr, th] of TENTS) tent(b, rng, { x: tx, z: tz, r: tr, hgt: th, color: rng.pick(TENT_C) });
  // guy ropes from a few tent peaks (one line draw call)
  const ropes = new Lines();
  for (const [tx, tz, tr, th] of TENTS.slice(0, 4)) {
    const ty = h(tx, tz);
    for (const a of [0.9, 3.9]) {
      const sx = tx + Math.cos(a) * tr * 1.3, sz = tz + Math.sin(a) * tr * 1.3;
      ropes.seg([tx, ty + th, tz], [sx, h(sx, sz) + 0.03, sz], '#5a5347');
    }
  }
  object.add(ropes.build(M.line));
  // the camp-fires (static rings; flames are animated below)
  for (const [fx, fz] of [[-0.6, 3.0], [-4.4, 5.9], [4.3, 5.6]]) fireRing(b, rng, fx, fz);
  // the banner pole of Gondor
  const BX = 0.8, BZ = 4.6, BH = 3.3;
  const by = h(BX, BZ) + 0.02;
  b.cyl(0.028, 0.036, BH, { x: BX, y: by, z: BZ, color: C.darkwood, mat: M.wood, seg: 6 });
  b.sphere(0.05, { x: BX, y: by + BH, z: BZ, color: C.gold, mat: M.metal, seg: 8 });
  // stacked spears
  const SPX = 1.9, SPZ = 5.3;
  const spy = h(SPX, SPZ) + 0.02;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const tip = [SPX + Math.cos(a) * 0.05, spy + 0.85, SPZ + Math.sin(a) * 0.05];
    b.rod([SPX + Math.cos(a) * 0.3, spy, SPZ + Math.sin(a) * 0.3], tip, 0.012, { color: '#4a3c2a', mat: M.wood });
    b.sphere(0.022, { x: tip[0], y: tip[1], z: tip[2], color: C.silver, mat: M.metal, seg: 6 });
  }
  // a pile of packs
  const PX = -2.0, PZ = 4.8;
  const py = h(PX, PZ) + 0.02;
  for (let i = 0; i < 3; i++) {
    b.geo(new THREE.SphereGeometry(0.21, 10, 8), {
      x: PX + i * 0.3 - 0.15, y: py + 0.16 + (i % 2) * 0.06, z: PZ + (i % 2 ? 0.12 : 0),
      sx: 1, sy: 0.72, color: rng.pick(CLOTH_D), mat: M.cloth,
    });
  }
  b.box(0.55, 0.3, 0.4, { x: PX + 0.55, y: py, z: PZ + 0.18, color: '#4d4030', mat: M.wood });

  /* --------------------- the host: riders and soldiers ------------------- */
  const FIGURES = [
    { x: -1.4, z: 1.8, h: 0.34, color: GONDOR[0], ry: Math.PI },       // sentry, facing the door
    { x: 1.4, z: 1.8, h: 0.34, color: GONDOR[1], ry: Math.PI },
    { x: 4.8, z: 6.0, h: 0.36, color: ROHAN[0], ry: -0.7, arms: 1 },   // rider by the horse
    { x: -4.7, z: 7.4, h: 0.36, color: ROHAN[1], ry: 0.9, arms: 1 },
    { x: 1.0, z: 4.9, h: 0.33, color: GONDOR[2], ry: 0.3 },            // at the banner
    { x: -0.2, z: 3.4, h: 0.33, color: ROHAN[2], ry: 2.6 },            // at the central fire
    { x: -4.2, z: 6.2, h: 0.33, color: GONDOR[0], ry: 1.2 },           // at the west fire
    { x: 3.9, z: 6.0, h: 0.33, color: ROHAN[1], ry: -1.9 },            // at the east fire
    { x: 0, z: -3.8, h: 0.38, color: '#2d2b31', ry: Math.PI },         // the one who will pass the door
    { x: -5.2, z: 4.8, h: 0.33, color: GONDOR[1], ry: 2.4 },           // among the stones
  ];
  for (const p of FIGURES) figure(b, { x: p.x, y: h(p.x, p.z) + 0.02, z: p.z, h: p.h, color: p.color, ry: p.ry, arms: p.arms });
  // two horses of the host
  horse(b, { x: 5.3, z: 6.4, ry: 0.5, color: '#6a6e74' });
  horse(b, { x: -5.2, z: 7.9, ry: 2.9, color: '#6a4a2e' });

  /* ----------------------- scattered rocks on the plain ------------------- */
  for (const [rx, rz, rr, rh] of [
    [-6.4, -1.9, 0.6, 1.1], [6.6, -0.6, 0.6, 1.1], [3.6, 8.2, 0.5, 0.9], [-5.3, 8.4, 0.55, 1.0],
    [1.8, 8.3, 0.5, 0.9], [-2.1, 8.5, 0.45, 0.85], [6.9, 2.3, 0.5, 0.95],
  ]) {
    rock(b, { x: rx, z: rz, y: Math.max(h(rx, rz) + 0.05, 0.4 * rh + 0.03), r: rr, h: rh, color: rng.pick(ROCK_C), rand: rng, detail: 1 });
  }

  /* ------------------------------ static build --------------------------- */
  object.add(b.build());

  /* ------------------------- wind streaks on the plain ------------------- */
  function streaks(rng, n, tints) {
    const L = new Lines();
    let made = 0, tries = 0;
    while (made < n && tries < 500) {
      tries++;
      const a = rng.range(0, Math.PI * 2);
      const rr = rng.range(4.2, 9.2);
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      if (h(x, z) > 1.0) continue;                     // stay on the flat upland
      if (Math.abs(x) < 1.4 && z > -2.0) continue;     // keep the approach clear
      let near = false;
      for (const [tx, tz] of TENTS) if (Math.hypot(x - tx, z - tz) < 1.3) { near = true; break; }
      if (near) continue;
      const y = h(x, z) + 0.14;
      const len = rng.range(0.7, 1.4);
      const dir = rng.range(-0.35, 0.35);
      L.seg([x, y, z], [x + Math.cos(dir) * len, y + rng.range(-0.03, 0.03), z + Math.sin(dir) * len], rng.pick(tints), 1);
      made++;
    }
    return L;
  }
  const windA = new THREE.Group();
  windA.add(streaks(rng, 7, ['#d4cec0', '#cfc9bb', '#c4beb0']).build(M.line));
  const windB = new THREE.Group();
  windB.add(streaks(rng, 6, ['#d9d3c5', '#cbc5b7']).build(M.line));
  object.add(windA, windB);

  /* ------------------------- the mist from the door ---------------------- */
  const EM = [0, 2.0, -7.55];
  const mist = [];
  const mistMat = new THREE.MeshBasicMaterial({ color: '#dfe3e6', transparent: true, opacity: 0.5, depthWrite: false });
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), mistMat.clone());
    m.visible = false;
    m.castShadow = m.receiveShadow = false;
    object.add(m);
    mist.push({ m, off: i / 10 });
  }
  // two low banks of ground mist before the door
  const groundMist = [];
  for (const [mx, mz, mw, md, base, ph] of [[0, -6.1, 3.2, 1.2, 0.2, 0.5], [0.9, -5.4, 2.4, 0.9, 0.16, 2.1]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(mw, md), new THREE.MeshBasicMaterial({ color: '#e8ebee', transparent: true, opacity: base, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(mx, h(mx, mz) + 0.17, mz);
    m.castShadow = m.receiveShadow = false;
    object.add(m);
    groundMist.push({ m, base, ph });
  }

  /* --------------------------- torches and fires ------------------------- */
  const fires = [];
  const addFire = (x, z, y, { light = false, scale = 1, speed = 5.2, ph = 0 } = {}) => {
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.1 * scale, 0.32 * scale, 7),
      new THREE.MeshStandardMaterial({ color: '#ffb066', roughness: 0.6, emissive: '#b04a1e', emissiveIntensity: 0.9 }));
    flame.position.set(x, y + 0.16 * scale, z);
    flame.castShadow = flame.receiveShadow = false;
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.2 * scale, 10, 8), glowMat('#ff9a45', 2.0, { transparent: true }));
    glow.position.set(x, y + 0.15 * scale, z);
    glow.castShadow = glow.receiveShadow = false;
    let lightObj = null;
    if (light) {
      lightObj = new THREE.PointLight('#ff7a2f', 4, 8, 2);
      lightObj.position.set(x, y + 0.35 * scale, z);
      object.add(lightObj);
    }
    object.add(flame, glow);
    fires.push({ flame, glow, light: lightObj, speed, ph, lightBase: light ? 4 : 0 });
  };
  addFire(-1.35, -7.15, h(-1.35, -7.15) + 1.5, { light: true, scale: 0.75, speed: 6.2, ph: 0.2 });
  addFire(1.35, -7.15, h(1.35, -7.15) + 1.5, { light: true, scale: 0.75, speed: 5.9, ph: 1.6 });
  addFire(-0.6, 3.0, h(-0.6, 3.0) + 0.02, { light: true, scale: 1.1, speed: 5.0, ph: 0.8 });
  addFire(-4.4, 5.9, h(-4.4, 5.9) + 0.02, { scale: 1, speed: 4.6, ph: 2.6 });
  addFire(4.3, 5.6, h(4.3, 5.6) + 0.02, { scale: 1, speed: 5.4, ph: 3.3 });

  /* --------------------------- the white banner -------------------------- */
  const bannerPivot = new THREE.Group();
  bannerPivot.position.set(BX, by + BH - 0.06, BZ);
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.8), solid(accent, { side: THREE.DoubleSide, roughness: 0.85 }));
  cloth.position.y = -0.4;
  bannerPivot.add(cloth);
  const trim = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.09), solid('#3a3a3e', { side: THREE.DoubleSide, roughness: 0.85 }));
  trim.position.y = -0.76;
  trim.position.z = 0.012;
  bannerPivot.add(trim);
  object.add(bannerPivot);

  /* -------------------------------- update ------------------------------- */
  function update(t, dt) {
    // mist seeps from the door and dissolves on the cold air
    for (let i = 0; i < mist.length; i++) {
      const p = mist[i];
      const k = (t * 0.13 + p.off) % 1;
      p.m.visible = true;
      p.m.position.set(
        EM[0] + Math.sin(k * 5 + p.off * 9) * 0.3 * k,
        EM[1] - k * 1.12 + Math.sin(k * 4) * 0.05,
        EM[2] + k * 2.5 + Math.cos(k * 3.5 + p.off * 5) * 0.24 * k,
      );
      const sc = 0.24 + k * 0.9;
      p.m.scale.set(sc, sc * 0.8, sc);
      p.m.material.opacity = 0.5 * Math.sin(Math.PI * Math.min(1, k * 1.25));
    }
    // the ground mist breathes
    for (const g of groundMist) g.m.material.opacity = g.base * (0.7 + 0.3 * Math.sin(t * g.ph * 2 + g.ph));
    // the torches and camp-fires breathe
    for (const f of fires) {
      const s = 1 + 0.14 * Math.sin(t * f.speed + f.ph) + 0.07 * Math.sin(t * f.speed * 2.1 + f.ph * 1.6);
      f.flame.scale.set(s, s * (1 + 0.1 * Math.sin(t * f.speed * 1.7 + f.ph)), s);
      f.glow.material.opacity = 0.62 + 0.3 * Math.sin(t * f.speed * 1.4 + f.ph * 2);
      f.glow.scale.setScalar(0.85 + 0.18 * Math.sin(t * f.speed * 1.6 + f.ph * 2.4));
      if (f.light) f.light.intensity = f.lightBase * (0.8 + 0.2 * Math.sin(t * f.speed * 1.2 + f.ph));
    }
    // the banner sways in the cold wind
    bannerPivot.rotation.y = 0.16 * Math.sin(t * 0.9 + 0.4) + 0.05 * Math.sin(t * 2.1 + 0.9);
    bannerPivot.rotation.x = 0.03 * Math.sin(t * 1.3 + 1.7);
    // wind streaks drift across the plain
    windA.position.x = ((t * 0.4) % 1.5) - 0.75;
    windB.position.x = ((t * 0.27) % 1.2) - 0.6;
    windB.position.z = Math.sin(t * 0.12) * 0.25;
  }

  return { object, update };
}
