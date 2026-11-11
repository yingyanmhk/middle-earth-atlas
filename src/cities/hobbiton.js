// Hobbiton — the Shire. One strong idea: round doors in a green hillside,
// a party tree on the hill, and a mill by the water. Warm, low, green, cosy.
import { THREE, Builder, M, C, terrainDisc, fbm, noise2, hash2, bridge } from '../kit.js';
import { figure } from './_ab_util.js';

const STREAM_X = 5.2;   // the water runs along x ≈ 5.2
const WATER_Y = 0.38;

const h = (x, z) => {
  // rolling meadow
  let y = 0.85 * fbm(x * 0.24 + 3.1, z * 0.24 + 7.7, { oct: 4, seed: 11 });
  // the Hill: a soft bump at (-1, -2)
  const dx = x + 1, dz = z + 2;
  y += 2.1 * Math.exp(-(dx * dx + dz * dz) / 10.5);
  // a second low swell south-west (the gardens)
  y += 0.5 * Math.exp(-((x + 4) * (x + 4) + (z + 4.5) * (z + 4.5)) / 22);
  // the stream channel
  const ch = Math.exp(-(((x - STREAM_X) / 0.85) ** 2));
  y -= 1.0 * ch;
  return Math.max(0.14, y);
};

const colorAt = (x, z, y, up) => {
  const inWater = Math.abs(x - STREAM_X) < 0.9 && y < WATER_Y + 0.16;
  if (inWater) return '#3d6f7d';
  const grass = 0x8fae6f;
  const deep = 0x6d8a55;
  const steep = 0x5f7a4c;
  const k = Math.min(1, y / 2.4);
  const j = hash2(Math.round(x * 3), Math.round(z * 3), 5);
  let c;
  if (up < 0.62 && y > 0.4) c = steep;
  else c = Math.round(grass + (deep - grass) * k + (j - 0.5) * 14);
  return '#' + c.toString(16).padStart(6, '0');
};

