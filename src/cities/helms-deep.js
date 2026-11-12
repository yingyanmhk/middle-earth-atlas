// Helm's Deep — the Hornburg in the cleft, where the tide of war broke.
// One strong idea: a great grey wall of stone plugs a narrow gorge; behind it a
// tall square tower rises at the gorge head, a dark cavern keep hides in the
// rock, and the Deeping-stream runs past the wall. Stern, waiting for war.
import { THREE, Builder, M, C, terrainDisc, fbm, hash2, rock, stairs, tree, arch, Lines, solid, glowMat } from '../kit.js';
import { figure } from './_ab_util.js';

/* ------------------------------------------------------------ helpers -- */

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const GREY = ['#6e6a62', '#77736b', '#65615a', '#7c776e'];
const GREY_L = ['#7a756c', '#827d74'];
const GREY_D = '#55524c';
const ROCK_C = ['#6a6760', '#757168', '#5f5c55', '#7e7a70'];
const FIG_C = ['#5a5852', '#4e4c46', '#63615a', '#55534c', '#46443e'];

/* ------------------------------------------------------------ terrain -- */

// A valley that opens onto the plain at +z and narrows to a gorge head at -z,
// with steep rocky walls on both sides. The head rock rises behind the tower.
const h = (x, z) => {
  const r = Math.hypot(x, z);
  let y = 0.15 + 0.12 * fbm(x * 0.45 + 3.1, z * 0.45 + 9.1, { oct: 4, seed: 31 });
  // the gorge: the valley half-width narrows toward the head (z < 0)
  const hw = 1.9 + 4.2 * smooth(-9.5, 9.5, z);
  const d = Math.abs(x) - hw;
  if (d > 0) y += 5.0 * (1 - Math.exp(-d / 1.0)) * (1 - smooth(9.2, 10.4, r));
  // the head rock behind the Hornburg (full north of z ≈ -7.6)
  y += 5.6 * Math.exp(-((z + 10.2) ** 2) / 4.4) * (1 - smooth(-7.6, -6.2, z)) * (1 - smooth(9.2, 10.4, r));
  // a low mound grounding the Hornburg at the gorge head
  y += 0.3 * Math.exp(-(x * x + (z + 6.35) ** 2) / 7);
  // the Deeping-stream channel along x ≈ -2.7
  const ch = Math.exp(-(((x + 2.7) / 0.5) ** 2)) * smooth(-8.2, -7.0, z) * (1 - smooth(8.6, 9.4, z));
  y -= 0.6 * ch;
  return Math.max(0.12, y);
};

const colorAt = (x, z, y, up) => {
  const j = hash2(Math.round(x * 2.7), Math.round(z * 2.7), 23);
  if (y > 2.1) {
    const rock = j < 0.5 ? 0x6f6b63 : j < 0.82 ? 0x77736b : 0x66625a;
    return '#' + rock.toString(16).padStart(6, '0');
  }
  if (y > 0.85) {
    const stony = Math.round(0x7c7a60 + (j - 0.5) * 18);
    return '#' + stony.toString(16).padStart(6, '0');
  }
  const grass = 0x7c8a57, deep = 0x69784a;
  const c = Math.round(grass + (deep - grass) * Math.min(1, y / 0.8) + (j - 0.5) * 14);
  return '#' + c.toString(16).padStart(6, '0');
};

/* ------------------------------------------------------------ layout -- */

const WALL_Z = -3.8;        // the Deeping Wall (spanning x)
const WALL_T = 1.5;         // thickness
const WALL_H = 5.8;         // wall-walk top (central wall)
const WALL_W = 10.5;        // total width
const END_FROM = 4.35;      // raised end-towers: |x| >= END_FROM
const END_H = 7.3;          // end-tower top
const GATE_HW = 1.05;       // gate half width
const GATE_TOP = 3.5;       // gate arch height
const CULV_X = -2.7;        // stream culvert in the wall
const CULV_HW = 0.5;
const CULV_TOP = 1.15;
const STREAM_X = -2.7;      // the Deeping-stream
const TOWER_Z = -6.35;      // the Hornburg
const TOWER_Y = 0.42;       // shaft base (sunk into the mound)
const NSEG = 30;

