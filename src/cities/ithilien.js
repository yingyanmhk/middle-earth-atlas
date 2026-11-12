// Ithilien — Henneth Annûn, the hidden dell. One strong idea: a green bowl
// hidden between dark hills, where a curtain of white water falls behind a
// rock screen into a dark pool — still fair under the shadow of Mordor, with
// a tiny black spike (Minas Morgul) on the far skyline.
import { THREE, Builder, M, C, terrainDisc, fbm, hash2, rock, solid, glowMat } from '../kit.js';
import { figure, setInst } from './_ab_util.js';

const POOL = [-5.8, -4.1];     // the plunge pool; the falls land here
const WATER_Y = 0.26;          // pool surface
const FZ = -4.1;               // the falls' z
const DELL = [-0.4, 0.3];      // the dell bowl centre
const WP = [-0.5, -2.0];       // the watch-post
const FIRE = [-0.1, -1.35];    // the campfire
const TOWER = [7.9, -6.7];     // the far black spike, on the east skyline

const clamp01 = (v) => Math.min(1, Math.max(0, v));

/* the outflow stream, from the pool toward the front (x+, z+) */
const STREAM = [[-5.8, -4.1], [-4.6, -3.0], [-3.3, -2.1], [-1.9, -1.3], [-0.5, -0.8],
  [1.0, -0.5], [2.6, -0.2], [4.2, 0.4], [5.8, 1.3], [7.2, 2.5], [8.5, 3.9]];

function streamDist(x, z) {
  let best = Infinity;
  for (let i = 0; i < STREAM.length - 1; i++) {
    const a = STREAM[i], c = STREAM[i + 1];
    const ax = c[0] - a[0], az = c[1] - a[1];
    const len2 = ax * ax + az * az;
    let t = ((x - a[0]) * ax + (z - a[1]) * az) / len2;
    t = Math.min(1, Math.max(0, t));
    const d = Math.hypot(x - (a[0] + ax * t), z - (a[1] + az * t));
    if (d < best) best = d;
  }
  return best;
}

/* the dell: a soft green bowl, closed by a high wall on the west (the falls
   face) and a shadowed ridge on the east (toward Mordor), open to the front */
const h = (x, z) => {
  const sd = streamDist(x, z);
  let y = 0.55 + 0.28 * fbm(x * 0.26 + 2.9, z * 0.26 + 8.1, { oct: 4, seed: 23 });
  const dx = x - DELL[0], dz = z - DELL[1];
  y -= 0.45 * Math.exp(-(dx * dx + dz * dz) / 12);                       // the bowl
  const px = x - POOL[0], pz = z - POOL[1];
  y -= 0.55 * Math.exp(-(px * px + pz * pz) / 2.8);                      // pool basin
  const bw = -6.2 - x;                                                   // back wall (falls face)
  if (bw > 0) {
    const t = Math.min(1, bw / 2.2);
    const fade = 1 - 0.65 * clamp01(((z + 4.1) ** 2) / 16);              // tallest at the falls
    y += 6.6 * t * t * (3 - 2 * t) * fade;
  }
  const rw = x - 3.0;                                                     // east ridge (Mordor side)
  if (rw > 0) {
    const t = Math.min(1, rw / 4.5);
    y += 3.2 * t * t * (3 - 2 * t) * (1 - 0.45 * clamp01((z - 1) / 9)) * (1 - Math.exp(-(sd * sd) / 2));
  }
  y -= 0.6 * Math.exp(-(sd * sd) / 0.7);                                  // the stream channel
  const sw = z - (-2.2);                                                  // rock screen in front of the pool
  if (sw > 0 && x < -2.5) {
    const t = Math.min(1, sw / 2.2);
    y += 1.5 * t * t * (3 - 2 * t) * Math.exp(-((x + 5.3) * (x + 5.3)) / 4) * (1 - Math.exp(-(sd * sd) / 0.8));
  }
  return Math.max(0.14, y);
};

