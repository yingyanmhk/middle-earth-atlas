// Fangorn — the oldest forest, where the trees talk and the hills walk.
// One strong idea: an ancient forest where the trees are people — seven giant
// gnarled trunks under heavy dark crowns, and among them three Ents, walking
// trees with branch-arms and root legs, standing watch over a mossy clearing.
// A tiny path dies against a great root; two hobbits stare up at the nearest
// Ent; one dim green old light breathes deep in the wood.
import { THREE, Builder, M, C, terrainDisc, fbm, hash2, rock, tree, glowMat, solid } from '../kit.js';
import { figure, setInst } from './_ab_util.js';

const BARK = '#3a2c1e';          // the ancient trees
const ENT_BARK = '#6b5a42';      // the Ents, lighter bark
const DARK = ['#2f4a2f', '#2a422a', '#334f31', '#27412b', '#2e4630']; // heavy canopies

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

  /* ------------------------------ the ground ------------------------------ */
  const h = (x, z) => {
    // dark mossy forest floor, gently breathing
    let y = 0.34 + 0.15 * fbm(x * 0.30 + 1.7, z * 0.30 + 9.1, { oct: 3, seed: 23 });
    // a mossy swell at the back, beneath the great trees
    y += 0.30 * Math.exp(-(((x + 0.8) ** 2) + ((z + 6.2) ** 2)) / 34);
    // the clearing where the Ents stand lies low and flat
    y -= 0.15 * Math.exp(-(((x - 0.6) ** 2) + ((z - 0.5) ** 2)) / 9);
    return Math.max(0.07, y);
  };

  const TREES = [
    { x: -8.5, z: -3.0, r: 1.30, H: 9.0 },                    // back-left giant
    { x: -3.5, z: -8.2, r: 1.20, H: 8.5 },                    // back
    { x: 4.6, z: -8.2, r: 1.05, H: 7.5 },                     // back-right
    { x: 7.6, z: 5.2, r: 0.90, H: 6.5 },                      // front-right, by the path
    { x: -8.4, z: 3.9, r: 1.00, H: 7.0 },                     // front-left
    { x: 4.3, z: 3.0, r: 1.15, H: 7.0, crown: 'none' },       // the path ends at its root; its crown rustles
    { x: -0.8, z: -6.8, r: 1.35, H: 9.5 },                    // the great tree, back-centre
  ];
  const ENTS = [
    { x: -3.0, z: -0.6, H: 5.6, ry: 0.2 },   // Treebeard, the tallest — sways
    { x: 3.6, z: -2.2, H: 4.5, ry: 2.9 },
    { x: 1.5, z: 2.5, H: 4.2, ry: 0.7 },     // the one the hobbits look up at
  ];

  const colorAt = (x, z, y, up) => {
    const j = hash2(Math.round(x * 2.6), Math.round(z * 2.6), 37);
    let c;
    if (up < 0.6 && y > 0.42) c = ['#33492f', '#2f422b', '#3a5233'][Math.floor(j * 3) % 3];
    else c = ['#41613f', '#3f5d3f', '#4a6a45', '#39523a'][Math.floor(j * 4) % 4];
    // patches of old fallen leaves
    const l = hash2(Math.round(x * 3.7), Math.round(z * 3.7), 61);
    if (l > 0.9 && y < 0.8) c = ['#8a6a42', '#7a5a36', '#6f5230', '#96684a'][Math.floor(l * 4) % 4];
    // deep shade beneath the trees and the Ents
    let md2 = 1e9;
    for (const t of TREES) { const dd = (t.x - x) ** 2 + (t.z - z) ** 2; if (dd < md2) md2 = dd; }
    for (const e of ENTS) { const dd = (e.x - x) ** 2 + (e.z - z) ** 2; if (dd < md2) md2 = dd; }
    const md = Math.sqrt(md2);
    if (md < 1.35) c = mixHex(c, '#26331f', 0.6 * (1 - md / 1.35));
    return c;
  };
  terrainDisc(b, { r: 10.5, rings: 56, segs: 96, height: h, colorAt, mat: M.stone, seed: 23 });

  /* --------------------------- the fading path ---------------------------- */
  const PATH = [[8.5, 6.4], [7.3, 5.9], [6.0, 5.3], [4.7, 4.7], [3.6, 4.15], [2.9, 3.35]];
  for (let i = 0; i < PATH.length - 1; i++) {
    const a = PATH[i], c = PATH[i + 1];
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2;
    b.box(len, 0.05, 0.5, { x: mx, y: h(mx, mz) + 0.02, z: mz, ry: Math.atan2(c[1] - a[1], c[0] - a[0]), color: '#6b5a3a', mat: M.stone });
  }
  // roots across the path, to trip the traveller
  b.rod([5.1, h(5.1, 5.02) + 0.03, 5.02], [4.55, h(4.55, 4.8) + 0.05, 4.8], 0.05, { r2: 0.028, color: BARK, mat: M.wood, seg: 5 });
  b.rod([4.2, h(4.2, 4.6) + 0.03, 4.6], [3.85, h(3.85, 4.5) + 0.05, 4.5], 0.045, { r2: 0.025, color: BARK, mat: M.wood, seg: 5 });

  /* ------------------------- a fallen giant branch ------------------------ */
  b.rod([-6.7, h(-6.7, 4.3) + 0.07, 4.3], [-4.1, h(-4.1, 3.0) + 0.11, 3.0], 0.16, { r2: 0.1, color: BARK, mat: M.wood, seg: 8 });
  // broken twigs and moss reclaiming it
  b.rod([-5.62, h(-5.62, 3.85) + 0.14, 3.85], [-5.18, h(-5.18, 3.85) + 0.58, 3.85], 0.045, { r2: 0.02, color: BARK, mat: M.wood, seg: 5 });
  b.rod([-5.0, h(-5.0, 3.32) + 0.16, 3.32], [-4.62, h(-4.62, 3.32) + 0.62, 3.32], 0.045, { r2: 0.02, color: BARK, mat: M.wood, seg: 5 });
  b.geo(new THREE.IcosahedronGeometry(1, 0), { x: -5.9, y: h(-5.9, 3.8) + 0.2, z: 3.8, sx: 0.3, sy: 0.22, sz: 0.3, color: accent, mat: M.flat, ry: rng.range(0, 6) });
  b.geo(new THREE.IcosahedronGeometry(1, 0), { x: -4.85, y: h(-4.85, 3.35) + 0.26, z: 3.35, sx: 0.34, sy: 0.24, sz: 0.34, color: C.moss, mat: M.flat, ry: rng.range(0, 6) });

  /* --------------------------- the ancient trees -------------------------- */
  // keep canopy blobs inside the disc so nothing hangs off the plinth
  const clampC = (cx, cz, s) => {
    const rr = Math.hypot(cx, cz);
    const maxR = 8.9 - s * 0.55;
    if (rr > maxR) { const k = maxR / rr; return [cx * k, cz * k]; }
    return [cx, cz];
  };
  function giantTree(o) {
    const { x, z, r, H, crown = 'full' } = o;
    const gy = h(x, z);
    // gnarled bark: a lathe with an irregular, bumpy profile
    const prof = [];
    const n = 13;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      let rr = r * (1 - t * 0.68) * (1 + 0.12 * Math.sin(t * 6.0 + 1.2));
      if (rng.chance(0.34)) rr += r * 0.16;                       // a burl
      rr *= 1 + rng.range(-0.06, 0.06);
      prof.push([Math.max(0.05, rr), t * H]);
    }
    b.lathe(prof, { x, y: gy, z, seg: 18, color: BARK, mat: M.wood });
    // splayed roots and exposed burl-knobs at the base (tips clamped inside the disc)
    for (let i = 0, nR = rng.int(3, 5); i < nR; i++) {
      const a = rng.range(0, Math.PI * 2);
      const len = rng.range(r + 0.4, r * 1.8 + 0.5);
      const [ex, ez] = clampC(x + Math.cos(a) * len, z + Math.sin(a) * len, 0.06);
      const ey = Math.max(0.05, h(ex, ez) + 0.02);
      b.rod([x, gy + 0.05, z], [ex, ey, ez], rng.range(0.09, 0.15), { r2: rng.range(0.03, 0.055), color: BARK, mat: M.wood, seg: 6 });
    }
    for (let i = 0, nB = rng.int(2, 3); i < nB; i++) {
      const a = rng.range(0, Math.PI * 2);
      b.sphere(r * 0.2, { x: x + Math.cos(a) * r * 0.95, y: gy + r * 0.14, z: z + Math.sin(a) * r * 0.95, sx: 1.25, sy: 0.75, color: BARK, mat: M.wood, seg: 8 });
    }
    // a few heavy branches, their tips clamped inside the disc
    for (let i = 0; i < 2; i++) {
      const a = rng.range(0, Math.PI * 2);
      const by = gy + H * rng.range(0.5, 0.66);
      const len = rng.range(0.9, 1.5) * r;
      const [ex, ez] = clampC(x + Math.cos(a) * len, z + Math.sin(a) * len, 0.1);
      b.rod([x + Math.cos(a) * 0.1, by, z + Math.sin(a) * 0.1], [ex, by + H * 0.09, ez], rng.range(0.05, 0.085), { r2: 0.03, color: BARK, mat: M.wood, seg: 6 });
    }
    // the heavy dark canopy (skipped for the rustling tree — built separately)
    if (crown !== 'none') {
      const cy = gy + H * 0.62;
      const s0 = Math.min(2.2, r * 1.7);
      const [m0x, m0z] = clampC(x, z, s0);
      b.geo(new THREE.IcosahedronGeometry(1, 1), { x: m0x, y: gy + H * 0.9, z: m0z, sx: s0, sy: s0 * 0.88, sz: s0, color: rng.pick(DARK), mat: M.flat, ry: rng.range(0, 6) });
      const nb = rng.int(4, 6);
      for (let i = 0; i < nb; i++) {
        const a = rng.range(0, Math.PI * 2);
        const off = r * rng.range(0.7, 1.5);
        const s = rng.range(0.65, 1.3) * (0.9 + r * 0.35);
        const [ox, oz] = clampC(x + Math.cos(a) * off, z + Math.sin(a) * off, s);
        b.geo(new THREE.IcosahedronGeometry(1, 0), {
          x: ox, y: cy + H * rng.range(-0.06, 0.2), z: oz,
          sx: s, sy: s * rng.range(0.85, 1.02), sz: s,
          color: rng.pick(DARK), mat: M.flat, ry: rng.range(0, 6),
        });
      }
    }
    // a tuft of moss (the realm accent) growing on the bark
    {
      const mT = H * rng.range(0.16, 0.28);
      const mR = r * (1 - (mT / H) * 0.68) * 0.92 + 0.18;
      const ma = rng.range(0, Math.PI * 2);
      b.geo(new THREE.IcosahedronGeometry(1, 0), {
        x: x + Math.cos(ma) * mR, y: gy + mT, z: z + Math.sin(ma) * mR,
        sx: 0.34, sy: 0.24, sz: 0.34, color: rng.chance(0.5) ? accent : C.moss, mat: M.flat, ry: rng.range(0, 6),
      });
    }
  }
  for (const t of TREES) giantTree(t);

  // the great root the path dies against (the path-end tree's root-sprawl)
  const gy8 = h(4.3, 3.0);
  b.rod([4.05, gy8 + 0.06, 3.05], [2.72, h(2.72, 3.52) + 0.1, 3.52], 0.17, { r2: 0.09, color: BARK, mat: M.wood, seg: 8 });
  b.rod([4.05, gy8 + 0.05, 3.05], [3.6, h(3.6, 4.3) + 0.06, 4.3], 0.1, { r2: 0.05, color: BARK, mat: M.wood, seg: 6 });

  /* ------------------------------- the Ents ------------------------------- */
  // A walking tree: root-legs, a trunk that is legs/waist/chest, branch-arms
  // angling out and down, a gnarled head with eyes and a few small branches.
  // Built relative to its feet (a pushed local frame) so it can be swayed.
  function entInto(bld, o) {
    const { x, z, gy, H, ry } = o;
    bld.push({ x, y: gy, z });
    // root-like legs, splayed around the base
    for (let i = 0; i < 3; i++) {
      const a = ry + (i - 1) * 0.95;
      const len = rng.range(0.6, 0.95);
      const ex = x + Math.cos(a) * len, ez = z + Math.sin(a) * len;
      const ey = Math.max(0.05, h(ex, ez) + 0.02);
      bld.rod([0, 0.06, 0], [ex - x, ey - gy, ez - z], 0.12, { r2: 0.05, color: ENT_BARK, mat: M.wood, seg: 6 });
    }
    // the trunk: legs, knees, waist, chest, shoulders, crown
    const ctl = [
      [0.55, 0.0], [0.46, 0.2], [0.35, 0.32], [0.42, 0.44], [0.34, 0.56],
      [0.46, 0.66], [0.42, 0.76], [0.26, 0.88], [0.20, 1.0],
    ];
    const prof = ctl.map(([rr, t]) => [rr * (1 + rng.range(-0.05, 0.05)), t * H]);
    bld.lathe(prof, { seg: 16, color: ENT_BARK, mat: M.wood });
    // the gnarled head (wider than the trunk top so it reads as a head)
    const hx = Math.cos(ry) * 0.02, hz = Math.sin(ry) * 0.02;
    bld.geo(new THREE.IcosahedronGeometry(1, 0), { x: hx, y: H * 0.98, z: hz, sx: 0.46, sy: 0.38, sz: 0.46, color: ENT_BARK, mat: M.flat, ry: rng.range(0, 6) });
    // two dark watchful eyes, proud of the head's front surface
    const fx = Math.cos(ry), fz = Math.sin(ry);
    const px = -fz, pz = fx;
    for (const s of [-1, 1]) {
      bld.sphere(0.026, { x: fx * 0.22 + px * s * 0.055, y: H * 0.96, z: fz * 0.22 + pz * s * 0.055, color: '#1f2619', mat: M.smooth, seg: 5 });
    }
    // a few small branches on the head, and leaf-tufts
    for (let i = 0; i < 3; i++) {
      const a = rng.range(0, Math.PI * 2);
      const L = rng.range(0.26, 0.42);
      bld.rod([hx, H * 1.06, hz], [hx + Math.cos(a) * L, H * 1.06 + L * 0.7, hz + Math.sin(a) * L], 0.022, { r2: 0.012, color: ENT_BARK, mat: M.wood, seg: 5 });
    }
    for (let i = 0; i < 2; i++) {
      const a = rng.range(0, Math.PI * 2);
      bld.geo(new THREE.IcosahedronGeometry(1, 0), { x: hx + Math.cos(a) * 0.2, y: H * 1.1, z: hz + Math.sin(a) * 0.2, sx: 0.2, sy: 0.17, sz: 0.2, color: rng.pick(DARK), mat: M.flat, ry: rng.range(0, 6) });
    }
    // the two branch-arms, thick, angling out and down, with finger-twigs
    for (const s of [-1, 1]) {
      const hzA = ry + s * 0.72;
      const dip = 0.42;
      const L = H * 0.5;
      const dx = Math.cos(hzA) * Math.cos(dip), dz = Math.sin(hzA) * Math.cos(dip), dy = -Math.sin(dip);
      const E = [dx * L, H * 0.62 + dy * L, dz * L];
      bld.rod([0, H * 0.62, 0], E, 0.1, { r2: 0.042, color: ENT_BARK, mat: M.wood, seg: 7 });
      for (let i = 0; i < 2; i++) {
        const fA = hzA + s * (0.22 + i * 0.2);
        const fL = rng.range(0.26, 0.42);
        const fdx = Math.cos(fA) * Math.cos(dip + 0.1), fdz = Math.sin(fA) * Math.cos(dip + 0.1), fdy = -Math.sin(dip + 0.1);
        bld.rod(E, [E[0] + fdx * fL, E[1] + fdy * fL, E[2] + fdz * fL], 0.024, { r2: 0.012, color: ENT_BARK, mat: M.wood, seg: 5 });
      }
      // moss on the elbow and the chest
      bld.geo(new THREE.IcosahedronGeometry(1, 0), { x: E[0] + dx * 0.12, y: E[1] + 0.05, z: E[2] + dz * 0.12, sx: 0.2, sy: 0.16, sz: 0.2, color: rng.chance(0.5) ? accent : C.moss, mat: M.flat, ry: rng.range(0, 6) });
    }
    bld.geo(new THREE.IcosahedronGeometry(1, 0), { x: fx * 0.5, y: H * 0.66, z: fz * 0.5, sx: 0.22, sy: 0.17, sz: 0.22, color: rng.chance(0.5) ? accent : C.moss, mat: M.flat, ry: rng.range(0, 6) });
    bld.pop();
  }
  // the two standing Ents are static; Treebeard is built into his own group so he can sway
  for (const e of ENTS.slice(1)) entInto(b, { ...e, gy: h(e.x, e.z) });
  const eb = new Builder();
  const gyA = h(ENTS[0].x, ENTS[0].z);
  entInto(eb, { x: ENTS[0].x, z: ENTS[0].z, gy: gyA, H: ENTS[0].H, ry: ENTS[0].ry });
  const entA = new THREE.Group();
  entA.add(eb.build());
  entA.position.set(ENTS[0].x, gyA, ENTS[0].z);
  object.add(entA);

  /* --------------------------- mossy rocks + ferns ------------------------ */
  for (const [rx, rz, rr, rh] of [[-6.0, -1.8, 0.55, 0.9], [5.9, -4.6, 0.5, 0.85], [6.5, 1.0, 0.45, 0.8], [-2.9, 4.7, 0.5, 0.9], [1.2, -4.3, 0.5, 0.9]]) {
    const ry = h(rx, rz);
    rock(b, { x: rx, y: ry + 0.45 * rh, z: rz, r: rr, h: rh, color: rng.pick(['#4f5a44', '#5a6450', '#55644a']), rand: rng, detail: 1 });
    b.geo(new THREE.IcosahedronGeometry(1, 0), { x: rx, y: ry + rh * 0.62, z: rz, sx: rr * 0.7, sy: rr * 0.45, sz: rr * 0.7, color: rng.chance(0.5) ? accent : C.moss, mat: M.flat, ry: rng.range(0, 6) });
  }
  // a few ferns — small fans of green fronds
  function fern(x, z, s = 1) {
    const gy = h(x, z);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + rng.range(-0.3, 0.3);
      b.cone(0.085 * s, 0.34 * s, {
        x: x + Math.cos(a) * 0.1 * s, y: gy, z: z + Math.sin(a) * 0.1 * s,
        rx: -0.5, ry: a, sx: 0.55,
        color: rng.pick(['#5f8a4a', '#6d9a55', '#4a7a3e', '#7d9a63']), mat: M.flat, seg: 5,
      });
    }
  }
  for (const [fx, fz, fs] of [[-5.9, -1.4, 1.2], [6.3, -4.8, 1.1], [6.4, 0.9, 1.0], [-3.0, 4.5, 1.0], [1.0, -4.1, 1.1], [4.9, 4.9, 1.0], [2.2, 1.5, 1.2], [-7.4, 4.3, 1.0], [-0.5, 2.9, 1.0]]) fern(fx, fz, fs);

  /* ----------------------- a dark wall of young pines --------------------- */
  const PINES = [];
  let ptries = 0;
  while (PINES.length < 9 && ptries++ < 600) {
    const [x, z] = rng.inDisc(9.2, 6.2);
    if (z > -0.6) continue;                    // keep the front clearing open
    let ok = true;
    for (const t of TREES) if (Math.hypot(t.x - x, t.z - z) < 2.7) { ok = false; break; }
    for (const e of ENTS) if (Math.hypot(e.x - x, e.z - z) < 2.5) { ok = false; break; }
    for (const p of PINES) if (Math.hypot(p[0] - x, p[1] - z) < 1.5) { ok = false; break; }
    if (!ok) continue;
    PINES.push([x, z]);
  }
  for (const [x, z] of PINES) {
    tree(b, { x, z, y: h(x, z), h: rng.range(2.0, 3.1), kind: 'pine', color: rng.pick([C.darkleaf, '#33502f', '#2a422a']), trunk: '#2f2418', r: rng });
  }

  /* ----------------------------- the hobbits ------------------------------ */
  // two small figures at the path's end, staring up at the nearest Ent
  figure(b, { x: 3.0, y: h(3.0, 4.05) + 0.02, z: 4.05, h: 0.3, color: '#7d9a63', ry: -2.36, arms: 1 });
  figure(b, { x: 3.5, y: h(3.5, 3.9) + 0.02, z: 3.9, h: 0.3, color: '#8a5d3d', ry: -2.15, arms: 1 });

  /* ------------------------------ static build ---------------------------- */
  object.add(b.build());

  /* --------------------- the rustling crown (path-end tree) --------------- */
  const N_RUSTLE = 5;
  const rustle = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), solid('#ffffff', { vertexColors: true, flatShading: true, roughness: 0.9 }), N_RUSTLE);
  rustle.frustumCulled = false;
  rustle.castShadow = rustle.receiveShadow = false;
  const RUSTLE = [
    [4.3, gy8 + 6.0, 3.0, 1.3, 0.0],
    [4.95, gy8 + 5.6, 2.55, 0.95, 1.3],
    [3.7, gy8 + 5.85, 3.6, 1.05, 2.2],
    [4.6, gy8 + 6.5, 3.5, 0.85, 3.1],
    [3.9, gy8 + 5.45, 2.62, 0.8, 4.0],
  ];
  for (let i = 0; i < N_RUSTLE; i++) {
    setInst(rustle, i, RUSTLE[i][0], RUSTLE[i][1], RUSTLE[i][2], RUSTLE[i][3], rng.range(0, 6));
    rustle.setColorAt(i, new THREE.Color(rng.pick(DARK)));
  }
  rustle.instanceColor.needsUpdate = true;
  object.add(rustle);

  /* ------------------- drifting pollen motes (old light) ------------------ */
  const N_POL = 12;
  const pollen = new THREE.InstancedMesh(new THREE.SphereGeometry(0.022, 6, 5), glowMat('#dfe8c2', 1.15), N_POL);
  pollen.frustumCulled = false;
  pollen.castShadow = pollen.receiveShadow = false;
  const POL = [];
  for (let i = 0; i < N_POL; i++) {
    const [x, z] = rng.inDisc(8.5, 0.8);
    POL.push([x, h(x, z) + rng.range(3.5, 5.6), z, rng.range(0, Math.PI * 2)]);
  }
  for (let i = 0; i < N_POL; i++) setInst(pollen, i, POL[i][0], POL[i][1], POL[i][2]);
  object.add(pollen);

  /* ----------------- the dim green old light of the wood ------------------ */
  const gL = h(-1.9, -5.6);
  const deepLight = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), glowMat('#a8d68a', 1.12));
  deepLight.position.set(-1.9, gL + 2.5, -5.6);
  deepLight.castShadow = deepLight.receiveShadow = false;
  object.add(deepLight);

  /* ------------------------------- update -------------------------------- */
  function update(t, dt) {
    // Treebeard sways, monumental and slow
    entA.rotation.z = 0.028 * Math.sin(t * 0.5);
    entA.rotation.x = 0.012 * Math.sin(t * 0.37 + 1.1);
    // the crown of the path-end tree rustles
    for (let i = 0; i < N_RUSTLE; i++) {
      const q = RUSTLE[i];
      setInst(rustle, i,
        q[0] + Math.sin(t * 1.4 + q[4]) * 0.055,
        q[1] + Math.sin(t * 1.9 + q[4] * 1.6) * 0.045,
        q[2] + Math.cos(t * 1.3 + q[4]) * 0.055,
        q[3] * (1 + 0.013 * Math.sin(t * 2.3 + q[4] * 2)), 0.97 + 0.03 * Math.sin(t * 1.8 + q[4]), 0, 0);
    }
    rustle.instanceMatrix.needsUpdate = true;
    // pollen motes drift through the wood
    for (let i = 0; i < N_POL; i++) {
      const a = POL[i], k = (t * 0.05 + a[3]) % 1;
      setInst(pollen, i,
        a[0] + Math.sin(k * 6 + a[3] * 7) * 0.55 * (1 - k * 0.5),
        a[1] - k * (a[1] - 0.3),
        a[2] + Math.cos(k * 5 + a[3] * 5) * 0.55 * (1 - k * 0.5),
        1 + k * 0.22);
    }
    pollen.instanceMatrix.needsUpdate = true;
    // the old light of the wood breathes
    deepLight.scale.setScalar(1 + 0.1 * Math.sin(t * 0.55));
  }

  return { object, update };
}
