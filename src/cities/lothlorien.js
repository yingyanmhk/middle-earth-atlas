// Lothlórien — the Golden Wood.
// One strong idea: a grove of tall silver-barked mallorn trees with golden
// crowns and elven flets high in the branches; in the clearing the Mirror of
// the Lady glimmers silver-blue; across the little stream, the dark edge of
// Mirkwood. Palette: silver trunks, gold crowns, deep green moss, one cool
// silver glow. Animation: falling leaves, lantern flicker, Mirror shimmer.
import { THREE, Builder, M, C, terrainDisc, fbm, hash2, bridge, rock, Lines, solid, glowMat } from '../kit.js';
import { figure, setInst } from './_ab_util.js';

const STREAM_Z = -4.2;   // the stream runs along z ≈ -4.2
const WATER_Y = 0.16;    // stream surface
const MX = 0.8, MZ = 0.6; // the Mirror of the Lady
const GOLDS = ['#d9b64e', '#c9a24a', '#e3c05a'];

const h = (x, z) => {
  // soft mossy ground, gently undulating
  let y = 0.42 + 0.30 * fbm(x * 0.30 + 2.7, z * 0.30 + 5.3, { oct: 3, seed: 17 });
  // a low swell at the back, under the tallest trees
  y += 0.35 * Math.exp(-(((x + 2.5) ** 2) + (z + 3.2) ** 2) / 30);
  // the clearing is low and flat around the Mirror
  y -= 0.20 * Math.exp(-(((x - MX) ** 2) + (z - MZ) ** 2) / 2.4);
  // the stream channel
  y -= 0.55 * Math.exp(-((z - STREAM_Z) ** 2) / 0.7);
  return Math.max(0.1, y);
};

const colorAt = (x, z, y, up) => {
  // darker moss along the stream banks
  if (Math.abs(z - STREAM_Z) < 0.6 && y < 0.5) {
    return ['#4c6a3c', '#557a3e', '#5a7247'][Math.floor(hash2(Math.round(x * 2), Math.round(z * 2), 3) * 3) % 3];
  }
  // golden leaf-fall patches on the moss
  const j = hash2(Math.round(x * 4), Math.round(z * 4), 23);
  if (j > 0.84 && y < 1.3) return j > 0.93 ? '#e3c05a' : '#d9b64e';
  // deep green where steep or high
  if (up < 0.55 || y > 1.2) {
    return ['#4c6a3c', '#557a3e', '#5f7a4c'][Math.floor(hash2(Math.round(x * 2), Math.round(z * 2), 5) * 3) % 3];
  }
  const k = hash2(Math.round(x * 3), Math.round(z * 3), 7);
  const g = Math.round(0x6f8f5a + (0x8fae6f - 0x6f8f5a) * Math.min(1, y * 0.6) + (k - 0.5) * 16);
  return '#' + Math.max(0x3c5a2e, Math.min(0xa8b57f, g)).toString(16).padStart(6, '0');
};

/* a mallorn: a tall slender silver trunk, a few low branches, a high golden crown */
function mallorn(b, rng, { x, y, z, H }) {
  // the trunk: tall, slender, smooth pale-silver bark
  b.cyl(H * 0.011, H * 0.015, H * 0.60, { x, y, z, color: '#cdd3da', mat: M.smooth, seg: 8 });
  // a few low branches, each tipped with a small golden blossom
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + rng.range(-0.5, 0.5);
    const by = y + H * rng.range(0.36, 0.5);
    const len = H * rng.range(0.14, 0.22);
    b.rod(
      [x + Math.cos(a) * H * 0.012, by, z + Math.sin(a) * H * 0.012],
      [x + Math.cos(a) * len, by + H * rng.range(0.02, 0.08), z + Math.sin(a) * len],
      H * 0.004, { color: '#c7cdd4', mat: M.smooth, seg: 4 },
    );
    b.geo(new THREE.IcosahedronGeometry(1, 0), {
      x: x + Math.cos(a) * len, y: by + H * 0.06, z: z + Math.sin(a) * len,
      sx: H * 0.035, sy: H * 0.03, sz: H * 0.035, color: rng.pick(GOLDS), mat: M.flat, ry: rng.range(0, 6),
    });
  }
  // the high golden crown: one great mass and overlapping smaller ones
  const cy = y + H * 0.66;
  b.geo(new THREE.IcosahedronGeometry(1, 1), {
    x, y: cy, z, sx: H * 0.32, sy: H * 0.28, sz: H * 0.32, color: '#d9b64e', mat: M.flat, ry: rng.range(0, 6),
  });
  for (let i = 0; i < 4; i++) {
    const a = rng.range(0, Math.PI * 2), rr = H * rng.range(0.13, 0.25);
    b.geo(new THREE.IcosahedronGeometry(1, 1), {
      x: x + Math.cos(a) * rr, y: cy + H * rng.range(-0.08, 0.14), z: z + Math.sin(a) * rr,
      sx: H * rng.range(0.12, 0.19), sy: H * rng.range(0.10, 0.16), sz: H * rng.range(0.12, 0.19),
      color: rng.pick(GOLDS), mat: M.flat, ry: rng.range(0, 6),
    });
  }
}

