// Rivendell — Imladris, the Last Homely House.
// One strong idea: a cleft valley between two slate cliffs, a waterfall
// pouring down the head wall, and a long low elven hall of slender columns
// and warm windows standing by the silver river — silver and gold at dusk.
import { THREE, Builder, M, C, terrainDisc, fbm, hash2, bridge, column, rock, solid, glowMat } from '../kit.js';
import { figure, setInst } from './_ab_util.js';

const W = 3.0;        // valley half-width (the ridges flank |z| > W)
const HEAD = -6.5;    // the head wall begins rising west of this x
const WATER_Y = 0.30; // river surface

// the river meanders along the valley, fed by the falls at its west end
const RIVER = [[-7.3, 0.25], [-6.0, 0.45], [-4.6, 0.6], [-3.2, 0.55], [-1.8, 0.3],
  [-0.3, 0.1], [1.3, 0.25], [3.0, 0.65], [4.8, 0.5], [6.4, -0.1], [7.9, -0.5]];

const clamp01 = (v) => Math.min(1, Math.max(0, v));

const riverZ = (x) => {
  if (x <= RIVER[0][0]) return RIVER[0][1];
  for (let i = 0; i < RIVER.length - 1; i++) {
    const a = RIVER[i], c = RIVER[i + 1];
    if (x <= c[0]) return a[1] + (c[1] - a[1]) * ((x - a[0]) / (c[0] - a[0]));
  }
  return RIVER[RIVER.length - 1][1];
};

/** a point along the river polyline by arc-length fraction t */
function riverPoint(R, t) {
  const lens = [];
  let total = 0;
  for (let i = 0; i < R.length - 1; i++) {
    const l = Math.hypot(R[i + 1][0] - R[i][0], R[i + 1][1] - R[i][1]);
    lens.push(l); total += l;
  }
  let d = t * total;
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const k = Math.min(1, d / lens[i]);
      return [R[i][0] + (R[i + 1][0] - R[i][0]) * k, R[i][1] + (R[i + 1][1] - R[i][1]) * k];
    }
    d -= lens[i];
  }
  return [R[R.length - 1][0], R[R.length - 1][1]];
}

const h = (x, z) => {
  let y = 0.32 + 0.15 * fbm(x * 0.26 + 5.1, z * 0.26 + 2.3, { oct: 3, seed: 41 });
  y += 0.10 * Math.exp(-((x + 6.5) ** 2) / 16);                    // the floor climbs toward the falls
  const rz = riverZ(x);
  y -= 0.26 * Math.exp(-((z - rz) ** 2) / 0.9);                    // the river channel
  y -= 0.18 * Math.exp(-(((x + 7.2) ** 2) + (z - 0.2) ** 2) / 2.6);   // the falls pool
  const d = Math.abs(z) - W;                                       // flanking ridges
  if (d > 0) {
    const t = Math.min(1, d / 3.4);
    y += 7.6 * t * t * (3 - 2 * t) * (1 - 0.5 * clamp01((z + 9.5) / 19));
  }
  const bz = HEAD - x;                                             // the head wall
  if (bz > 0) {
    const t = Math.min(1, bz / 2.9);
    y += 9.6 * t * t * (3 - 2 * t) * Math.exp(-(z * z) / 12);      // tallest at the falls, fading to the flanks
  }
  return Math.max(0.12, y);
};

const colorAt = (x, z, y, up) => {
  if (Math.abs(z - riverZ(x)) < 0.62 && y < 0.5) return '#2f6377';
  if (y > 1.1 || up < 0.5) {
    return ['#5d6474', '#4d5564', '#66707f', '#55627a'][Math.floor(hash2(Math.round(x * 2), Math.round(z * 2), 7) * 4) % 4];
  }
  if (y > 0.7) {
    return ['#6d8a55', '#71905a', '#5f7a4c'][Math.floor(hash2(Math.round(x * 3), Math.round(z * 3), 9) * 3) % 3];
  }
  return ['#7d9a63', '#8fae6f', '#a8b57f', '#c9b58a'][Math.floor(hash2(Math.round(x * 4), Math.round(z * 4), 11) * 4) % 4];
};