export default function build({ rng, city, accent }) {
  const b = new Builder();
  const object = new THREE.Group();

  /* ------------------------------- terrain ------------------------------- */
  terrainDisc(b, { r: 10.5, rings: 60, segs: 100, height: h, colorAt, mat: M.stone, seed: 11 });

  /* ------------------------------ the stream ----------------------------- */
  // a long water strip along the channel
  b.box(1.7, 0.05, 19, { x: STREAM_X, y: WATER_Y, z: 0, color: '#2f6377', mat: M.water });
  // a few pebbles in the water
  for (let i = 0; i < 14; i++) {
    const z = rng.range(-8.5, 8.5);
    const off = rng.range(-0.55, 0.55);
    b.sphere(rng.range(0.05, 0.14), { x: STREAM_X + off, y: WATER_Y - 0.03, z, sx: 1.3, sy: 0.5, color: rng.pick(['#7c7468', '#8a8478', '#6e6760']), mat: M.stone, seg: 7 });
  }

  /* --------------------------- dirt path + fence -------------------------- */
  const PATH = [[-0.4, 1.6], [0.5, 0.9], [1.3, 0.1], [2.1, -0.7], [2.9, -1.5], [3.7, -2.2], [4.5, -2.9]];
  const pathMat = M.stone;
  for (let i = 0; i < PATH.length - 1; i++) {
    const a = PATH[i], c = PATH[i + 1];
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const mid = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
    const y = h(mid[0], mid[1]) + 0.03;
    b.box(len, 0.07, 0.75, { x: mid[0], y, z: mid[1], ry: -Math.atan2(c[1] - a[1], c[0] - a[0]), color: '#b39a6b', mat: pathMat });
  }
  // stepping stones across the stream, north of the mill
  for (const sx of [4.3, 4.75, 5.2, 5.65, 6.1]) {
    b.disc(0.24, { x: sx, y: WATER_Y + 0.06, z: -0.4, color: '#9a9184', mat: M.stone, seg: 10 });
  }

  /* ------------------------------ the Hill ------------------------------- */
  const HOLES = [
    { x: -0.7, z: -2.8, ry: 0.45, r: 1.55, door: '#c8a24a' }, // Bag End — the biggest, gold door
    { x: 0.7, z: -1.5, ry: -0.15, r: 1.1, door: '#7aa04a' },
    { x: -1.9, z: -1.3, ry: 1.0, r: 1.05, door: '#4a7aa0' },
    { x: 0.3, z: -3.9, ry: 0.7, r: 1.0, door: '#a04a4a' },
    { x: -1.1, z: 0.0, ry: 0.25, r: 0.95, door: '#8a7a4a' },
    { x: 1.6, z: -0.1, ry: -0.6, r: 0.9, door: '#4a8a5a' },
  ];
  const moundMats = [M.stone, M.flat];
  const smokeEmitters = [];
  for (const hole of HOLES) {
    const { x, z, ry, r, door } = hole;
    // the mound (a half-buried grassy dome)
    b.geo(new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), {
      x, y: r * 0.12, z, sx: r * 1.12, sy: r * 0.95, sz: r * 1.12,
      color: rng.pick(['#7d9a63', '#75925e']), mat: rng.pick(moundMats),
    });
    // the round door: a shallow puck facing outward (ry), leaning back (rx)
    const doorY = r * 0.58;
    const doorPos = [x + Math.cos(ry) * r * 0.88, doorY, z + Math.sin(ry) * r * 0.88];
    b.cyl(r * 0.3, r * 0.32, 0.12, { x: doorPos[0], y: doorPos[1], z: doorPos[2], ry, rx: Math.PI / 2 - 0.52, color: door, mat: M.smooth, seg: 14 });
    // brass knob
    b.sphere(0.055, { x: doorPos[0] + Math.cos(ry) * 0.09, y: doorPos[1], z: doorPos[2] + Math.sin(ry) * 0.09, color: C.gold, mat: M.metal, seg: 8 });
    // a round window above the door: warm light
    b.geo(new THREE.CircleGeometry(r * 0.17, 14), {
      x: x + Math.cos(ry) * r * 0.78, y: doorY + r * 0.5, z: z + Math.sin(ry) * r * 0.78,
      ry, rx: Math.PI / 2 - 0.42, mat: M.glow, color: C.lamp, glow: 1.7,
    });
    // chimney with smoke
    const chim = [x + rng.range(-0.3, 0.3), r * 0.62, z + rng.range(-0.3, 0.3)];
    b.cyl(0.08, 0.1, 0.55, { x: chim[0], y: chim[1], z: chim[2], color: '#6b665f', mat: M.stone, seg: 7 });
    smokeEmitters.push([chim[0], chim[1] + 0.55, chim[2], 0.5, 1]);
    // a little garden in front
    const gx = x + Math.cos(ry) * (r * 1.3), gz = z + Math.sin(ry) * (r * 1.3);
    const gy = h(gx, gz) + 0.02;
    b.box(1.7, 0.04, 1.1, { x: gx, y: gy, z: gz, ry, color: '#6d5a3e', mat: pathMat });
    for (let row = 0; row < 3; row++) {
      b.box(1.4, 0.06, 0.16, { x: gx + Math.cos(ry) * 0.12, y: gy + 0.05, z: gz + Math.sin(ry) * 0.12 + Math.sin(ry) * (row - 1) * 0.26 + Math.cos(ry) * (row - 1) * 0.26, ry, color: rng.pick(['#5f7a4c', '#71905a', '#557a3e']), mat: M.flat });
    }
  }
  // Bag End's little porch step and a lantern by its door
  b.box(1.0, 0.12, 0.5, { x: -0.7 + Math.cos(0.45) * 1.5, y: h(-0.7 + Math.cos(0.45) * 1.5, -2.8 + Math.sin(0.45) * 1.5) + 0.06, z: -2.8 + Math.sin(0.45) * 1.5, ry: 0.45, color: '#8f836b', mat: M.stone });
  lantern(b, -2.2, 1.6);

  /* --------------------------- the party tree ---------------------------- */
  const PT = [-2.2, -4.6];
  const py = h(PT[0], PT[1]);
  b.cyl(0.32, 0.46, 1.8, { x: PT[0], y: py, z: PT[1], color: C.darkwood, mat: M.wood, seg: 10 });
  b.geo(new THREE.IcosahedronGeometry(1, 1), { x: PT[0], y: py + 2.4, z: PT[1], sx: 1.7, sy: 1.55, sz: 1.7, color: C.leaf, mat: M.flat, ry: 0.6 });
  b.geo(new THREE.IcosahedronGeometry(1, 1), { x: PT[0] + 0.8, y: py + 1.9, z: PT[1] + 0.25, sx: 1.15, sy: 1.05, sz: 1.15, color: C.darkleaf, mat: M.flat, ry: 2.2 });
  b.geo(new THREE.IcosahedronGeometry(1, 1), { x: PT[0] - 0.7, y: py + 1.8, z: PT[1] - 0.35, sx: 1.0, sy: 0.95, sz: 1.0, color: '#71905a', mat: M.flat, ry: 3.8 });
  // a lantern hanging from a branch
  b.rod([PT[0] - 0.6, py + 2.1, PT[1] - 0.35], [PT[0] - 1.4, py + 1.2, PT[1] + 0.2], 0.03, { color: C.darkwood, mat: M.wood });
  b.sphere(0.14, { x: PT[0] - 1.4, y: py + 1.05, z: PT[1] + 0.2, mat: M.glow, color: C.lamp, glow: 2.4, seg: 8 });
  // a little bench under the tree, and hobbits
  b.box(1.0, 0.1, 0.28, { x: PT[0] + 0.4, y: py + 0.3, z: PT[1] + 1.2, ry: 0.2, color: C.wood, mat: M.wood });
  b.box(0.08, 0.3, 0.08, { x: PT[0] + 0.1, y: py + 0.15, z: PT[1] + 1.05, color: C.darkwood, mat: M.wood });
  b.box(0.08, 0.3, 0.08, { x: PT[0] + 0.7, y: py + 0.15, z: PT[1] + 1.05, color: C.darkwood, mat: M.wood });
  figure(b, { x: PT[0] + 0.1, y: py + 0.35, z: PT[1] + 1.45, h: 0.34, color: C.terracotta, ry: 0.6 });
  figure(b, { x: PT[0] + 0.75, y: py + 0.35, z: PT[1] + 1.5, h: 0.34, color: '#4a7aa0', ry: -0.3 });

  /* ------------------------------ the mill ------------------------------- */
  const MILL = [STREAM_X - 0.6, 2.2];
  const my = h(MILL[0], MILL[1]);
  b.box(1.5, 1.25, 1.1, { x: MILL[0], y: my, z: MILL[1], color: '#8a5d3d', mat: M.wood });
  // gable roof
  b.geo(GABLE, { x: MILL[0], y: my + 1.25, z: MILL[1], sx: 1.64, sy: 0.55, sz: 1.24, mat: M.flat, color: '#c26a43' });
  // door and window
  b.box(0.5, 0.9, 0.06, { x: MILL[0] + 0.2, y: my + 0.15, z: MILL[1] + 0.56, color: '#4d3426', mat: M.wood });
  b.quad(0.4, 0.36, { x: MILL[0] - 0.35, y: my + 0.55, z: MILL[1] + 0.56, mat: M.glow, color: C.lamp, glow: 1.8 });
  // chimney + smoke
  b.cyl(0.09, 0.11, 0.6, { x: MILL[0] + 0.45, y: my + 1.3, z: MILL[1] - 0.3, color: '#6b665f', mat: M.stone, seg: 7 });
  smokeEmitters.push([MILL[0] + 0.45, my + 1.6, MILL[1] - 0.3, 0.7, 1.6]);
  // sacks of grain by the door
  for (let i = 0; i < 3; i++) {
    b.geo(new THREE.SphereGeometry(0.24, 10, 8), { x: MILL[0] + 0.7 + i * 0.34, y: my + 0.14, z: MILL[1] + 0.4, sx: 1, sy: 0.72, color: rng.pick(['#d9c39a', '#c9b58a', '#e3d5ab']), mat: M.cloth });
  }

  /* ----------------------- the water wheel (animated) --------------------- */
  const wheel = new THREE.Group();
  const wb = new Builder();
  const WR = 0.95;
  wb.torus(WR, 0.07, { x: 0, y: 0, z: 0, mat: M.wood, color: '#6b462c', rseg: 6, tseg: 24 });
  wb.torus(0.55, 0.06, { x: 0, y: 0, z: 0, mat: M.wood, color: '#6b462c', rseg: 6, tseg: 20 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    wb.box(0.16, 0.5, 0.04, { x: 0, y: Math.cos(a) * 0.72, z: Math.sin(a) * 0.72, rx: a, color: '#8a5d3d', mat: M.wood });
  }
  // spokes
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 8;
    wb.box(0.05, 1.9, 0.05, { x: 0, y: 0, z: 0, rx: a, color: '#5a3a24', mat: M.wood });
  }
  wheel.add(wb.build());
  wheel.position.set(STREAM_X + 0.85, WATER_Y + 0.5, MILL[1]);
  object.add(wheel);
  const wheelHub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.7, 10), new THREE.MeshStandardMaterial({ color: '#4d3426', roughness: 0.8 }));
  wheelHub.rotation.x = Math.PI / 2;
  wheelHub.position.set(STREAM_X + 0.85, WATER_Y + 0.5, MILL[1]);
  object.add(wheelHub);

  /* -------------------- fence, scarecrow, haystack, bridge ----------------- */
  // post-and-rail fence along the path's west side
  for (let i = 0; i < PATH.length - 1; i++) {
    const a = PATH[i], c = PATH[i + 1];
    const seg = (i + 1) % 2 === 0 ? -0.75 : 0.75; // alternate sides
    const off = Math.PI / 2 + Math.atan2(c[0] - a[0], c[1] - a[1]);
    const n = Math.max(2, Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) / 1.1));
    for (let j = 0; j <= n; j++) {
      const t = j / n;
      const px = a[0] + (c[0] - a[0]) * t + Math.cos(off) * seg;
      const pz = a[1] + (c[1] - a[1]) * t + Math.sin(off) * seg;
      const fy = h(px, pz);
      b.cyl(0.045, 0.055, 0.55, { x: px, y: fy, z: pz, color: '#8a5d3d', mat: M.wood, seg: 6 });
      if (j < n) {
        const mid = [(px + (a[0] + (c[0] - a[0]) * (t + 1 / n) + Math.cos(off) * seg)) / 2, (pz + (a[1] + (c[1] - a[1]) * (t + 1 / n) + Math.sin(off) * seg)) / 2];
        const segLen = Math.hypot(a[0] + (c[0] - a[0]) * (t + 1 / n) - px, a[1] + (c[1] - a[1]) * (t + 1 / n) - pz);
        b.box(segLen, 0.05, 0.04, { x: mid[0], y: fy + 0.32, z: mid[1], ry: -Math.atan2(c[1] - a[1], c[0] - a[0]), color: '#8a5d3d', mat: M.wood });
      }
    }
  }
  // scarecrow in the west garden
  const SC = [-4.2, 1.6];
  const sy = h(SC[0], SC[1]);
  b.cyl(0.06, 0.08, 1.15, { x: SC[0], y: sy, z: SC[1], color: C.wood, mat: M.wood, seg: 6 });
  b.box(0.9, 0.05, 0.05, { x: SC[0], y: sy + 0.95, z: SC[1], color: C.wood, mat: M.wood });
  b.box(0.3, 0.5, 0.14, { x: SC[0], y: sy + 0.75, z: SC[1], color: '#7a5a3a', mat: M.cloth });
  b.sphere(0.13, { x: SC[0], y: sy + 1.22, z: SC[1], color: '#d7b08c', mat: M.smooth, seg: 8 });
  b.cone(0.28, 0.3, { x: SC[0], y: sy + 1.45, z: SC[1], color: '#8c2f35', mat: M.cloth, seg: 8 });
  // haystack
  const HS = [-3.4, 2.4];
  b.cone(0.75, 0.95, { x: HS[0], y: h(HS[0], HS[1]), z: HS[1], color: '#c9a24a', mat: M.flat, seg: 12 });
  // the stone bridge over the stream
  bridge(b, { from: [4.1, -3.1], to: [6.3, -3.1], w: 0.85, rise: 0.7, color: C.sand, mat: M.stone, rails: true, segments: 8 });

  /* --------------------------- people on the road ------------------------- */
  const walkers = [[0.6, 0.8, 0.6], [2.0, -0.6, -0.4], [3.4, -1.8, 0.4], [4.4, -2.6, -0.3], [-1.2, -0.4, 1.2]];
  for (const [x, z, d] of walkers) {
    const py = h(x, z) + 0.03;
    figure(b, { x, y: py, z, h: 0.32, color: rng.pick(['#7aa04a', '#c26a43', '#4a7aa0', '#c8a24a']), ry: d, arms: 0 });
  }

  /* ------------------------------ smoke puffs ----------------------------- */
  const smoke = [];
  const smokeMat = new THREE.MeshBasicMaterial({ color: '#cfc8ba', transparent: true, opacity: 0.5, depthWrite: false });
  for (let i = 0; i < 18; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), smokeMat.clone());
    m.visible = false;
    object.add(m);
    smoke.push({ m, e: smokeEmitters[i % smokeEmitters.length], off: (i / 18) * 3.2 });
  }

  /* ------------------------------ static build ---------------------------- */
  const staticGroup = b.build();
  object.add(staticGroup);

  function update(t, dt) {
    // the wheel turns
    wheel.rotation.x += dt * 0.55;
    // smoke rises
    for (const p of smoke) {
      const k = (t * 0.14 + p.off) % 1;
      const em = p.e;
      p.m.visible = true;
      p.m.position.set(em[0] + Math.sin(k * 5 + p.off * 9) * 0.22 * k, em[1] + k * 1.6, em[2] + Math.cos(k * 4) * 0.18 * k);
      const sc = 0.5 + k * 1.7;
      p.m.scale.set(sc, sc * 1.25, sc);
      p.m.material.opacity = 0.42 * Math.sin(Math.PI * Math.min(1, k * 1.35));
    }
  }

  return { object, update };
}

/* the mill's gable roof, shared geometry */
const GABLE = (() => {
  const s = new THREE.Shape([new THREE.Vector2(-0.5, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0, 1)]);
  const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
  g.translate(0, 0, -0.5);
  return g;
})();

/* a small lantern post (glow), placed on the terrain */
function lantern(b, x, z) {
  const y = h(x, z);
  b.cyl(0.05, 0.06, 0.9, { x, y, z, color: C.darkwood, mat: M.wood, seg: 6 });
  b.sphere(0.11, { x, y: y + 0.95, z, mat: M.glow, color: C.lamp, glow: 2.2, seg: 8 });
}
