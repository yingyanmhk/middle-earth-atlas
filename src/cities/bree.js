// Bree — a snug hill village of Men (and hobbits) behind a tall hedge.
// One strong idea: a green hedge-ring on a gentle hill, the Prancing Pony
// glowing warm at the top of the street — an evening refuge on the road.
import { THREE, Builder, M, C, terrainDisc, fbm, hash2, house, tree } from '../kit.js';
import { figure } from './_ab_util.js';

const GATE_A = 0.62;    // hedge gap / where the road leaves the ring (radians)
const HEDGE_R = 8.35;   // outer bush-ring radius
const INN = [1.3, 1.2]; // inn centre, near the hilltop
const INN_RY = 0.99;    // inn yaw — its front (+local Z) faces the street

/* ------------------------------- terrain -------------------------------- */
const h = (x, z) => {
  let y = 0.3 + 0.3 * fbm(x * 0.3 + 2.1, z * 0.3 + 4.7, { oct: 4, seed: 23 });
  const dx = x - 0.7, dz = z - 0.9;
  y += 1.55 * Math.exp(-(dx * dx + dz * dz) / 24);                       // the village hill
  y += 0.35 * Math.exp(-((x + 2.5) ** 2 + (z - 3.4) ** 2) / 30);         // a shoulder behind
  return Math.max(0.12, y);
};

const colorAt = (x, z, y, up) => {
  const grass = 0x93a968, deep = 0x6d8a55, dark = 0x5f7a4c;
  const j = hash2(Math.round(x * 4), Math.round(z * 4), 7);
  let c;
  if (up < 0.6 && y > 0.55) c = dark;
  else c = Math.round(grass + (deep - grass) * Math.min(1, y / 2.5) + (j - 0.5) * 16);
  return '#' + c.toString(16).padStart(6, '0');
};

/* gable roof whose ridge runs along the local X axis (the kit GABLE runs along Z) */
const GABLEX = (() => {
  const s = new THREE.Shape([new THREE.Vector2(-0.5, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0, 1)]);
  const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
  g.translate(0, 0, -0.5);
  g.rotateY(Math.PI / 2);
  return g;
})();

const BUSH = ['#3f5d3f', '#41613f', '#4a6a3e', '#556f42', '#48663f'];
const THATCH = ['#c9a24a', '#d9b64e', '#c2a052', '#b58f3e'];
const WALLS = ['#e8dcc0', '#c9b58a', '#b5a88e', '#d8c39a', '#e0d2b4'];

/* a hedge bush: a faceted green blob, bottom sitting on the ground */
function bush(b, rng, { x, z, hgt }) {
  const y = h(x, z);
  const rad = hgt * rng.range(0.46, 0.6);
  b.geo(new THREE.IcosahedronGeometry(1, 0), {
    x, y: y + hgt * 0.52, z,
    sx: rad, sy: hgt, sz: rad,
    color: rng.pick(BUSH), mat: M.flat, ry: rng.range(0, 6),
  });
}

/* a round-door hobbit hole burrowed into the low slope, facing the village */
function hole(b, rng, { x, z, r = 1.05, door = '#c8a24a' }) {
  const y = h(x, z);
  const ry = Math.atan2(-z, -x);
  b.geo(new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), {
    x, y: y + r * 0.1, z, sx: r * 1.1, sy: r * 0.95, sz: r * 1.1,
    color: rng.pick(['#7d9a63', '#75925e', '#6d8a55']), mat: M.stone,
  });
  const dp = [x + Math.cos(ry) * r * 0.85, y + r * 0.55, z + Math.sin(ry) * r * 0.85];
  b.cyl(r * 0.28, r * 0.3, 0.12, { x: dp[0], y: dp[1], z: dp[2], ry, rx: Math.PI / 2 - 0.5, color: door, mat: M.smooth, seg: 12 });
  b.geo(new THREE.CircleGeometry(r * 0.15, 12), {
    x: x + Math.cos(ry) * r * 0.72, y: y + r * 0.62, z: z + Math.sin(ry) * r * 0.72,
    ry, rx: Math.PI / 2 - 0.42, mat: M.glow, color: C.lamp, glow: 1.7,
  });
}

/* a small street lantern (post + glow) */
function lantern(b, x, z, hgt = 0.85) {
  const y = h(x, z);
  b.cyl(0.04, 0.05, hgt, { x, y, z, color: C.darkwood, mat: M.wood, seg: 6 });
  b.sphere(0.1, { x, y: y + hgt + 0.03, z, mat: M.glow, color: C.lamp, glow: 2.0, seg: 8 });
}