const colorAt = (x, z, y, up) => {
  const sd = streamDist(x, z);
  const pd = Math.hypot(x - POOL[0], z - POOL[1]);
  if ((sd < 0.5 && y < 0.42) || (pd < 1.55 && y < 0.42)) return '#2f4e5a';      // stream & pool bed
  if (y > 2.0 || up < 0.55) {
    if (x > 3) return ['#31353d', '#2a2e36', '#3a4049'][Math.floor(hash2(Math.round(x * 2), Math.round(z * 2), 5) * 3) % 3]; // shadowed east flank
    return ['#5d6474', '#55627a', '#66707f'][Math.floor(hash2(Math.round(x * 2), Math.round(z * 2), 7) * 3) % 3];
  }
  if (y > 1.0) return ['#6d8a55', '#71905a', '#5f7a4c'][Math.floor(hash2(Math.round(x * 3), Math.round(z * 3), 9) * 3) % 3];
  // the meadow — greens with a scatter of flower dots
  const j = hash2(Math.round(x * 6), Math.round(z * 6), 31);
  if (j < 0.045) return ['#f2e8c9', '#e8d5c2', '#d9b8a8', '#e3c05a', '#c9d3a0'][Math.floor(hash2(Math.round(x * 6), Math.round(z * 6), 17) * 5) % 5];
  const k = hash2(Math.round(x * 3), Math.round(z * 3), 11);
  return ['#7d9a63', '#8fae6f', '#a8b57f', '#96a97a'][Math.floor(k * 4) % 4];
};

/* a ribbon of white cloth that follows the fall line and hugs the wall face */
function fallsRibbon(b, pts, z, w, xd) {
  const pos = [];
  for (let i = 0; i < pts.length; i++) {
    const x = pts[i][0] + xd, y = pts[i][1];
    pos.push(x, y, z - w / 2, x, y, z + w / 2);
  }
  const idx = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = i * 2, c = i * 2 + 1, d = i * 2 + 2, e = i * 2 + 3;
    idx.push(a, d, c, c, d, e);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  b.geo(g, { mat: M.cloth, color: '#e9eff4' });
}

/* a silvery-green olive: a low dark trunk and a round, slightly flattened crown */
function olive(b, rng, { x, y, z, h: th }) {
  b.cyl(0.05, 0.08, th * 0.45, { x, y, z, color: C.darkwood, mat: M.wood, seg: 6 });
  const c1 = rng.pick(['#9aab84', '#a3b58e', '#8fa57a', '#b0bf98']);
  const c2 = rng.pick(['#8fa57a', '#9aab84', '#7d9a63']);
  b.geo(new THREE.IcosahedronGeometry(th * 0.3, 0), {
    x: x + rng.range(-0.1, 0.1), y: y + th * 0.62, z: z + rng.range(-0.1, 0.1),
    sx: 1.06, sy: 0.82, sz: 1.06, color: c1, mat: M.flat, ry: rng.range(0, 6),
  });
  b.geo(new THREE.IcosahedronGeometry(th * 0.2, 0), {
    x: x + rng.range(-0.14, 0.14), y: y + th * 0.5, z: z + rng.range(-0.14, 0.14),
    color: c2, mat: M.flat, ry: rng.range(0, 6),
  });
}

/* a white banner with a silver emblem, on a pole */
function banner(b, x, y, z, { h: bh = 1.6, accent }) {
  b.cyl(0.022, 0.028, bh, { x, y, z, color: C.darkwood, mat: M.wood, seg: 5 });
  b.sphere(0.03, { x, y: y + bh, z, color: C.silver, mat: M.metal, seg: 6 });
  const cx = x + 0.22, cy = y + bh - 0.36;
  b.quad(0.5, 0.34, { x: cx, y: cy, z: z + 0.012, mat: M.cloth, color: '#f0eae0' });
  b.geo(new THREE.CircleGeometry(0.07, 12), { x: cx, y: cy + 0.02, z: z + 0.038, mat: M.smooth, color: C.silver });
  b.geo(new THREE.RingGeometry(0.075, 0.09, 12), { x: cx, y: cy + 0.02, z: z + 0.033, mat: M.smooth, color: accent });
}