/* a gable roof whose ridge runs along X (the kit's GABLE runs along Z) */
const ROOFX = (() => {
  const s = new THREE.Shape([new THREE.Vector2(-0.5, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0, 1)]);
  const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
  g.translate(0, 0, -0.5);
  g.rotateY(Math.PI / 2);
  return g;
})();

/* a pointed (elven) arch: ring with an opening, extruded along z */
function archRing(w, hgt, t, depth) {
  const hw = w / 2;
  const s = new THREE.Shape();
  s.moveTo(0, hgt);
  s.quadraticCurveTo(-hw * 0.55, hgt * 0.72, -hw, 0);
  s.lineTo(hw, 0);
  s.quadraticCurveTo(hw * 0.55, hgt * 0.72, 0, hgt);
  const iw = hw - t;
  const hole = new THREE.Path();
  hole.moveTo(0, hgt - t * 0.55);
  hole.quadraticCurveTo(iw * 0.55, hgt * 0.72 - t * 0.35, iw, t * 0.6);
  hole.lineTo(-iw, t * 0.6);
  hole.quadraticCurveTo(-iw * 0.55, hgt * 0.72 - t * 0.35, 0, hgt - t * 0.55);
  s.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 8 });
  g.translate(0, 0, -depth / 2);
  return g;
}

function archLeaf(w, hgt) {
  const hw = w / 2;
  const s = new THREE.Shape();
  s.moveTo(0, hgt);
  s.quadraticCurveTo(-hw * 0.55, hgt * 0.72, -hw, 0);
  s.lineTo(hw, 0);
  s.quadraticCurveTo(hw * 0.55, hgt * 0.72, 0, hgt);
  return new THREE.ShapeGeometry(s, 8);
}