/* a flet: a wooden platform wrapped around the trunk, railing, a tiny shelter */
function flet(b, rng, { x, y, z, ry = 0, accent }) {
  b.push({ x, y, z, ry });
  // the platform
  b.cyl(0.5, 0.54, 0.08, { y: 0, color: C.wood, mat: M.wood, seg: 14 });
  // two diagonal braces under the platform, so it reads as sitting in the branches
  for (const s of [-1, 1]) {
    b.rod([s * 0.06, -0.3, 0], [s * 0.4, 0.02, s * 0.22], 0.03, { color: C.darkwood, mat: M.wood, seg: 4 });
  }
  // railing posts and a light rail
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    b.cyl(0.02, 0.024, 0.24, { x: Math.cos(a) * 0.46, y: 0.08, z: Math.sin(a) * 0.46, color: C.darkwood, mat: M.wood, seg: 5 });
  }
  b.torus(0.46, 0.016, { y: 0.3, rx: Math.PI / 2, color: C.darkwood, mat: M.wood, rseg: 5, tseg: 18 });
  // the little shelter: three posts, a pointed woven canopy, a small banner
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    b.cyl(0.024, 0.03, 0.5, { x: Math.cos(a) * 0.2, y: 0.08, z: Math.sin(a) * 0.2, color: C.darkwood, mat: M.wood, seg: 5 });
  }
  b.cone(0.3, 0.34, { y: 0.58, color: '#b39a6b', mat: M.flat, seg: 8 });
  // a banner pole with a tiny banner in the realm colour
  b.cyl(0.012, 0.014, 0.3, { x: 0.34, y: 0.08, z: 0.02, color: C.darkwood, mat: M.wood, seg: 4 });
  b.quad(0.12, 0.18, { x: 0.34, y: 0.25, z: 0.035, color: accent, mat: M.cloth });
  // an elf keeping watch
  figure(b, { x: 0.3, y: 0.08, z: 0.25, h: 0.26, color: '#d9e4ee' });
  b.pop();
}

/* a dark tree of the Mirkwood edge */
function darkTree(b, rng, { x, y, z, H }) {
  b.cyl(H * 0.022, H * 0.028, H * 0.62, { x, y, z, color: '#333a33', mat: M.smooth, seg: 6 });
  for (let i = 0; i < 3; i++) {
    const a = rng.range(0, Math.PI * 2), rr = H * rng.range(0.1, 0.2);
    b.geo(new THREE.IcosahedronGeometry(1, 1), {
      x: x + Math.cos(a) * rr, y: y + H * rng.range(0.5, 0.72), z: z + Math.sin(a) * rr,
      sx: H * rng.range(0.18, 0.26), sy: H * rng.range(0.16, 0.22), sz: H * rng.range(0.18, 0.26),
      color: rng.pick(['#1f2a24', '#25302b', '#2c352c']), mat: M.flat, ry: rng.range(0, 6),
    });
  }
}