export default function build({ rng, city, accent }) {
  const b = new Builder();
  const object = new THREE.Group();

  /* ------------------------------- terrain ------------------------------- */
  terrainDisc(b, { r: 10.5, rings: 56, segs: 96, height: h, colorAt, mat: M.stone, seed: 23 });

  /* ------------------------- the hedge ring (with gap) ------------------- */
  for (let ring = 0; ring < 2; ring++) {
    const R = ring === 0 ? HEDGE_R : HEDGE_R - 0.55;
    for (let a = ring * 0.075; a < Math.PI * 2; a += 0.15) {
      const dd = Math.abs(((a - GATE_A + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (dd < 0.6) continue;                       // the gate gap
      const nearGate = 1 - Math.min(1, dd / 1.4);
      const x = Math.cos(a) * R + rng.range(-0.3, 0.3);
      const z = Math.sin(a) * R + rng.range(-0.3, 0.3);
      bush(b, rng, { x, z, hgt: rng.range(1.6, 2.2) * (1 - nearGate * 0.1) });
    }
  }
  // two taller bushes frame the entrance like gateposts
  for (const s of [-1, 1]) {
    const a = GATE_A + s * 0.62;
    bush(b, rng, { x: Math.cos(a) * HEDGE_R, z: Math.sin(a) * HEDGE_R, hgt: 2.5 });
  }
  // a few bushes just inside / outside for an organic edge
  for (let i = 0; i < 10; i++) {
    const a = rng.range(0, Math.PI * 2);
    if (Math.abs(((a - GATE_A + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 0.75) continue;
    const R = rng.chance(0.5) ? rng.range(6.7, 7.7) : rng.range(8.9, 9.3);
    bush(b, rng, { x: Math.cos(a) * R, z: Math.sin(a) * R, hgt: rng.range(1.1, 1.6) });
  }

  /* --------------------------- the street -------------------------------- */
  const ROAD = [[7.95, 5.75], [6.9, 4.9], [5.9, 4.1], [5.0, 3.3], [4.0, 2.6], [3.1, 2.0], [2.3, 1.8]];
  for (let i = 0; i < ROAD.length - 1; i++) {
    const a = ROAD[i], c = ROAD[i + 1];
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2;
    b.box(len, 0.07, 0.85, {
      x: mx, y: h(mx, mz) + 0.03, z: mz,
      ry: -Math.atan2(c[1] - a[1], c[0] - a[0]), color: '#b39a6b', mat: M.stone,
    });
  }

  /* --------------------------- the wooden gate --------------------------- */
  const GP = [6.7, 4.85];
  const gPerp = [0.55, -0.83]; // perpendicular to the road
  for (const s of [-1, 1]) {
    const px = GP[0] + gPerp[0] * 0.55 * s, pz = GP[1] + gPerp[1] * 0.55 * s;
    const py = h(px, pz);
    b.cyl(0.05, 0.065, 1.0, { x: px, y: py, z: pz, color: C.darkwood, mat: M.wood, seg: 7 });
  }
  const p1 = [GP[0] - gPerp[0] * 0.55, GP[1] - gPerp[1] * 0.55];
  const p2 = [GP[0] + gPerp[0] * 0.55, GP[1] + gPerp[1] * 0.55];
  const railY = h(GP[0], GP[1]) + 0.55;
  b.rod([p1[0], railY, p1[1]], [p2[0], railY, p2[1]], 0.045, { color: C.darkwood, mat: M.wood });
  b.rod([p1[0], railY - 0.28, p1[1]], [p2[0], railY - 0.42, p2[1]], 0.035, { color: C.darkwood, mat: M.wood });

  /* ------------------------------- houses -------------------------------- */
  const HOUSES = [
    { x: -0.9, z: 3.1, w: 1.3, d: 1.2, h: 1.5, ry: 0.9 },
    { x: 1.9, z: 3.9, w: 1.2, d: 1.3, h: 1.4, ry: 0.2 },
    { x: 3.9, z: -0.7, w: 1.5, d: 1.3, h: 1.6, ry: 1.1 },
    { x: 1.9, z: -2.2, w: 1.4, d: 1.2, h: 1.4, ry: 1.9 },
    { x: -2.3, z: 1.9, w: 1.2, d: 1.2, h: 1.4, ry: 2.6 },
    { x: -3.0, z: -0.6, w: 1.4, d: 1.3, h: 1.5, ry: 2.9 },
    { x: -0.1, z: -3.1, w: 1.3, d: 1.2, h: 1.4, ry: 1.5 },
  ];
  for (const p of HOUSES) {
    house(b, {
      x: p.x, y: h(p.x, p.z), z: p.z, w: p.w, d: p.d, h: p.h, ry: p.ry,
      roof: 'gable', wall: rng.pick(WALLS), roofColor: rng.pick(THATCH),
      roofH: rng.range(0.5, 0.65), win: true, lit: 0.75, r: rng,
    });
  }

  /* ---------------------------- sheds + garden --------------------------- */
  for (const p of [{ x: 3.6, z: 4.4, ry: 0.5 }, { x: -2.6, z: -2.5, ry: 1.1 }]) {
    const y = h(p.x, p.z);
    b.box(1.0, 0.7, 0.8, { x: p.x, y, z: p.z, ry: p.ry, color: '#a9885e', mat: M.wood });
    b.box(1.14, 0.09, 0.92, { x: p.x, y: y + 0.72, z: p.z, ry: p.ry, color: rng.pick(THATCH), mat: M.flat });
  }
  // the vegetable garden, below the inn
  b.push({ x: -0.5, y: h(-0.5, -1.2), z: -1.2, ry: 0.35 });
  b.box(1.7, 0.1, 1.1, { y: 0.02, color: '#6d5a3e', mat: M.stone });
  for (let i = 0; i < 4; i++) {
    b.box(1.4, 0.06, 0.17, { y: 0.07, z: (i - 1.5) * 0.24, color: rng.pick(['#5f7a4c', '#71905a', '#557a3e', '#7d9a63']), mat: M.flat });
  }
  b.pop();

  /* ------------------------- haystacks + the well ------------------------ */
  for (const [hx, hz] of [[2.9, -4.2], [-4.1, -2.7], [0.2, 4.5]]) {
    const hy = h(hx, hz);
    b.cone(0.55, 0.8, { x: hx, y: hy, z: hz, color: '#c9a24a', mat: M.flat, seg: 10 });
    b.cone(0.28, 0.32, { x: hx + 0.08, y: hy + 0.62, z: hz - 0.05, color: '#d9b64e', mat: M.flat, seg: 8 });
  }
  const WX = 4.9, WZ = 0.6;
  const wy = h(WX, WZ);
  b.torus(0.22, 0.07, { x: WX, y: wy + 0.12, z: WZ, sx: 1, sy: 0.8, sz: 1, color: '#9a9184', mat: M.stone, rseg: 6, tseg: 14 });
  b.disc(0.15, { x: WX, y: wy + 0.09, z: WZ, color: '#3d6f7d', mat: M.water, seg: 12 });
  for (const s of [-1, 1]) b.cyl(0.035, 0.045, 0.6, { x: WX + s * 0.26, y: wy + 0.15, z: WZ, color: C.darkwood, mat: M.wood, seg: 6 });
  b.cone(0.48, 0.4, { x: WX, y: wy + 0.75, z: WZ, color: '#8a5d3d', mat: M.wood, seg: 10 });

  /* --------------------- hobbit holes on the low slope ------------------- */
  for (const p of [
    { x: 5.3, z: -4.6, r: 1.0, door: '#c8a24a' },
    { x: -5.0, z: -3.8, r: 1.05, door: '#7aa04a' },
    { x: -5.6, z: 3.6, r: 1.0, door: '#4a7aa0' },
    { x: 5.8, z: -1.9, r: 1.0, door: '#a04a4a' },
  ]) hole(b, rng, p);

  /* ------------------------------- trees --------------------------------- */
  for (const [tx, tz, th] of [[-3.6, 2.9, 2.0], [5.0, 5.2, 1.9], [-2.2, -3.7, 1.9], [3.6, -3.2, 2.1]]) {
    tree(b, { x: tx, y: h(tx, tz), z: tz, h: th, kind: 'round', color: rng.pick(['#71905a', '#7d9a63']), r: rng });
  }
  for (const [tx, tz, th] of [[7.0, -5.5, 2.3], [-6.8, -6.2, 2.4], [-7.5, 4.8, 2.3], [6.4, 7.1, 2.2]]) {
    tree(b, { x: tx, y: h(tx, tz), z: tz, h: th, kind: 'round', color: rng.pick(['#41613f', '#55703f', '#71905a']), r: rng });
  }

  /* --------------------- fence along the street -------------------------- */
  const FPTS = [[5.0, 3.3], [4.0, 2.6], [3.1, 2.0]];
  const fOff = [0.57, -0.82];
  for (const s of [-1, 1]) {
    for (let i = 0; i < FPTS.length; i++) {
      const px = FPTS[i][0] + fOff[0] * 0.62 * s, pz = FPTS[i][1] + fOff[1] * 0.62 * s;
      const py = h(px, pz);
      b.cyl(0.035, 0.045, 0.55, { x: px, y: py, z: pz, color: C.wood, mat: M.wood, seg: 6 });
      if (i < FPTS.length - 1) {
        const qx = FPTS[i + 1][0] + fOff[0] * 0.62 * s, qz = FPTS[i + 1][1] + fOff[1] * 0.62 * s;
        const len = Math.hypot(qx - px, qz - pz);
        b.box(len, 0.04, 0.03, {
          x: (px + qx) / 2, y: h((px + qx) / 2, (pz + qz) / 2) + 0.34, z: (pz + qz) / 2,
          ry: -Math.atan2(qz - pz, qx - px), color: C.wood, mat: M.wood,
        });
      }
    }
  }

  /* ------------------------------ lanterns ------------------------------- */
  lantern(b, 4.4, 3.6);
  lantern(b, 6.1, 4.3);
  lantern(b, 2.6, 2.2, 0.95);

  /* ------------------------------- the inn ------------------------------- */
  const iy = h(INN[0], INN[1]);
  b.push({ x: INN[0], y: iy, z: INN[1], ry: INN_RY });
  // stone foundation, stone lower floor, timber-and-plaster upper floor
  b.box(3.7, 0.3, 2.5, { y: 0, color: '#a49c8c', mat: M.stone });
  b.box(3.5, 1.5, 2.3, { y: 0.3, color: '#b5a88e', mat: M.stone });
  b.box(3.5, 1.3, 2.3, { y: 1.8, color: '#e8dcc0', mat: M.stone });
  b.box(3.52, 0.09, 2.32, { y: 1.78, color: '#5a3a24', mat: M.wood }); // band between floors
  for (const [cx, cz] of [[-1.75, -1.15], [1.75, -1.15], [-1.75, 1.15], [1.75, 1.15]]) {
    b.box(0.11, 1.3, 0.11, { x: cx, y: 1.8, z: cz, color: '#5a3a24', mat: M.wood }); // upper corner posts
  }
  // the big gable roof (ridge across the street, slopes over the porch side)
  b.geo(GABLEX, { y: 3.1, sx: 3.64, sy: 1.1, sz: 2.44, mat: M.flat, color: '#8a5d3d' });
  // chimney (stone) — its top is the smoke emitter
  b.cyl(0.09, 0.11, 0.8, { x: 1.45, y: 3.05, z: -1.12, color: '#6b665f', mat: M.stone, seg: 7 });
  const chim = [
    INN[0] + 1.45 * Math.cos(INN_RY) - 1.12 * Math.sin(INN_RY),
    iy + 3.85,
    INN[1] - 1.45 * Math.sin(INN_RY) - 1.12 * Math.cos(INN_RY),
  ];
  // warm windows — the street face glows
  for (const [wx, wy_] of [[-1.05, 1.0], [0.0, 1.0], [1.05, 1.0], [-1.05, 2.15], [0.0, 2.15], [1.05, 2.15]]) {
    b.quad(0.34, 0.5, { x: wx, y: 0.3 + wy_, z: 1.16, mat: M.glow, color: C.lamp, glow: 1.7 });
  }
  for (const wy_ of [1.05, 2.2]) {
    b.quad(0.3, 0.45, { x: 1.76, y: 0.3 + wy_, z: 0.2, ry: Math.PI / 2, mat: M.glow, color: C.lamp, glow: 1.6 });
    b.quad(0.3, 0.45, { x: -1.76, y: 0.3 + wy_, z: -0.2, ry: -Math.PI / 2, mat: M.glow, color: C.lamp, glow: 1.6 });
  }
  for (const wx of [-0.9, 0.9]) b.quad(0.3, 0.45, { x: wx, y: 1.35, z: -1.16, ry: Math.PI, mat: M.glow, color: C.lamp, glow: 1.5 });
  // the open front door — warm light spilling out
  b.quad(0.72, 1.3, { x: 0, y: 0.95, z: 1.17, mat: M.glow, color: C.lamp, glow: 1.8 });
  for (const s of [-1, 1]) b.box(0.38, 1.3, 0.04, { x: s * 0.4, y: 0.95, z: 1.24, ry: s * 0.28, color: '#4d3426', mat: M.wood });
  b.box(0.86, 0.07, 0.07, { x: 0, y: 1.64, z: 1.16, color: '#4d3426', mat: M.wood }); // lintel
  // porch: stoop + steps following the slope, posts, roof, sign, lantern
  b.box(2.2, 0.16, 0.7, { x: 0, y: -0.3, z: 1.35, color: '#8a5d3d', mat: M.wood }); // stoop
  for (const [sz, sy] of [[1.8, -0.42], [2.05, -0.54], [2.3, -0.66]]) {
    b.box(1.6, 0.16, 0.26, { x: 0, y: sy, z: sz, color: '#8a5d3d', mat: M.wood });
  }
  for (const px of [-0.95, 0.95]) b.cyl(0.05, 0.06, 2.06, { x: px, y: -0.12, z: 1.35, color: C.darkwood, mat: M.wood, seg: 6 });
  b.box(2.6, 0.08, 1.05, { x: 0, y: 1.95, z: 1.5, color: '#4d3426', mat: M.wood }); // porch roof
  // the hanging sign (a small painted board — no letters)
  b.rod([0.8, 1.92, 2.02], [0.8, 1.62, 2.02], 0.02, { color: C.darkwood, mat: M.wood });
  b.rod([1.2, 1.92, 2.02], [1.2, 1.62, 2.02], 0.02, { color: C.darkwood, mat: M.wood });
  b.box(0.5, 0.34, 0.05, { x: 1.0, y: 1.48, z: 2.06, color: '#4a2f1d', mat: M.wood }); // board
  b.box(0.24, 0.18, 0.02, { x: 1.0, y: 1.48, z: 2.08, color: accent, mat: M.smooth }); // painted plate
  // a lantern hanging from the porch roof
  b.rod([1.35, 1.92, 2.02], [1.35, 1.66, 2.02], 0.018, { color: C.darkwood, mat: M.wood });
  b.sphere(0.09, { x: 1.35, y: 1.6, z: 2.02, mat: M.glow, color: C.lamp, glow: 2.1, seg: 8 });
  // barrels by the stoop
  for (const s of [-1, 1]) b.cyl(0.13, 0.15, 0.34, { x: s * 0.95, y: -0.2, z: 1.15, color: '#8a5d3d', mat: M.wood, seg: 8 });
  b.pop();

  /* ------------------------------ people --------------------------------- */
  const PEOPLE = [
    { x: 5.3, z: 3.7, h: 0.5, color: '#4a5a6b', ry: -2.5 },   // a Man striding up the road
    { x: 3.4, z: 2.9, h: 0.32, color: '#7aa04a', ry: -2.2 },  // a hobbit on the road
    { x: 2.5, z: 2.1, h: 0.5, color: '#8a5d3d', ry: -0.9 },   // at the inn door
    { x: 1.0, z: 3.3, h: 0.32, color: '#c26a43', ry: 0.6 },   // by the north house
    { x: 4.3, z: 0.3, h: 0.5, color: '#5a6270', ry: 0.4 },    // at the well
    { x: -0.9, z: -1.6, h: 0.32, color: '#4a7aa0', ry: 0.2 }, // at the garden
    { x: -2.0, z: 2.4, h: 0.5, color: '#c9b58a', ry: -1.1 },  // near the west house
    { x: 0.4, z: -3.6, h: 0.32, color: '#a04a4a', ry: 1.3 },  // by the south house
  ];
  for (const p of PEOPLE) figure(b, { x: p.x, y: h(p.x, p.z) + 0.02, z: p.z, h: p.h, color: p.color, ry: p.ry });

  /* ------------------------------ static build --------------------------- */
  object.add(b.build());

  /* ------------------------------ smoke ---------------------------------- */
  const smoke = [];
  const smokeMat = new THREE.MeshBasicMaterial({ color: '#cfc8ba', transparent: true, opacity: 0.5, depthWrite: false });
  for (let i = 0; i < 12; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), smokeMat.clone());
    m.visible = false;
    object.add(m);
    smoke.push({ m, e: chim, off: (i / 12) * 3.2 });
  }

  function update(t, dt) {
    // one chimney's smoke, rising calm and slow
    for (const p of smoke) {
      const k = (t * 0.14 + p.off) % 1;
      const em = p.e;
      p.m.visible = true;
      p.m.position.set(
        em[0] + Math.sin(k * 5 + p.off * 9) * 0.22 * k,
        em[1] + k * 1.8,
        em[2] + Math.cos(k * 4) * 0.18 * k,
      );
      const sc = 0.5 + k * 1.7;
      p.m.scale.set(sc, sc * 1.25, sc);
      p.m.material.opacity = 0.42 * Math.sin(Math.PI * Math.min(1, k * 1.35));
    }
  }

  return { object, update };
}