/* a slender silver birch with an autumn-gold crown */
function birch(b, rng, { x, y, z, h: th }) {
  b.cyl(0.04, 0.07, th * 0.5, { x, y, z, color: '#cdd3da', mat: M.smooth, seg: 6 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + rng.range(0, 1);
    b.rod([x + Math.cos(a) * 0.02, y + th * 0.38, z + Math.sin(a) * 0.02],
      [x + Math.cos(a) * th * 0.17, y + th * 0.5, z + Math.sin(a) * th * 0.17], 0.016, { color: '#b8c0c8', mat: M.smooth, seg: 4 });
  }
  b.geo(new THREE.IcosahedronGeometry(th * 0.16, 0), {
    x: x + rng.range(-0.08, 0.08), y: y + th * 0.6, z: z + rng.range(-0.08, 0.08),
    sx: 1.04, sy: 0.9, sz: 1.04, color: rng.pick(['#c9a24a', '#d9b64e', '#b58f3e']), mat: M.flat, ry: rng.range(0, 6),
  });
  b.geo(new THREE.IcosahedronGeometry(th * 0.11, 0), {
    x: x + rng.range(-0.14, 0.14), y: y + th * 0.48, z: z + rng.range(-0.14, 0.14),
    color: rng.pick(['#d9b64e', '#e3c05a', '#c9a24a']), mat: M.flat, ry: rng.range(0, 6),
  });
}

/* a small standing lantern */
function lantern(b, x, y, z) {
  b.cyl(0.022, 0.03, 0.85, { x, y, z, color: C.darkwood, mat: M.wood, seg: 6 });
  b.sphere(0.085, { x, y: y + 0.85, z, mat: M.glow, color: C.lamp, glow: 2.2, seg: 8 });
}

/**
 * A ribbon of white cloth that follows a fall line (an array of [x, y] points)
 * and hangs with width w around z, so it hugs the real cliff face.
 */
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

export default function build({ rng, city, accent }) {
  const b = new Builder();
  const object = new THREE.Group();

  /* ------------------------------- terrain ------------------------------- */
  terrainDisc(b, { r: 10.5, rings: 56, segs: 96, height: h, colorAt, mat: M.stone, seed: 31 });

  /* ------------------------------- the river ----------------------------- */
  for (let i = 0; i < RIVER.length - 1; i++) {
    const a = RIVER[i], c = RIVER[i + 1];
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    b.box(len, 0.06, 0.85, {
      x: (a[0] + c[0]) / 2, y: WATER_Y - 0.03, z: (a[1] + c[1]) / 2,
      ry: Math.atan2(c[1] - a[1], c[0] - a[0]), color: '#3d6f7d', mat: M.water,
    });
  }
  // the falls pool
  b.disc(0.9, { x: -7.25, y: WATER_Y - 0.015, z: 0.25, mat: M.water, color: '#3d6f7d', seg: 22 });
  // silver stones in the water
  for (let i = 0; i < 12; i++) {
    const t = rng.range(0, 1);
    const [x, z] = riverPoint(RIVER, t);
    const off = rng.range(-0.35, 0.35);
    b.sphere(rng.range(0.05, 0.13), {
      x: x + off, y: WATER_Y - 0.03, z, sx: 1.2, sy: 0.55,
      color: rng.pick(['#cfd4da', '#b8bec8', '#e0e4ea', '#aab4c0']), mat: M.smooth, seg: 8,
    });
  }

  /* ------------------------------- paths -------------------------------- */
  const PATH1 = [[-3.2, 1.15], [-2.5, 1.3], [-1.8, 1.25], [-1.1, 1.1], [-0.4, 0.9]];
  const PATH2 = [[-3.2, 1.15], [-4.1, 1.4], [-5.0, 1.6], [-5.8, 1.75]];
  for (const P of [PATH1, PATH2]) {
    for (let i = 0; i < P.length - 1; i++) {
      const a = P[i], c = P[i + 1];
      const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
      const mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2;
      b.box(len, 0.06, 0.55, {
        x: mx, y: h(mx, mz) + 0.025, z: mz,
        ry: Math.atan2(c[1] - a[1], c[0] - a[0]), color: '#b8ad96', mat: M.stone,
      });
    }
  }

  /* ------------------------------- bridges ------------------------------ */
  bridge(b, { from: [-3.2, h(-3.2, 1.15) + 0.1, 1.15], to: [-3.2, 0.52, 0.3], w: 1.25, rise: 0.38, color: '#c9c3b4', mat: M.stone, rails: true, segments: 8 });
  bridge(b, { from: [2.6, h(2.6, 1.15) + 0.1, 1.15], to: [2.6, h(2.6, -0.7) + 0.1, -0.7], w: 1.05, rise: 0.3, color: '#c9c3b4', mat: M.stone, rails: true, segments: 8 });

  /* ------------------------------- rocks -------------------------------- */
  rock(b, { x: 5.0, y: h(5.0, -4.6) + 0.45 * 1.4, z: -4.6, r: 0.65, h: 1.4, color: '#5a6270', rand: rng, detail: 1 });
  rock(b, { x: 6.5, y: h(6.5, 4.2) + 0.45 * 1.3, z: 4.2, r: 0.6, h: 1.3, color: '#626c7a', rand: rng, detail: 1 });
  rock(b, { x: -6.6, y: h(-6.6, 0.9) + 0.45 * 0.8, z: 0.9, r: 0.5, h: 0.8, color: '#7a8290', rand: rng, detail: 1 });
  rock(b, { x: 7.2, y: h(7.2, 0.6) + 0.45 * 1.0, z: 0.6, r: 0.55, h: 1.0, color: '#6d7684', rand: rng, detail: 1 });

  /* ------------------------------- trees -------------------------------- */
  const TREES = [[-1.5, 2.2, 2.3], [-5.5, 1.6, 2.2], [-1.0, -2.6, 2.2], [4.6, -3.7, 2.1], [5.2, 3.6, 2.2], [4.2, 1.3, 2.2]];
  const crowns = [];
  for (const [x, z, th] of TREES) {
    const y = h(x, z);
    birch(b, rng, { x, y, z, h: th });
    crowns.push([x, y + th * 0.6, z]);
  }

  /* ------------------- the Last Homely House (long low hall) ------------- */
  const HX = -3.2, HZ = -1.4; // house centre, south of the river
  // foundation + walls (warm ivory over a pale stone base)
  b.box(7.2, 0.14, 1.8, { x: HX, y: 0.42, z: HZ, color: '#a49c8c', mat: M.stone });
  b.box(7.0, 0.25, 1.9, { x: HX, y: 0.56, z: HZ, color: '#d8cfbc', mat: M.stone });
  b.box(7.0, 1.75, 1.86, { x: HX, y: 0.81, z: HZ, color: '#efe4cf', mat: M.stone });
  // gabled slate roof, ridge along X
  b.geo(ROOFX, { x: HX, y: 2.56, z: HZ, sx: 7.14, sy: 1.0, sz: 2.04, mat: M.flat, color: '#5d6474' });

  // a small round tower at the west end, near the falls
  const TX = -6.55;
  b.cyl(0.42, 0.45, 3.6, { x: TX, y: 0.56, z: HZ, seg: 12, color: '#e6dcc8', mat: M.stone });
  b.cone(0.52, 1.1, { x: TX, y: 4.16, z: HZ, seg: 12, color: '#5d6474', mat: M.flat });
  b.quad(0.12, 0.3, { x: TX + 0.44, y: 1.8, z: HZ, ry: Math.PI / 2, mat: M.glow, color: C.lamp, glow: 1.7 });
  b.quad(0.12, 0.3, { x: TX, y: 2.6, z: HZ + 0.44, mat: M.smooth, color: C.charcoal });

  // the north colonnade (porch) facing the river
  b.box(6.4, 0.10, 0.65, { x: HX - 0.2, y: 0.50, z: -0.025, color: '#d8cfbc', mat: M.stone }); // porch floor
  const COLS = [-6.2, -5.4, -4.6, -3.8, -3.0, -2.2, -1.4];
  for (const cx of COLS) column(b, { x: cx, y: 0.60, z: -0.05, r: 0.09, h: 2.16, color: '#ece3d2', mat: M.smooth });
  b.box(6.8, 0.10, 0.5, { x: HX - 0.2, y: 2.58, z: -0.05, color: '#ece3d2', mat: M.smooth }); // entablature

  // pointed doors on the north wall, warm light spilling out
  for (const dx of [-4.3, -2.6]) {
    b.geo(archRing(0.72, 1.5, 0.09, 0.12), { x: dx, y: 0.56, z: -0.42, color: '#d9d0bd', mat: M.smooth });
    b.geo(archLeaf(0.64, 1.42), { x: dx, y: 0.57, z: -0.47, mat: M.glow, color: C.lamp, glow: 1.6 });
    b.geo(archLeaf(0.62, 1.38), { x: dx + 0.28, y: 0.57, z: -0.37, ry: 0.55, color: '#4d3426', mat: M.wood });
  }

  // warm windows — the house glows like evening
  for (const wx of [-5.8, -5.0, -3.4, -1.8]) b.quad(0.3, 0.42, { x: wx, y: 1.5, z: -0.44, mat: M.glow, color: C.lamp, glow: 1.7 });
  for (const wx of [-5.0, -3.2, -1.4]) b.quad(0.3, 0.42, { x: wx, y: 1.5, z: -2.36, ry: Math.PI, mat: M.glow, color: C.lamp, glow: 1.6 });
  b.quad(0.3, 0.42, { x: 0.31, y: 1.5, z: HZ, ry: Math.PI / 2, mat: M.glow, color: C.lamp, glow: 1.6 });
  b.geo(new THREE.CircleGeometry(0.22, 12), { x: 0.3, y: 3.1, z: HZ, ry: Math.PI / 2, mat: M.glow, color: C.lamp, glow: 1.6 });

  // banners in the realm colour (subtle)
  b.quad(0.16, 0.5, { x: TX + 0.46, y: 3.85, z: HZ, ry: Math.PI / 2, color: accent, mat: M.cloth });
  b.quad(0.16, 0.5, { x: TX, y: 3.85, z: HZ + 0.46, color: accent, mat: M.cloth });
  b.quad(0.12, 0.32, { x: -5.9, y: 2.5, z: 0.205, color: accent, mat: M.cloth });
  b.quad(0.12, 0.32, { x: -1.6, y: 2.5, z: 0.205, color: accent, mat: M.cloth });

  // lanterns, a bench, and people near the doors
  lantern(b, -3.2, h(-3.2, 1.15), 1.15);
  lantern(b, -3.2, 0.52, 0.25);
  lantern(b, -4.9, 0.52, -0.15);
  lantern(b, 2.6, h(2.6, 1.15), 1.15);
  b.box(1.1, 0.07, 0.3, { x: -5.0, y: 0.64, z: 0.05, ry: 0.02, color: C.wood, mat: M.wood });
  b.box(0.06, 0.10, 0.06, { x: -5.45, y: 0.60, z: 0.0, color: C.darkwood, mat: M.wood });
  b.box(0.06, 0.10, 0.06, { x: -4.55, y: 0.60, z: 0.0, color: C.darkwood, mat: M.wood });
  figure(b, { x: -3.9, y: 0.52, z: 0.0, h: 0.34, color: '#a8bfd0', ry: 0.55 });
  figure(b, { x: -2.3, y: 0.52, z: 0.05, h: 0.34, color: '#e2d9c4', ry: -0.4 });
  figure(b, { x: -3.2, y: 0.80, z: 0.7, h: 0.34, color: '#9fb8c8', ry: -0.9 });

  /* ------------------------------- the waterfall ------------------------- */
  // the head wall's face, sampled so the veil follows the real slope
  const FZ = 0.10;
  const FALL = [];
  for (let i = 0; i < 11; i++) {
    const t = i / 10;
    const x = -6.7 - t * 2.8;          // x from -6.7 (pool) to -9.5 (crest)
    FALL.push([x + 0.2, h(x, FZ)]);
  }
  // three layered ribbons of white cloth
  for (const [zs, wd, xd] of [[0.18, 0.75, -0.1], [0.10, 0.95, 0.0], [0.02, 0.85, 0.1]]) {
    fallsRibbon(b, FALL, FZ + zs, wd, xd);
  }
  // a soft glow at the base, and foam
  b.disc(0.9, { x: -7.25, y: 0.31, z: 0.25, mat: M.glow, color: '#c9e0ee', glow: 1.4, seg: 20 });
  b.disc(0.5, { x: -6.85, y: 0.31, z: 0.7, mat: M.glow, color: '#c9e0ee', glow: 1.2, seg: 16 });
  for (const [fx, fz] of [[-7.4, 0.0], [-7.15, 0.6], [-7.6, 0.8]]) {
    b.sphere(0.11, { x: fx, y: 0.38, z: fz, color: '#f2f6f9', mat: M.smooth, seg: 8 });
  }

  /* ------------------------------ static build --------------------------- */
  object.add(b.build());

  /* ------------------------- falling water droplets ---------------------- */
  const N_DROP = 52;
  const drops = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.045, 8, 6),
    solid('#e9f2f6', { roughness: 0.2, metalness: 0, emissive: '#cfe0ea', emissiveIntensity: 0.3 }),
    N_DROP,
  );
  drops.frustumCulled = false;
  drops.castShadow = drops.receiveShadow = false;
  const DB = [FALL[0][0], FALL[0][1], FZ];
  const dropPh = [], dropJx = [], dropJz = [];
  for (let i = 0; i < N_DROP; i++) {
    dropPh.push(rng.range(0, 1));
    dropJx.push(rng.range(-1, 1));
    dropJz.push(rng.range(-1, 1));
    setInst(drops, i, DB[0], DB[1], DB[2]);
  }
  object.add(drops);

  /* ------------------------------ fireflies ------------------------------ */
  const N_FLY = 12;
  const flies = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 6, 5), glowMat('#ffd98a', 2.0), N_FLY);
  flies.frustumCulled = false;
  flies.castShadow = flies.receiveShadow = false;
  const FLY = [[-4.8, 0.9, 0.8, 0.55], [-3.6, 1.0, 0.6, 0.5], [-2.4, 0.9, 1.0, 0.45], [-1.4, 1.2, 1.8, 0.5],
    [-4.0, 1.3, 1.5, 0.6], [-5.2, 1.1, 1.3, 0.45], [-2.0, 1.4, 0.5, 0.5], [-1.0, 1.0, 2.2, 0.5],
    [-5.6, 0.9, 0.4, 0.4], [-3.0, 1.2, 1.2, 0.6], [-4.4, 1.5, 1.9, 0.55], [-6.1, 1.0, 1.6, 0.5]];
  const flyPh = FLY.map(() => rng.range(0, Math.PI * 2));
  for (let i = 0; i < N_FLY; i++) setInst(flies, i, FLY[i][0], FLY[i][1], FLY[i][2]);
  object.add(flies);

  /* ------------------------------ falling leaves ------------------------- */
  const N_LEAF = 16;
  const leaves = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.09, 0.06),
    solid('#c9a24a', { side: THREE.DoubleSide, roughness: 0.85 }),
    N_LEAF,
  );
  leaves.frustumCulled = false;
  leaves.castShadow = leaves.receiveShadow = false;
  const leafA = [];
  for (let i = 0; i < N_LEAF; i++) leafA.push([...crowns[i % crowns.length], rng.range(0, Math.PI * 2)]);
  for (let i = 0; i < N_LEAF; i++) setInst(leaves, i, leafA[i][0], leafA[i][1], leafA[i][2]);
  object.add(leaves);

  function update(t, dt) {
    // the falls flow: droplets loop from the crest to the pool along the fall line
    for (let i = 0; i < N_DROP; i++) {
      const k = (t * 0.62 + dropPh[i]) % 1;
      const s = k * (FALL.length - 1);
      const j = Math.min(FALL.length - 2, Math.floor(s));
      const f = s - j;
      const p = FALL[j], q = FALL[j + 1];
      setInst(drops, i,
        p[0] + (q[0] - p[0]) * f + dropJx[i] * Math.sin(t * 3.2 + dropPh[i] * 9) * 0.2,
        p[1] + (q[1] - p[1]) * f,
        DB[2] + dropJz[i] * Math.sin(t * 2.4 + dropPh[i] * 7) * 0.22);
    }
    drops.instanceMatrix.needsUpdate = true;
    // fireflies drift slowly among the trees
    for (let i = 0; i < N_FLY; i++) {
      const a = FLY[i], ph = t * 0.42 + flyPh[i];
      setInst(flies, i,
        a[0] + Math.sin(ph) * a[3],
        a[1] + Math.sin(ph * 1.7 + flyPh[i] * 1.3) * 0.28,
        a[2] + Math.cos(ph * 1.3) * a[3]);
    }
    flies.instanceMatrix.needsUpdate = true;
    // a few leaves drift down from the birches
    for (let i = 0; i < N_LEAF; i++) {
      const a = leafA[i], k = (t * 0.1 + a[3] * 0.05) % 1;
      setInst(leaves, i,
        a[0] + Math.sin(k * 6 + a[3]) * 0.6,
        a[1] - k * (a[1] - 0.15),
        a[2] + Math.cos(k * 5 + a[3] * 0.7) * 0.5,
        1, k * 9 + a[3], 0.2);
    }
    leaves.instanceMatrix.needsUpdate = true;
  }

  return { object, update };
}