export default function build({ rng, city, accent }) {
  const b = new Builder();
  const object = new THREE.Group();

  /* ------------------------------- terrain ------------------------------- */
  terrainDisc(b, { r: 10.5, rings: 56, segs: 96, height: h, colorAt, mat: M.stone, seed: 23 });

  /* ------------------------ the pool and the stream ---------------------- */
  b.disc(1.35, { x: POOL[0], y: WATER_Y, z: POOL[1], mat: M.water, color: '#2f4e5a', seg: 26 });
  for (let i = 0; i < STREAM.length - 1; i++) {
    const a = STREAM[i], c = STREAM[i + 1];
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    b.box(len, 0.05, 0.55, {
      x: (a[0] + c[0]) / 2, y: WATER_Y - 0.02, z: (a[1] + c[1]) / 2,
      ry: Math.atan2(c[1] - a[1], c[0] - a[0]), color: '#3d6f7d', mat: M.water,
    });
  }
  // a few pale stones in the pool
  for (const [sx, sz] of [[-4.9, -3.35], [-4.6, -3.9], [-5.2, -3.6]]) {
    b.sphere(rng.range(0.06, 0.1), { x: sx, y: WATER_Y, z: sz, sx: 1.25, sy: 0.55, color: '#c9cfd6', mat: M.smooth, seg: 7 });
  }
  // stepping stones across the outflow, and again where the stream meets the dell
  for (const [sx, sz] of [[-5.02, -4.23], [-5.28, -3.92], [-5.54, -3.62], [-5.8, -3.31],
    [-1.01, -1.57], [-1.39, -0.53]]) {
    b.cyl(0.19, 0.21, 0.09, { x: sx, y: WATER_Y + 0.045, z: sz, color: '#9a9184', mat: M.stone, seg: 9 });
  }

  /* --------------------------- the waterfall ----------------------------- */
  const FALL = [];
  for (let i = 0; i < 11; i++) {
    const t = i / 10;
    const x = -6.3 - t * 2.6;                    // from the pool's west edge to the crest
    FALL.push([x, h(x, FZ)]);
  }
  // three layered ribbons of white water, hugging the wall face
  for (const [zs, wd, xd] of [[0.16, 0.85, -0.12], [0.08, 1.0, 0.0], [0.0, 0.9, 0.1]]) {
    fallsRibbon(b, FALL, FZ + zs, wd, xd);
  }
  // spray glow and foam at the base
  b.disc(0.5, { x: -6.2, y: WATER_Y + 0.06, z: -4.02, mat: M.glow, color: '#c9e0ee', glow: 1.35, seg: 18 });
  b.disc(0.34, { x: -6.42, y: WATER_Y + 0.06, z: -3.72, mat: M.glow, color: '#c9e0ee', glow: 1.2, seg: 14 });
  for (const [fx, fz] of [[-6.35, -4.08], [-6.12, -3.88], [-6.5, -3.6]]) {
    b.sphere(0.09, { x: fx, y: WATER_Y + 0.045, z: fz, color: '#f2f6f9', mat: M.smooth, seg: 7 });
  }

  /* ---------------------- rocks: screen, dell, post ---------------------- */
  const ROCKY = (x, z, r, hh, col) => {
    const ty = h(x, z);
    rock(b, { x, y: ty + hh * 0.5, z, r, h: hh, color: col, rand: rng, detail: 1 });
  };
  // the rock screen in front of the pool (hides the falls' base from the dell)
  ROCKY(-6.4, -1.6, 0.75, 1.7, '#5d6474');
  ROCKY(-5.4, -1.9, 0.6, 1.4, '#66707f');
  ROCKY(-5.6, -0.6, 0.8, 2.0, '#55627a');
  ROCKY(-4.4, -1.3, 0.5, 1.1, '#6d7684');
  // boulders at the wall's foot, west of the pool
  ROCKY(-6.7, -3.2, 0.5, 1.0, '#5a6270');
  ROCKY(-7.0, -2.7, 0.4, 0.8, '#626c7a');
  // rocks hiding the post's door
  ROCKY(-2.1, -2.7, 0.55, 1.1, '#8a8880');
  ROCKY(-2.5, -1.9, 0.5, 0.95, '#7c7a72');
  ROCKY(-1.9, -3.1, 0.42, 0.85, '#928f87');
  // a watch-rock and a couple of dell boulders
  ROCKY(2.35, -1.95, 0.5, 1.0, '#6d7684');
  ROCKY(-3.5, -0.5, 0.45, 0.9, '#7a8290');
  ROCKY(3.5, 1.8, 0.5, 1.0, '#5a6270');

  /* ---------------------------- olive trees ------------------------------ */
  const TREES = [[-2.9, 1.9, 2.1], [-3.4, 3.4, 1.9], [-2.1, 3.7, 2.2], [0.7, 3.5, 2.0],
    [2.3, 2.9, 1.8], [-4.0, 0.9, 1.6], [1.4, -2.6, 1.9], [1.0, -3.4, 1.6], [3.5, 3.0, 1.7]];
  const crowns = [];
  for (const [tx, tz, th] of TREES) {
    const ty = h(tx, tz);
    olive(b, rng, { x: tx, y: ty, z: tz, h: th });
    crowns.push([tx, ty + th * 0.62, tz]);
  }

  /* --------------------------- wildflowers ------------------------------- */
  let flowers = 0;
  for (let i = 0; i < 140 && flowers < 30; i++) {
    const [fx, fz] = rng.inDisc(8.5, 1.2);
    const sd = streamDist(fx, fz);
    const pd = Math.hypot(fx - POOL[0], fz - POOL[1]);
    if (sd < 1.1 || pd < 1.7) continue;
    let fy = h(fx, fz);
    if (fy > 2.3) continue;
    if (Math.hypot(fx - WP[0], fz - WP[1]) < 1.1) continue;
    if (Math.hypot(fx - FIRE[0], fz - FIRE[1]) < 0.8) continue;
    for (const [tx, , tz] of TREES) if (Math.hypot(fx - tx, fz - tz) < 0.7) { fy = -9; break; }
    if (fy < 0) continue;
    b.sphere(rng.range(0.032, 0.05), {
      x: fx, y: fy + 0.045, z: fz,
      color: rng.pick(['#f2e8c9', '#e8d5c2', '#d9b8a8', '#e3c05a', '#c9d3a0', '#d9c9d0']), mat: M.smooth, seg: 7,
    });
    flowers++;
  }

  /* --------------------------- the watch-post ---------------------------- */
  const py = h(WP[0], WP[1]);
  // low grey stone shelter, turf roof (roof sinks 0.02 into the walls so its
  // bottom face never coincides with the wall tops — no z-fighting)
  b.box(2.0, 1.05, 1.5, { x: WP[0], y: py, z: WP[1], color: '#8a8880', mat: M.stone });
  b.box(2.3, 0.13, 1.7, { x: WP[0], y: py + 1.03, z: WP[1], color: '#5f7a4c', mat: M.stone });
  // the hidden door, on the falls side, with an ivory lintel
  b.box(0.46, 0.78, 0.05, { x: WP[0] - 1.03, y: py + 0.1, z: WP[1], color: '#4d3426', mat: M.wood });
  b.box(0.52, 0.06, 0.07, { x: WP[0] - 1.03, y: py + 0.86, z: WP[1], color: accent, mat: M.smooth });
  // one warm lit window, toward the dell
  b.quad(0.34, 0.44, { x: WP[0], y: py + 0.62, z: WP[1] + 0.77, mat: M.glow, color: C.lamp, glow: 1.9 });
  // the Gondor banner, on the flat ground east of the post
  banner(b, 0.3, h(0.3, -2.6), -2.6, { h: 1.7, accent });

  /* --------------------------- the campfire ------------------------------ */
  const gy = h(FIRE[0], FIRE[1]);
  // a ring of stones, a tripod and a small pot over the fire
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.4;
    b.cyl(0.06, 0.08, 0.1, { x: FIRE[0] + Math.cos(a) * 0.3, y: gy + 0.02, z: FIRE[1] + Math.sin(a) * 0.3, color: '#7c7468', mat: M.stone, seg: 6 });
  }
  const APEX = [FIRE[0], gy + 0.85, FIRE[1]];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.9;
    b.rod([FIRE[0] + Math.cos(a) * 0.24, gy + 0.05, FIRE[1] + Math.sin(a) * 0.24], APEX, 0.014, { color: C.darkwood, mat: M.wood, seg: 4 });
  }
  b.sphere(0.085, { x: FIRE[0], y: gy + 0.56, z: FIRE[1], sx: 1.05, sy: 0.92, color: '#3a3a40', mat: M.rough_metal, seg: 8 });
  // a hidden trail of flat stones from the dell to the post
  for (const [px, pz] of [[-1.9, -0.7], [-1.35, -1.3], [-0.95, -1.75]]) {
    b.box(0.5, 0.05, 0.28, { x: px, y: h(px, pz) + 0.03, z: pz, color: '#9a9184', mat: M.stone });
  }

  /* --------------------------- the far tower ----------------------------- */
  const ty2 = h(TOWER[0], TOWER[1]);
  b.cyl(0.09, 0.16, 1.35, { x: TOWER[0], y: ty2, z: TOWER[1], seg: 8, color: '#141519', mat: M.stone, rx: 0.02 });
  b.cyl(0.04, 0.08, 0.55, { x: TOWER[0], y: ty2 + 1.3, z: TOWER[1], seg: 7, color: '#0e0e12', mat: M.stone, rx: -0.05, rz: 0.03 });
  b.cone(0.05, 0.22, { x: TOWER[0], y: ty2 + 1.84, z: TOWER[1], seg: 7, color: '#0e0e12', mat: M.stone });
  b.sphere(0.045, { x: TOWER[0], y: ty2 + 2.05, z: TOWER[1], mat: M.glow, color: '#c4d0b8', glow: 1.25, seg: 7 });

  /* ---------------------- the soldiers of Gondor ------------------------- */
  figure(b, { x: -0.2, y: h(-0.2, -2.4), z: -2.4, h: 0.36, color: '#8a9098', skin: '#d7c8b4', ry: 0.9 });
  figure(b, { x: -1.15, y: h(-1.15, -1.6), z: -1.6, h: 0.35, color: '#9aa0a8', skin: '#d7c8b4', ry: -0.4 });
  figure(b, { x: 0.35, y: h(0.35, -1.05), z: -1.05, h: 0.34, color: '#7c828c', skin: '#d7c8b4', ry: 0.2 });
  figure(b, { x: 2.6, y: h(2.6, -2.3), z: -2.3, h: 0.36, color: '#a4aab2', skin: '#d7c8b4', ry: 0 });
  // a spear beside the sentry at the door
  const spy = h(-1.15, -2.0);
  b.rod([-1.15, spy, -2.0], [-1.15, spy + 0.58, -2.0], 0.012, { color: C.darkwood, mat: M.wood, seg: 4 });
  b.cone(0.02, 0.09, { x: -1.15, y: spy + 0.56, z: -2.0, color: C.silver, mat: M.metal, seg: 5 });

  /* ------------------------------ static build --------------------------- */
  object.add(b.build());

  /* ------------------------- falling water droplets ---------------------- */
  const N_DROP = 40;
  const drops = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.045, 8, 6),
    solid('#e9f2f6', { roughness: 0.2, metalness: 0, emissive: '#cfe0ea', emissiveIntensity: 0.3 }),
    N_DROP,
  );
  drops.frustumCulled = false;
  drops.castShadow = drops.receiveShadow = false;
  const dropPh = [], dropJx = [], dropJz = [];
  for (let i = 0; i < N_DROP; i++) {
    dropPh.push(rng.range(0, 1));
    dropJx.push(rng.range(-1, 1));
    dropJz.push(rng.range(-1, 1));
    setInst(drops, i, FALL[0][0], FALL[0][1], FZ);
  }
  object.add(drops);

  /* ----------------------------- falling petals -------------------------- */
  const N_PETAL = 12;
  const petals = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.075, 0.05),
    solid('#f2e4d0', { side: THREE.DoubleSide, roughness: 0.85 }),
    N_PETAL,
  );
  petals.frustumCulled = false;
  petals.castShadow = petals.receiveShadow = false;
  const petalA = [];
  for (let i = 0; i < N_PETAL; i++) petalA.push([...crowns[i % crowns.length], rng.range(0, Math.PI * 2)]);
  for (let i = 0; i < N_PETAL; i++) setInst(petals, i, petalA[i][0], petalA[i][1], petalA[i][2]);
  object.add(petals);

  /* ------------------------------ the fire ------------------------------- */
  const flame = [];
  const mk = (r, col, int, opts = {}) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), glowMat(col, int, opts));
    m.castShadow = m.receiveShadow = false;
    object.add(m);
    return m;
  };
  const core = mk(0.08, '#ff8a3a', 2.5);
  core.position.set(FIRE[0], gy + 0.2, FIRE[1]);
  const mid = mk(0.13, '#ffb066', 1.7);
  mid.position.set(FIRE[0], gy + 0.13, FIRE[1]);
  const halo = mk(0.3, '#ff9a45', 1.0, { transparent: true, opacity: 0.2, depthWrite: false });
  halo.position.set(FIRE[0], gy + 0.16, FIRE[1]);
  flame.push({ m: core, ph: 0.0 }, { m: mid, ph: 2.1 }, { m: halo, ph: 4.3 });
  // a few embers rising from the fire
  const EMB = 14;
  const ePos = new Float32Array(EMB * 3);
  const eCol = new Float32Array(EMB * 3);
  const ePh = new Float32Array(EMB);
  for (let i = 0; i < EMB; i++) ePh[i] = rng.range(0, 1);
  const eGeo = new THREE.BufferGeometry();
  eGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3));
  eGeo.setAttribute('color', new THREE.BufferAttribute(eCol, 3));
  const eMat = new THREE.PointsMaterial({ size: 0.07, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, toneMapped: false });
  const embers = new THREE.Points(eGeo, eMat);
  embers.frustumCulled = false;
  object.add(embers);
  // slow smoke
  const smoke = [];
  const smokeMat = new THREE.MeshBasicMaterial({ color: '#cfc8ba', transparent: true, opacity: 0.4, depthWrite: false });
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), smokeMat.clone());
    m.visible = false;
    m.castShadow = m.receiveShadow = false;
    object.add(m);
    smoke.push({ m, off: i / 4, ph: rng.range(0, 6) });
  }

  /* -------------------------------- update ------------------------------- */
  function update(t, dt) {
    // the falls flow: droplets stream down the curtain, crest to pool
    for (let i = 0; i < N_DROP; i++) {
      const k = (t * 0.55 + dropPh[i]) % 1;
      const s = (1 - k) * (FALL.length - 1);
      const j = Math.min(FALL.length - 2, Math.floor(s));
      const f = s - j;
      const p = FALL[j], q = FALL[j + 1];
      setInst(drops, i,
        p[0] + (q[0] - p[0]) * f + dropJx[i] * Math.sin(t * 3.2 + dropPh[i] * 9) * 0.18,
        p[1] + (q[1] - p[1]) * f,
        FZ + dropJz[i] * Math.sin(t * 2.4 + dropPh[i] * 7) * 0.22);
    }
    drops.instanceMatrix.needsUpdate = true;
    // a few petals drift down from the olives
    for (let i = 0; i < N_PETAL; i++) {
      const a = petalA[i], k = (t * 0.09 + a[3] * 0.05) % 1;
      setInst(petals, i,
        a[0] + Math.sin(k * 5 + a[3]) * 0.55,
        a[1] - k * (a[1] - 0.16),
        a[2] + Math.cos(k * 4 + a[3] * 0.7) * 0.45,
        1, k * 8 + a[3], 0.25);
    }
    petals.instanceMatrix.needsUpdate = true;
    // the campfire breathes
    for (const f of flame) {
      const s = 1 + 0.11 * Math.sin(t * 8.5 + f.ph) + 0.06 * Math.sin(t * 16.7 + f.ph * 3.1);
      f.m.scale.set(s, s * (1 + 0.07 * Math.sin(t * 5.3 + f.ph)), s);
    }
    halo.material.opacity = 0.17 + 0.07 * Math.sin(t * 6.9 + 1.7);
    // embers rise and fade
    for (let i = 0; i < EMB; i++) {
      const k = (t * 0.5 + ePh[i]) % 1;
      const w = Math.sin(k * 9 + ePh[i] * 17) * 0.14 * k;
      ePos[i * 3] = FIRE[0] - 0.1 * k + w;
      ePos[i * 3 + 1] = gy + 0.16 + k * 1.2;
      ePos[i * 3 + 2] = FIRE[1] + Math.cos(k * 7 + ePh[i] * 13) * 0.1 * k;
      const fade = Math.pow(Math.sin(Math.PI * Math.min(1, k * 1.15)), 0.85);
      const fl = 0.55 + 0.45 * Math.sin(k * 42 + ePh[i] * 91);
      eCol[i * 3] = 0.9 * fade * fl;
      eCol[i * 3 + 1] = 0.55 * fade * fl;
      eCol[i * 3 + 2] = 0.16 * fade * fl;
    }
    eGeo.attributes.position.needsUpdate = true;
    eGeo.attributes.color.needsUpdate = true;
    // a thin wisp of smoke above the fire
    for (const p of smoke) {
      const k = (t * 0.1 + p.off) % 1;
      const rise = k * 0.8;
      p.m.visible = true;
      p.m.position.set(FIRE[0] + rise * 0.35 + Math.sin(p.ph + k * 4) * 0.07, gy + 0.14 + rise, FIRE[1] - rise * 0.15);
      const sc = 0.7 + k * 1.6;
      p.m.scale.set(sc, sc * 1.2, sc);
      p.m.material.opacity = 0.36 * Math.sin(Math.PI * Math.min(1, k * 1.5));
    }
  }

  return { object, update };
}