/* the mallorns ring the clearing; the three tall ones at the back carry flets */
const TREES = [
  { x: -7.0, z: -2.9, H: 11.5 },
  { x: -2.7, z: -3.6, H: 13.0, flet: true },
  { x: 2.9, z: -3.6, H: 12.0, flet: true },
  { x: 6.4, z: -3.5, H: 10.5, flet: true },
  { x: 8.4, z: 1.4, H: 8.5 },
  { x: 7.4, z: 4.2, H: 7.5 },
  { x: 3.6, z: 6.2, H: 6.5 },
  { x: -1.2, z: 6.6, H: 6.5 },
  { x: -5.6, z: 5.0, H: 7.5 },
  { x: -8.2, z: 0.9, H: 9.5 },
  { x: -2.6, z: 3.9, H: 6.5 },
];

/* the dark edge across the stream, at the very back */
const DARK = [
  { x: -7.9, z: -5.6, H: 4.6 },
  { x: -1.9, z: -7.4, H: 5.0 },
  { x: 7.2, z: -6.5, H: 4.2 },
  { x: -8.7, z: -4.6, H: 4.4 },
  { x: 9.2, z: -4.7, H: 3.6 },
  { x: -4.3, z: -7.1, H: 3.8 },
];

export default function build({ rng, city, accent }) {
  const b = new Builder();
  const object = new THREE.Group();

  /* ------------------------------- terrain ------------------------------- */
  terrainDisc(b, { r: 10.5, rings: 56, segs: 96, height: h, colorAt, mat: M.stone, seed: 31 });

  /* ------------------------------- the stream ---------------------------- */
  b.box(18.6, 0.05, 0.62, { x: 0, y: WATER_Y, z: STREAM_Z, color: '#2f6377', mat: M.water });
  // pebbles in the water
  for (let i = 0; i < 10; i++) {
    const x = rng.range(-8.5, 8.5);
    b.sphere(rng.range(0.05, 0.11), {
      x, y: WATER_Y - 0.025, z: STREAM_Z + rng.range(-0.16, 0.16),
      sx: 1.4, sy: 0.6, color: rng.pick(['#8a8478', '#7c7468', '#9a9184']), mat: M.smooth, seg: 7,
    });
  }

  /* ------------------------------ the bridge ----------------------------- */
  bridge(b, {
    from: [-2.3, h(-2.3, -3.6) + 0.05, -3.6],
    to: [-2.3, h(-2.3, -4.8) + 0.05, -4.8],
    w: 0.7, rise: 0.3, color: '#c9c3b4', mat: M.stone, rails: true, segments: 7,
  });

  /* ------------------------------- the path ------------------------------ */
  const PATH = [[0.9, 6.4], [0.85, 4.6], [0.8, 2.9], [0.8, 1.7]];
  const PATH_W = [[0.8, 1.7], [-0.9, 1.5], [-2.2, 1.0]];
  const PATH_B = [[-2.2, 1.0], [-2.25, -2.0], [-2.3, -3.5]];
  for (const P of [PATH, PATH_W, PATH_B]) {
    for (let i = 0; i < P.length - 1; i++) {
      const a = P[i], c = P[i + 1];
      const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
      const mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2;
      b.box(len, 0.06, 0.55, {
        x: mx, y: h(mx, mz) + 0.03, z: mz,
        ry: Math.atan2(c[1] - a[1], c[0] - a[0]), color: '#9a8a63', mat: M.stone,
      });
    }
  }

  /* ------------------------------ mossy rocks ---------------------------- */
  rock(b, { x: 5.4, y: h(5.4, -2.2), z: -2.2, r: 0.5, h: 0.9, color: '#5f6f55', rand: rng, detail: 1 });
  rock(b, { x: -5.2, y: h(-5.2, -3.2), z: -3.2, r: 0.45, h: 0.8, color: '#6d7868', rand: rng, detail: 1 });
  rock(b, { x: 4.3, y: h(4.3, -4.5), z: -4.5, r: 0.4, h: 0.7, color: '#7a8272', rand: rng, detail: 1 });
  rock(b, { x: -0.4, y: h(-0.4, -4.3), z: -4.3, r: 0.35, h: 0.6, color: '#55654f', rand: rng, detail: 1 });

  /* ------------------------------- the mallorns -------------------------- */
  for (const t of TREES) mallorn(b, rng, { x: t.x, y: h(t.x, t.z), z: t.z, H: t.H });

  /* ------------------------------- the flets ----------------------------- */
  const fletSites = TREES.filter((t) => t.flet);
  for (const t of fletSites) flet(b, rng, { x: t.x, y: h(t.x, t.z) + t.H * 0.52, z: t.z, accent });

  /* ------------------------- the Mirror of the Lady ---------------------- */
  const gy = h(MX, MZ);
  // a low stone basin with a ring rim
  b.cyl(0.62, 0.8, 0.26, { x: MX, y: gy, z: MZ, open: true, color: '#9aa3ad', mat: M.smooth, seg: 20 });
  // a faint silver-blue glow beneath the dark water (the pool bed)
  b.disc(0.78, { x: MX, y: gy + 0.012, z: MZ, mat: M.glow, color: '#a8cfe6', glow: 1.2, seg: 20 });
  b.ring(0.5, 0.62, { x: MX, y: gy + 0.26, z: MZ, color: '#8a93a0', mat: M.smooth, seg: 24 });
  b.disc(0.48, { x: MX, y: gy + 0.27, z: MZ, mat: M.water, color: '#1d3441', seg: 22 });
  // a faint silver glow around the rim
  b.ring(0.63, 0.76, { x: MX, y: gy + 0.265, z: MZ, mat: M.glow, color: '#a8cfe6', glow: 1.25, seg: 24 });
  // pale stones around the basin
  for (let i = 0; i < 4; i++) {
    const a = rng.range(0, Math.PI * 2), rr = rng.range(0.85, 1.15);
    const sx = MX + Math.cos(a) * rr, sz = MZ + Math.sin(a) * rr;
    b.sphere(rng.range(0.05, 0.09), {
      x: sx, y: h(sx, sz) + 0.02, z: sz, sx: 1.3, sy: 0.7, color: '#aab3bd', mat: M.smooth, seg: 7,
    });
  }
  // elves by the Mirror, and travellers on the path and bridge
  figure(b, { x: MX - 0.5, y: gy, z: MZ + 0.4, h: 0.28, color: '#cfe3ee', ry: 0.4 });
  figure(b, { x: MX + 0.52, y: gy, z: MZ + 0.34, h: 0.28, color: '#d9e4ee', ry: -0.3 });
  figure(b, { x: MX + 0.03, y: gy, z: MZ - 0.55, h: 0.35, color: '#a9c3d4', ry: Math.PI });
  figure(b, { x: 0.85, y: h(0.85, 3.5) + 0.03, z: 3.5, h: 0.33, color: '#cfe3ee', ry: -0.2 });
  figure(b, { x: -2.3, y: h(-2.3, -4.2) + 0.5, z: -4.2, h: 0.32, color: '#d9e4ee', ry: 0.2 });

  /* --------------------- lantern posts by the path ----------------------- */
  // (the glowing lamps themselves are animated, added later)
  for (const [gx, gz] of [[-0.9, 1.0], [-2.2, 1.0]]) {
    b.cyl(0.03, 0.04, 0.8, { x: gx, y: h(gx, gz), z: gz, color: C.darkwood, mat: M.wood, seg: 6 });
  }

  /* ----------------------- the dark edge of Mirkwood --------------------- */
  for (const t of DARK) darkTree(b, rng, { x: t.x, y: h(t.x, t.z), z: t.z, H: t.H });

  /* ------------------------- fallen leaves on the moss ------------------- */
  for (const t of TREES) {
    const lx = t.x + rng.range(-0.9, 0.9), lz = t.z + rng.range(-0.9, 0.9);
    b.plane(0.11, 0.075, {
      x: lx, y: h(lx, lz) + 0.02, z: lz, ry: rng.range(0, 6), color: rng.pick(GOLDS), mat: M.flat,
    });
  }

  /* ------------------------------ static build --------------------------- */
  object.add(b.build());

  /* ------------------------- rope ladders from the flets ----------------- */
  const ladders = new Lines();
  for (const t of fletSites) {
    const g2 = h(t.x, t.z);
    const topY = g2 + t.H * 0.52 + 0.08;
    const gY = g2 + 0.03;
    const z0 = t.z + 0.46, z1 = t.z + 0.59;
    ladders.seg([t.x, topY, z0], [t.x, gY, z0], '#4d3426');
    ladders.seg([t.x, topY, z1], [t.x, gY, z1], '#4d3426');
    const n = Math.max(8, Math.round((topY - gY) / 0.42));
    for (let i = 1; i < n; i++) {
      const yy = gY + (topY - gY) * (i / n);
      ladders.seg([t.x, yy, z0], [t.x, yy, z1], '#4d3426');
    }
  }
  object.add(ladders.build());

  /* -------------------------- falling golden leaves ---------------------- */
  const N_LEAF = 26;
  const leaves = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.11, 0.07),
    solid('#ffffff', { side: THREE.DoubleSide, roughness: 0.8, vertexColors: true }),
    N_LEAF,
  );
  leaves.frustumCulled = false;
  leaves.castShadow = leaves.receiveShadow = false;
  const leafA = [];
  for (let i = 0; i < N_LEAF; i++) {
    const t = TREES[i % TREES.length];
    const [ox, oz] = rng.inDisc(0.8);
    // [x, spawnY (just under the crown), z, phase, fall speed]
    leafA.push([t.x + ox, h(t.x, t.z) + t.H * 0.6, t.z + oz, rng.range(0, Math.PI * 2), rng.range(0.06, 0.12)]);
  }
  for (let i = 0; i < N_LEAF; i++) {
    setInst(leaves, i, leafA[i][0], leafA[i][1], leafA[i][2], 1, rng.range(0, Math.PI * 2));
    leaves.setColorAt(i, new THREE.Color(rng.pick(GOLDS)));
  }
  leaves.instanceColor.needsUpdate = true;
  object.add(leaves);

  /* -------------------- warm lanterns on the flets (flicker) ------------- */
  const fletLantern = glowMat('#ffc477', 1.9);
  const fletBase = new THREE.Color('#ffc477').multiplyScalar(1.9);
  for (const t of fletSites) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), fletLantern);
    m.position.set(t.x, h(t.x, t.z) + t.H * 0.52 + 0.5, t.z);
    object.add(m);
  }

  /* --------------------- lanterns by the path (flicker) ------------------ */
  const groundLantern = glowMat('#ffc477', 1.7);
  const groundBase = new THREE.Color('#ffc477').multiplyScalar(1.7);
  for (const [gx, gz] of [[-0.9, 1.0], [-2.2, 1.0]]) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), groundLantern);
    m.position.set(gx, h(gx, gz) + 0.86, gz);
    object.add(m);
  }

  /* -------------------- the Mirror's cool silver shimmer ----------------- */
  const shimmerBase = new THREE.Color('#a8cfe6').multiplyScalar(1.5);
  const shimmerMat = glowMat('#a8cfe6', 1.5, { transparent: true, opacity: 0.7, depthWrite: false });
  const shimmer = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), shimmerMat);
  shimmer.rotation.x = -Math.PI / 2;
  shimmer.position.set(MX, gy + 0.285, MZ);
  object.add(shimmer);

  function update(t, dt) {
    // golden leaves drift down from the crowns and loop
    for (let i = 0; i < N_LEAF; i++) {
      const a = leafA[i];
      const k = (t * a[4] + a[3] * 0.02) % 1;
      setInst(leaves, i,
        a[0] + Math.sin(k * 7 + a[3]) * 0.55,
        a[1] - k * (a[1] - 0.22),
        a[2] + Math.cos(k * 6 + a[3] * 0.7) * 0.5,
        1, k * 9 + a[3], 0.3);
    }
    leaves.instanceMatrix.needsUpdate = true;
    // lanterns flicker gently in the evening air
    const fk = 1 + 0.14 * Math.sin(t * 2.1);
    fletLantern.color.setRGB(fletBase.r * fk, fletBase.g * fk, fletBase.b * fk);
    const gk = 1 + 0.16 * Math.sin(t * 1.6 + 1.1);
    groundLantern.color.setRGB(groundBase.r * gk, groundBase.g * gk, groundBase.b * gk);
    // the Mirror shimmers silver-blue
    const mk = 0.68 + 0.32 * Math.sin(t * 1.2);
    shimmerMat.color.setRGB(shimmerBase.r * mk, shimmerBase.g * mk, shimmerBase.b * mk);
    shimmerMat.opacity = 0.55 + 0.3 * Math.sin(t * 0.9 + 0.6);
  }

  return { object, update };
}