export default function build({ rng, city, accent }) {
  const b = new Builder();
  const object = new THREE.Group();

  /* ------------------------------- terrain ------------------------------- */
  terrainDisc(b, { r: 10.5, rings: 56, segs: 88, height: h, colorAt, mat: M.stone, seed: 47 });

  /* --------------------------- the Deeping Wall -------------------------- */
  for (let i = 0; i < NSEG; i++) {
    const x0 = -WALL_W / 2 + (i / NSEG) * WALL_W;
    const x1 = -WALL_W / 2 + ((i + 1) / NSEG) * WALL_W;
    const xm = (x0 + x1) / 2;
    let bottom = h(xm, WALL_Z);
    if (Math.abs(xm) < GATE_HW) bottom = Math.max(bottom, GATE_TOP);        // wall above the gate
    if (Math.abs(xm - CULV_X) < CULV_HW) bottom = Math.max(bottom, CULV_TOP); // lintel above the culvert
    const top = Math.abs(xm) >= END_FROM ? END_H : WALL_H;
    const hgt = top - bottom;
    if (hgt < 0.1) continue;
    b.box(WALL_W / NSEG + 0.03, hgt, WALL_T, {
      x: xm, y: bottom, z: WALL_Z,
      color: Math.abs(xm) >= END_FROM ? rng.pick(GREY_L) : rng.pick(GREY), mat: M.stone,
    });
  }
  // the wall-walk (level, bridging the gate and the culvert)
  for (let i = 0; i < NSEG; i++) {
    const x0 = -WALL_W / 2 + (i / NSEG) * WALL_W;
    const x1 = -WALL_W / 2 + ((i + 1) / NSEG) * WALL_W;
    const xm = (x0 + x1) / 2;
    if (Math.abs(xm) >= END_FROM) continue;
    if (h(xm, WALL_Z) > WALL_H - 0.2) continue; // no wall body here
    b.box(WALL_W / NSEG + 0.06, 0.1, 1.0, { x: xm, y: WALL_H - 0.01, z: WALL_Z, color: rng.pick(GREY_L), mat: M.stone });
  }
  // crenellations
  for (const mx of [-3.75, -2.75, -1.75, 1.75, 2.75, 3.75]) {
    b.box(0.34, 0.52, 0.44, { x: mx, y: WALL_H + 0.06, z: WALL_Z, color: GREY_D, mat: M.stone });
  }
  for (const sx of [1, -1]) {
    for (const ex of [4.5, 4.8, 5.1]) {
      b.box(0.32, 0.52, 0.44, { x: sx * ex, y: END_H + 0.06, z: WALL_Z, color: GREY_D, mat: M.stone });
    }
  }
  // the gate: jambs + stone arch + dark door + gold trim
  b.geo(new THREE.TorusGeometry(1.17, 0.13, 6, 16, Math.PI), { x: 0, y: GATE_TOP, z: WALL_Z, color: GREY_D, mat: M.stone });
  b.quad(1.9, 3.0, { x: 0, y: 1.82, z: WALL_Z + WALL_T / 2 + 0.03, mat: M.smooth, color: '#14151a' });
  b.box(1.9, 0.07, 0.05, { x: 0, y: 3.28, z: WALL_Z + WALL_T / 2 + 0.05, color: accent, mat: M.metal });
  b.sphere(0.05, { x: 0, y: 1.6, z: WALL_Z + WALL_T / 2 + 0.06, color: accent, mat: M.metal, seg: 8 });
  // the stream culvert: dark mouths through the wall
  b.quad(0.9, 0.87, { x: CULV_X, y: 0.6, z: WALL_Z + WALL_T / 2 + 0.02, mat: M.smooth, color: '#101114' });
  b.quad(0.9, 0.87, { x: CULV_X, y: 0.6, z: WALL_Z - WALL_T / 2 - 0.02, mat: M.smooth, color: '#101114' });
  // arrow slits on the outer face
  for (const sx of [-3.9, -3.25, 2.0, 2.75, 3.9]) {
    for (const sy of [2.3, 3.4, 4.5]) b.quad(0.09, 0.4, { x: sx, y: sy, z: WALL_Z + WALL_T / 2 + 0.02, mat: M.smooth, color: '#1b1c20' });
  }
  for (const sx of [4.6, 4.9]) for (const sy of [5.0, 6.2]) {
    for (const s of [1, -1]) b.quad(0.09, 0.42, { x: s * sx, y: sy, z: WALL_Z + WALL_T / 2 + 0.02, mat: M.smooth, color: '#1b1c20' });
  }

  /* ------------------------- the stair to the wall ------------------------ */
  // climbs the west gorge slope to the west end-tower, following the ground
  stairs(b, { x: -4.3, y: 0.9, z: 1.5, w: 1.05, steps: 9, rise: 0.44, run: 0.5, ry: Math.PI + 0.05, color: rng.pick(GREY_L), mat: M.stone });
  b.box(1.1, 0.12, 0.9, { x: -4.9, y: 4.62, z: -3.05, color: rng.pick(GREY_L), mat: M.stone }); // landing at the tower foot
  b.quad(0.5, 1.1, { x: -4.95, y: 5.35, z: WALL_Z + WALL_T / 2 + 0.04, mat: M.smooth, color: '#14151a' }); // door in the end tower
  // a few boulders masking the stair's footing on the slope
  rock(b, { x: -4.62, z: -2.62, y: h(-4.62, -2.62) + 0.05, r: 0.4, h: 0.7, color: rng.pick(ROCK_C), rand: rng, detail: 1 });
  rock(b, { x: -4.28, z: -1.9, y: h(-4.28, -1.9) + 0.05, r: 0.35, h: 0.6, color: rng.pick(ROCK_C), rand: rng, detail: 1 });
  rock(b, { x: -4.65, z: -0.6, y: h(-4.65, -0.6) + 0.05, r: 0.32, h: 0.55, color: rng.pick(ROCK_C), rand: rng, detail: 1 });

  /* ------------------------------ the Hornburg ---------------------------- */
  // main shaft, upper stage, cornice and crenel cap
  b.box(2.5, 7.2, 2.5, { x: 0, y: TOWER_Y, z: TOWER_Z, color: rng.pick(GREY), mat: M.stone });
  b.box(2.3, 2.5, 2.3, { x: 0, y: TOWER_Y + 7.2, z: TOWER_Z, color: rng.pick(GREY_L), mat: M.stone });
  b.box(2.72, 0.22, 2.72, { x: 0, y: TOWER_Y + 9.7, z: TOWER_Z, color: GREY_D, mat: M.stone });
  b.box(2.9, 0.2, 2.9, { x: 0, y: TOWER_Y + 9.92, z: TOWER_Z, color: rng.pick(GREY), mat: M.stone });
  const capTop = TOWER_Y + 10.12;
  for (const [mx, mz] of [[1.3, 1.3], [-1.3, 1.3], [1.3, -1.3], [-1.3, -1.3]]) {
    b.box(0.34, 0.5, 0.34, { x: mx, y: capTop, z: TOWER_Z + mz, color: GREY_D, mat: M.stone });
  }
  for (const [mx, mz] of [[0.72, 1.4], [-0.72, 1.4], [0.72, -1.4], [-0.72, -1.4], [1.4, 0.72], [1.4, -0.72], [-1.4, 0.72], [-1.4, -0.72]]) {
    b.box(0.3, 0.5, 0.28, { x: mx, y: capTop, z: TOWER_Z + mz, color: GREY_D, mat: M.stone });
  }
  // the great door (facing the wall) with a gold band and the Horn of Helm
  arch(b, { x: 0, y: TOWER_Y + 0.5, z: TOWER_Z + 1.27, w: 1.0, h: 1.9, t: 0.16, depth: 0.35, color: GREY_D, mat: M.stone });
  b.quad(0.66, 1.55, { x: 0, y: TOWER_Y + 1.35, z: TOWER_Z + 1.3, mat: M.smooth, color: '#101114' });
  b.box(0.7, 0.06, 0.05, { x: 0, y: TOWER_Y + 2.45, z: TOWER_Z + 1.32, color: accent, mat: M.metal });
  b.lathe([[0.012, 0], [0.05, 0.05], [0.075, 0.11], [0.088, 0.17], [0.07, 0.24], [0.042, 0.3], [0.022, 0.34]], {
    x: 0.72, y: TOWER_Y + 2.0, z: TOWER_Z + 1.3, rx: 0.45, ry: 0.25, color: '#3a3a42', mat: M.smooth, seg: 10,
  });
  b.torus(0.055, 0.014, { x: 0.72, y: TOWER_Y + 1.96, z: TOWER_Z + 1.28, rx: 0.45, color: C.gold, mat: M.metal, rseg: 5, tseg: 10 });
  // slit windows on the upper shaft (visible above the wall)
  for (const sx of [0.55, -0.55]) for (const sy of [6.3, 7.6]) {
    b.quad(0.09, 0.36, { x: sx, y: TOWER_Y + sy, z: TOWER_Z + 1.26, mat: M.smooth, color: '#1b1c20' });
  }

  /* --------------------------- the cavern keep ---------------------------- */
  // a dark doorway in the rock behind the tower, a dim warm light within
  const CAV = { x: -1.2, z: -7.42 };
  const cay = h(CAV.x, CAV.z);
  arch(b, { x: CAV.x, y: cay + 0.02, z: CAV.z, w: 1.6, h: 1.9, t: 0.17, depth: 0.5, color: '#4f4b45', mat: M.stone });
  b.quad(1.2, 1.6, { x: CAV.x, y: cay + 0.9, z: CAV.z + 0.04, mat: M.smooth, color: '#0a0b0e' });
  b.quad(0.6, 0.5, { x: CAV.x, y: cay + 1.05, z: CAV.z + 0.06, mat: M.glow, color: C.lamp, glow: 1.12 });
  // rough steps up to the cave mouth
  for (const sz of [-6.9, -7.2, -7.36]) {
    b.box(0.9, 0.14, 0.5, { x: CAV.x, y: h(CAV.x, sz) + 0.03, z: sz, color: rng.pick(GREY), mat: M.stone });
  }

  /* ------------------------- the Deeping-stream --------------------------- */
  // a water strip (stand-alone, animated) in the carved channel
  const water = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 16.8), M.water.clone());
  water.position.set(STREAM_X, 0.17, 0.5); // z −7.9 … +8.9
  water.castShadow = water.receiveShadow = false;
  object.add(water);
  // little cascades: at the stream head and at the culvert
  const foamA = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.15), solid('#e8ecef', { transparent: true, opacity: 0.6, roughness: 0.9 }));
  foamA.rotation.x = -Math.PI / 2;
  foamA.position.set(STREAM_X, 0.19, -7.82);
  foamA.castShadow = foamA.receiveShadow = false;
  const foamB = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.13), solid('#e8ecef', { transparent: true, opacity: 0.5, roughness: 0.9 }));
  foamB.rotation.x = -Math.PI / 2;
  foamB.position.set(STREAM_X, 0.18, -3.0);
  foamB.castShadow = foamB.receiveShadow = false;
  object.add(foamA, foamB);

  /* --------------------------- the mill + wheel --------------------------- */
  const MY = h(-3.5, 5.2);
  b.box(1.3, 1.1, 1.1, { x: -3.5, y: MY, z: 5.2, color: '#6d6a63', mat: M.stone });
  b.geo(new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1).rotateY(Math.PI / 4).translate(0, 0.5, 0), {
    x: -3.5, y: MY + 1.1, z: 5.2, sx: 1.45, sz: 1.25, sy: 0.5, color: '#3c3a40', mat: M.flat,
  });
  b.box(0.4, 0.72, 0.05, { x: -2.85, y: MY + 0.2, z: 5.2, color: '#2b2620', mat: M.wood });
  b.quad(0.3, 0.34, { x: -3.5, y: MY + 0.55, z: 5.2 + 0.56, mat: M.smooth, color: '#1d1e22' });
  b.cyl(0.15, 0.16, 0.09, { x: -3.1, y: MY + 0.1, z: 5.2, color: '#a8a294', mat: M.smooth, seg: 12 }); // millstone
  b.rod([-2.85, 0.7, 5.2], [-2.7, 0.7, 5.2], 0.03, { color: C.darkwood, mat: M.wood }); // axle
  const wheel = new THREE.Group();
  const wb = new Builder();
  wb.geo(new THREE.TorusGeometry(0.42, 0.05, 6, 18).rotateY(Math.PI / 2), { mat: M.wood, color: '#5f4026' });
  wb.geo(new THREE.TorusGeometry(0.24, 0.04, 6, 12).rotateY(Math.PI / 2), { mat: M.wood, color: '#5f4026' });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    wb.box(0.09, 0.5, 0.03, { x: 0, y: Math.cos(a) * 0.39, z: Math.sin(a) * 0.39, rx: a, color: '#7a5230', mat: M.wood });
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 8;
    wb.box(0.04, 0.78, 0.04, { x: 0, y: Math.cos(a) * 0.24, z: Math.sin(a) * 0.24, rx: a, color: '#4a3220', mat: M.wood });
  }
  wheel.add(wb.build());
  wheel.position.set(STREAM_X, 0.7, 5.2);
  object.add(wheel);

  /* ----------------------------- the road -------------------------------- */
  for (let i = 0; i < 10; i++) {
    const z0 = -3.5 + i * 1.2, z1 = z0 + 1.2;
    const mz = (z0 + z1) / 2;
    b.box(1.6, 0.07, 1.2, { x: 0, y: h(0, mz) + 0.03, z: mz, color: '#8d8368', mat: M.stone });
  }
  for (const zz of [-4.7, -5.15]) b.box(1.5, 0.07, 0.9, { x: 0, y: h(0, zz) + 0.03, z: zz, color: '#8d8368', mat: M.stone });

  /* ------------------- the broken ram, chain and stones ------------------- */
  b.rod([0.85, 0.32, -2.55], [0.6, 2.9, -3.0], 0.24, { color: '#4a3626', mat: M.wood });   // the ram, leaning on the wall
  b.cone(0.26, 0.55, { x: 0.6, y: 3.05, z: -3.0, rx: 0.5, color: '#3d3d42', mat: M.rough_metal, seg: 10 });
  b.rod([0.7, 0.32, -2.35], [0.25, 0.95, -2.7], 0.17, { color: '#4a3626', mat: M.wood });  // broken stump
  const L = new Lines();
  L.seg([0.6, 2.8, -3.0], [0.85, 2.6, -2.95], '#3a3a40');
  L.seg([0.85, 2.6, -2.95], [1.05, 2.45, -2.9], '#3a3a40');
  L.seg([0.55, 0.7, -2.5], [0.3, 0.95, -2.6], '#3a3a40');
  object.add(L.build(M.line));
  {
    let placed = 0, tries = 0;
    while (placed < 8 && tries < 60) {
      tries++;
      const sx = rng.range(-3.2, 3.2), sz = rng.range(-3.6, -2.6);
      if (Math.abs(sx) < 1.25) continue;                                    // gate clear
      if (Math.hypot(sx - 0.7, sz + 2.9) < 1.0) continue;                   // ram clear
      if (Math.abs(sx - STREAM_X) < 0.75) continue;                         // stream clear
      b.box(rng.range(0.26, 0.62), rng.range(0.14, 0.4), rng.range(0.22, 0.55), {
        x: sx, y: h(sx, sz) + 0.02, z: sz, rx: rng.range(0, 0.4), ry: rng.range(0, Math.PI), color: rng.pick(GREY), mat: M.stone,
      });
      placed++;
    }
  }

  /* ----------------------- rocks on the gorge slopes ---------------------- */
  const ROCKS = [
    [-4.6, -1.6, 0.5, 0.9], [4.6, -1.2, 0.5, 0.9], [-5.1, 2.7, 0.5, 1.0], [5.4, 3.2, 0.55, 1.0],
    [-6.1, -3.6, 0.6, 1.1], [6.3, -3.2, 0.6, 1.1], [-5.0, 6.2, 0.5, 0.9], [5.1, 6.4, 0.5, 0.9],
    [-7.4, 0.5, 0.7, 1.2], [7.6, 1.2, 0.7, 1.2], [-4.6, 4.6, 0.45, 0.8], [4.5, 5.2, 0.45, 0.8],
    [-2.4, -7.9, 0.55, 1.0], [0.2, -8.0, 0.6, 1.1], [-1.0, -8.7, 0.75, 1.35], [-3.4, -8.2, 0.5, 0.9],
    [2.3, -8.6, 0.55, 1.0], [4.5, 8.5, 0.4, 0.7], [-4.8, 8.6, 0.45, 0.8],
  ];
  for (const [rx, rz, rr, rh] of ROCKS) {
    rock(b, { x: rx, z: rz, y: h(rx, rz) + 0.06, r: rr, h: rh, color: rng.pick(ROCK_C), rand: rng, detail: 1 });
  }

  /* --------------------------- dark trees -------------------------------- */
  const TREES = [
    [-5.7, 3.6, 1.2], [-6.0, 1.0, 1.0], [-6.6, -1.5, 1.1], [-5.3, 5.8, 0.9], [-7.6, 5.0, 1.2], [-6.9, 7.2, 1.0],
    [5.8, 3.4, 1.1], [6.4, 0.6, 1.0], [6.0, -2.3, 1.1], [7.2, 4.2, 1.2], [6.7, 6.8, 1.0], [8.2, 2.0, 0.9],
    [-2.5, -8.1, 1.3], [2.4, -8.3, 1.3], [-1.7, -9.1, 1.2], [2.1, -9.4, 1.2],
    [4.4, 8.1, 1.0], [-4.2, 7.9, 1.0],
  ];
  for (const [tx, tz, th] of TREES) {
    tree(b, { x: tx, y: h(tx, tz) + 0.01, z: tz, h: th, kind: 'round', color: rng.pick(['#33402e', '#3a4634', '#2d3a2b', '#41502f']), trunk: C.darkwood });
  }

  /* --------------------------- the garrison ------------------------------- */
  const spear = (x, y, z, len = 0.62) => {
    b.rod([x, y, z], [x, y + len, z], 0.012, { color: '#3a3426', mat: M.wood });
    b.sphere(0.02, { x, y: y + len, z, color: '#aeb2b8', mat: M.metal, seg: 6 });
  };
  // sentries on the wall-walk
  for (const sx of [-3.6, -2.4, 1.5, 2.6, 3.7]) {
    figure(b, { x: sx, y: WALL_H + 0.14, z: WALL_Z, h: 0.3, color: rng.pick(FIG_C), ry: 0.15 });
    spear(sx - 0.04, WALL_H + 0.24, WALL_Z);
  }
  // guards on the end towers
  for (const sx of [4.6, -4.6]) {
    figure(b, { x: sx, y: END_H + 0.06, z: WALL_Z, h: 0.3, color: rng.pick(FIG_C), ry: 0.2 });
    spear(sx - 0.04, END_H + 0.16, WALL_Z);
  }
  // watch at the tower top
  figure(b, { x: 0.9, y: capTop + 0.04, z: TOWER_Z - 0.9, h: 0.3, color: rng.pick(FIG_C), ry: -0.4 });
  figure(b, { x: -0.9, y: capTop + 0.04, z: TOWER_Z + 0.9, h: 0.3, color: rng.pick(FIG_C), ry: 0.5 });
  spear(0.86, capTop + 0.14, TOWER_Z - 0.9, 0.55);
  spear(-0.94, capTop + 0.14, TOWER_Z + 0.9, 0.55);
  // courtyard and gate
  figure(b, { x: 1.15, y: h(1.15, -4.7) + 0.02, z: -4.7, h: 0.3, color: rng.pick(FIG_C), ry: 1.8 });
  figure(b, { x: -0.8, y: h(-0.8, -5.3) + 0.02, z: -5.3, h: 0.3, color: rng.pick(FIG_C), ry: -1.2 });
  figure(b, { x: 0.2, y: h(0.2, -5.9) + 0.02, z: -5.9, h: 0.3, color: rng.pick(FIG_C), ry: 2.4 });
  figure(b, { x: 1.2, y: h(1.2, -3.4) + 0.02, z: -3.4, h: 0.3, color: rng.pick(FIG_C), ry: 0.3 });
  spear(1.16, h(1.2, -3.4) + 0.12, -3.4);

  /* ----------------------------- banner poles ----------------------------- */
  // wall flanking the gate
  for (const sx of [1.6, -1.6]) b.cyl(0.025, 0.03, 1.7, { x: sx, y: WALL_H + 0.12, z: WALL_Z, color: C.darkwood, mat: M.wood });
  // end towers
  for (const sx of [4.95, -4.95]) b.cyl(0.024, 0.03, 1.2, { x: sx, y: END_H + 0.02, z: WALL_Z, color: C.darkwood, mat: M.wood });
  // tower top
  b.cyl(0.026, 0.032, 1.4, { x: 0.8, y: capTop, z: TOWER_Z - 0.8, color: C.darkwood, mat: M.wood });
  b.cyl(0.026, 0.032, 1.4, { x: -0.8, y: capTop, z: TOWER_Z + 0.8, color: C.darkwood, mat: M.wood });
  // tower mid-shaft
  b.cyl(0.024, 0.03, 1.5, { x: 1.0, y: TOWER_Y + 6.5, z: TOWER_Z + 1.27, color: C.darkwood, mat: M.wood });

  /* ----------------------------- static build ----------------------------- */
  const staticGroup = b.build();
  object.add(staticGroup);

  /* ----------------------------- banners --------------------------------- */
  const banners = [];
  const addBanner = (x, y, z, poleH, w, hh, ph) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y + poleH - 0.06, z);
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), new THREE.MeshStandardMaterial({ color: accent, roughness: 0.85, metalness: 0, side: THREE.DoubleSide }));
    cloth.position.y = -hh / 2;
    pivot.add(cloth);
    object.add(pivot);
    banners.push({ pivot, ph });
  };
  addBanner(1.6, WALL_H + 0.12, WALL_Z, 1.7, 0.5, 0.75, 0.0);
  addBanner(-1.6, WALL_H + 0.12, WALL_Z, 1.7, 0.5, 0.75, 1.7);
  addBanner(4.95, END_H + 0.02, WALL_Z, 1.2, 0.45, 0.62, 2.9);
  addBanner(-4.95, END_H + 0.02, WALL_Z, 1.2, 0.45, 0.62, 4.2);
  addBanner(0.8, capTop, TOWER_Z - 0.8, 1.4, 0.5, 0.8, 1.1);
  addBanner(-0.8, capTop, TOWER_Z + 0.8, 1.4, 0.5, 0.8, 5.4);
  addBanner(1.0, TOWER_Y + 6.5, TOWER_Z + 1.27, 1.5, 0.45, 0.6, 3.3);

  /* ------------------------- the watch-fire ------------------------------- */
  const bra = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.3), solid('#3a3632'));
  bra.position.set(0.75, capTop + 0.02, -5.75);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.3, 7), new THREE.MeshStandardMaterial({ color: '#ffb066', roughness: 0.6, emissive: '#b04a1e', emissiveIntensity: 0.9 }));
  flame.position.set(0.75, capTop + 0.18, -5.75);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), glowMat('#ff9a45', 2.0, { transparent: true }));
  glow.position.set(0.75, capTop + 0.16, -5.75);
  const fireLight = new THREE.PointLight('#ff7a2f', 5, 9, 2);
  fireLight.position.set(0.75, capTop + 0.24, -5.75);
  bra.castShadow = bra.receiveShadow = true;
  flame.castShadow = flame.receiveShadow = false;
  glow.castShadow = glow.receiveShadow = false;
  object.add(bra, flame, glow, fireLight);

  // thin smoke rising from the watch-fire
  const smoke = [];
  const smokeMat = new THREE.MeshBasicMaterial({ color: '#8a8176', transparent: true, opacity: 0.35, depthWrite: false });
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), smokeMat.clone());
    m.visible = false;
    m.castShadow = m.receiveShadow = false;
    object.add(m);
    smoke.push({ m, off: i / 4, ph: rng.range(0, 6) });
  }

  /* --------------------- stream sparkles (shimmer) ------------------------ */
  const sparkles = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.07), glowMat('#ffe9c0', 1.0, { transparent: true }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(STREAM_X + 0.1, 0.2, -7 + i * 5);
    m.castShadow = m.receiveShadow = false;
    object.add(m);
    sparkles.push({ m, ph: rng.range(0, 1) });
  }

  /* -------------------------------- update -------------------------------- */
  function update(t, dt) {
    // the banners of Rohan sway
    for (const bb of banners) {
      bb.pivot.rotation.y = Math.sin(t * 1.2 + bb.ph) * 0.1;
      bb.pivot.rotation.x = Math.sin(t * 1.5 + bb.ph * 1.3) * 0.035;
    }
    // the mill wheel turns
    wheel.rotation.x += dt * 0.5;
    // the watch-fire breathes
    const f = 1 + 0.12 * Math.sin(t * 6.3) + 0.06 * Math.sin(t * 12.7 + 1.2);
    flame.scale.set(f, f * (1 + 0.1 * Math.sin(t * 4.9 + 0.6)), f);
    glow.material.opacity = 0.68 + 0.28 * Math.sin(t * 5.6 + 0.8);
    glow.scale.setScalar(0.85 + 0.2 * Math.sin(t * 6.2 + 2.0));
    fireLight.intensity = 4.5 + 1.5 * Math.sin(t * 6.1) + 0.7 * Math.sin(t * 11.3);
    // the stream shimmers: glints drift down the water
    for (const s of sparkles) {
      const k = (t * 0.05 + s.ph) % 1;
      s.m.position.set(STREAM_X + 0.12 * Math.sin(k * 9 + s.ph * 13), 0.2 + 0.012 * Math.sin(t * 3.2 + s.ph * 7), -7.4 + k * 15.6);
      s.m.material.opacity = 0.4 + 0.3 * Math.sin(t * 3.4 + s.ph * 9);
    }
    // the little cascades churn
    foamA.material.opacity = 0.45 + 0.3 * Math.sin(t * 4.4);
    foamA.scale.set(1 + 0.14 * Math.sin(t * 4.4 + 1.2), 1, 1);
    foamB.material.opacity = 0.4 + 0.28 * Math.sin(t * 4.9 + 2.1);
    water.material.opacity = 0.82 + 0.05 * Math.sin(t * 2.1);
    // smoke from the watch-fire
    for (const p of smoke) {
      const k = (t * 0.11 + p.off) % 1;
      p.m.visible = true;
      p.m.position.set(0.75 + Math.sin(k * 4 + p.ph) * 0.14 * k, capTop + 0.3 + k * 1.9, -5.75 + Math.cos(k * 3.4 + p.ph * 2) * 0.12 * k);
      const sc = 0.7 + k * 1.8;
      p.m.scale.set(sc, sc * 1.25, sc);
      p.m.material.opacity = 0.35 * Math.sin(Math.PI * Math.min(1, k * 1.4));
    }
  }

  return { object, update };
}
