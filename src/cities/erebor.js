// Erebor — the Lonely Mountain. One strong idea: a great lone peak with a
// secret stone door at its base; from the crack of the door the dragon's
// hoard glows gold, and below, the forges of the returned dwarves ring with
// fire. Dwarven pride, wealth, and the mountain's secret.
import { THREE, Builder, M, C, terrainDisc, fbm, hash2, rock, glowMat, house } from '../kit.js';
import { setInst } from './_ab_util.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const AX = 0.0, AZ = -2.6;                  // the mountain's axis
const DOOR = { x: 2.5, z: -0.1, ry: 0.75 }; // the secret door, south-east flank
const HOARD = new THREE.Color('#ffc96b');   // the hoard gold
const RUNE = new THREE.Color('#b9c9f4');    // moon-rune pale blue

/* ------------------------------- terrain ------------------------------- */
// Rocky lower slopes: low fbm undulation plus a broad skirt under the mountain.
const h = (x, z) => {
  let y = 0.5 * fbm(x * 0.34 + 1.7, z * 0.34 + 4.9, { oct: 4, seed: 101 });
  y += 0.28 * fbm(x * 0.12 + 8.1, z * 0.12 + 3.3, { oct: 3, seed: 47 });
  y += 2.5 * Math.exp(-((x - AX) ** 2 + (z - AZ) ** 2) / 52); // the mountain's skirt
  return Math.max(0.12, y);
};

const colorAt = (x, z, y, up) => {
  const j = hash2(Math.round(x * 2.6), Math.round(z * 2.6), 71);
  const base = up < 0.55 ? 0x857a68 : 0x6f6555; // grey-brown scree / darker steep rock
  const c = Math.round(base + (j - 0.5) * 22);
  return '#' + c.toString(16).padStart(6, '0');
};

const SCRUB_C = ['#4c4a34', '#57503a', '#45422f', '#5c5540'];
const ROCK_C = ['#8f8a80', '#87827a', '#7d786e', '#99948a', '#847e74'];
const SNOW_C = ['#e9eff3', '#e0e8ee', '#f3f6f8'];

// town structure centres (for scrub avoidance)
const TOWN = [[1.5, 2.15], [3.4, 2.6], [-1.7, 3.6], [1.7, 5.5], [-3.05, 2.6], [-0.5, 4.72], [-0.3, 4.25]];
const nearTown = (x, z) => TOWN.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 1.85);

// the path polyline (door → forge quarter → gate)
const PATH = [[2.55, 0.45], [2.75, 1.15], [2.5, 2.5], [1.9, 3.6], [0.9, 4.35], [0.1, 4.7], [-0.5, 4.75]];
const nearPath = (x, z) => {
  for (let i = 0; i < PATH.length - 1; i++) {
    const a = PATH[i], c = PATH[i + 1];
    const vx = c[0] - a[0], vz = c[1] - a[1];
    const len2 = vx * vx + vz * vz;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / len2));
    const dx = x - (a[0] + vx * t), dz = z - (a[1] + vz * t);
    if (dx * dx + dz * dz < 0.32) return true;
  }
  return false;
};

/* ----------------------- a stocky dwarf figure ------------------------- */
function dwarf(b, rng, { x = 0, y = 0, z = 0, h = 0.3, color = '#3a3634', ry = 0, smith = false, mat = M.smooth }) {
  b.push({ x, y, z, ry });
  b.cyl(h * 0.09, h * 0.24, h * 0.5, { color, seg: 7, mat });                                  // barrel body
  b.geo(new THREE.SphereGeometry(1, 8, 6), { y: h * 0.42, sx: h * 0.2, sy: h * 0.15, sz: h * 0.17, color, mat }); // shoulders
  b.sphere(h * 0.13, { y: h * 0.68, color: '#d9b48c', seg: 8, mat });                          // head
  b.geo(new THREE.SphereGeometry(1, 7, 5), { y: h * 0.5, sx: h * 0.11, sy: h * 0.17, sz: h * 0.1, color: rng.pick(['#4f3d2c', '#5a4632', '#3f3238']), mat }); // beard
  b.cone(h * 0.14, h * 0.16, { y: h * 0.82, color: '#6b6357', seg: 7, mat });                  // helmet
  if (smith) {
    b.rod([h * 0.17, h * 0.5, 0], [h * 0.31, h * 0.72, 0], h * 0.024, { color: '#d9b48c', seg: 4, mat });
    b.box(h * 0.07, h * 0.045, h * 0.1, { x: h * 0.31, y: h * 0.76, color: '#2e2c2e', mat: M.metal });
  }
  b.pop();
}

/* ----------------------------------------------------------------------- */

export default function build({ rng, city, accent }) {
  const b = new Builder();
  const object = new THREE.Group();

  /* ------------------------------- terrain ----------------------------- */
  terrainDisc(b, { r: 10.5, rings: 56, segs: 88, height: h, colorAt, mat: M.stone, seed: 71 });

  /* -------------------- the Lonely Mountain (a tall cone) -------------- */
  const MTN = [
    // base cluster — the mountain's body
    { x: 0.2, z: -2.6, r: 3.4, h: 4.6 },
    { x: -2.6, z: -3.4, r: 2.2, h: 3.2 },
    { x: 3.0, z: -3.2, r: 2.0, h: 3.0 },
    { x: -1.6, z: -0.6, r: 1.4, h: 2.6 },   // south-west flank outcrop
    { x: 3.4, z: -0.8, r: 1.0, h: 2.4 },    // south-east flank outcrop
    // upper cluster
    { x: 0.1, z: -2.5, r: 1.7, h: 3.6, y: 6.76 },
    { x: 0.3, z: -2.2, r: 1.2, h: 2.8, y: 9.29 },
    // the peak
    { x: 0.35, z: -2.15, r: 0.7, h: 1.9, y: 11.25 },
    // the snow cap
    { x: 0.35, z: -2.15, r: 0.6, h: 1.3, y: 12.22, snow: true },
  ];
  for (const rk of MTN) {
    const yy = rk.y ?? h(rk.x, rk.z) + 0.4 * rk.h;
    rock(b, {
      x: rk.x, y: yy, z: rk.z, r: rk.r, h: rk.h,
      color: rk.snow ? rng.pick(SNOW_C) : rng.pick(ROCK_C), rand: rng,
    });
  }
  // scattered boulders at the mountain's base
  for (const [bx, bz, br] of [[5.0, 0.9, 0.4], [4.9, 2.8, 0.4], [-4.4, 0.4, 0.45], [5.4, -2.6, 0.35], [-3.2, -5.6, 0.4], [0.6, 0.9, 0.35]]) {
    rock(b, { x: bx, y: h(bx, bz) + 0.4 * br * 2.2, z: bz, r: br, h: br * 2.2, color: rng.pick(ROCK_C), rand: rng });
  }

  /* --------------------------- the secret door ------------------------- */
  const tY = h(DOOR.x, DOOR.z) + 0.02;
  b.push({ x: DOOR.x, y: tY, z: DOOR.z, ry: DOOR.ry });
  b.box(0.26, 1.5, 0.5, { x: -0.62, color: '#4d473f', mat: M.stone });   // jambs
  b.box(0.26, 1.5, 0.5, { x: 0.62, color: '#4d473f', mat: M.stone });
  b.box(1.56, 0.2, 0.5, { y: 1.5, color: '#4d473f', mat: M.stone });     // lintel
  b.box(1.2, 0.06, 0.52, { y: 1.53, color: accent, mat: M.stone });      // dwarf inlay
  b.box(1.0, 1.42, 0.12, { y: 0.02, z: -0.08, color: '#18161a', mat: M.stone }); // the dark door slab
  b.box(1.0, 0.045, 0.22, { y: 0.035, z: 0.07, mat: M.glow, color: '#ffd27a', glow: 1.8 }); // gold light under the door
  b.pop();

  /* ------------------------------ the town ----------------------------- */
  // forge quarter — a terrace pad, the open forge, anvil, smithy
  const FP = [1.5, 2.15];
  const fpY = h(FP[0], FP[1]) - 0.04;
  b.box(1.8, 0.2, 1.5, { x: FP[0], y: fpY, z: FP[1], color: '#5a534a', mat: M.stone });
  const fTop = fpY + 0.2;
  b.push({ x: 1.4, y: fTop, z: 2.3 }); // the forge, open mouth facing +z
  b.box(1.1, 0.95, 0.14, { z: -0.34, color: '#5d574d', mat: M.stone });      // back wall
  b.box(0.14, 0.95, 0.82, { x: -0.5, color: '#5d574d', mat: M.stone });      // side wall
  b.box(0.14, 0.95, 0.82, { x: 0.5, color: '#5d574d', mat: M.stone });       // side wall
  b.box(1.28, 0.14, 0.96, { y: 0.95, color: '#4a443c', mat: M.stone });      // top slab
  b.box(0.8, 0.5, 0.18, { y: 0.14, z: 0.24, color: '#16141a', mat: M.stone }); // dark mouth
  b.sphere(0.16, { y: 0.32, z: 0.3, mat: M.glow, color: '#ff9a45', glow: 0.9, seg: 9 }); // ember bed
  b.cyl(0.07, 0.09, 0.7, { x: 0.28, y: 0.95, z: -0.18, color: '#4f4940', mat: M.stone, seg: 7 }); // chimney
  b.pop();
  // the anvil
  b.box(0.3, 0.08, 0.17, { x: 1.62, y: fTop + 0.03, z: 2.28, color: '#26252a', mat: M.metal });
  b.box(0.2, 0.15, 0.11, { x: 1.62, y: fTop + 0.14, z: 2.28, color: '#33323a', mat: M.metal });
  // the smithy
  const SP = [3.4, 2.6];
  const spY = h(SP[0], SP[1]) - 0.04;
  b.box(1.5, 0.2, 1.3, { x: SP[0], y: spY, z: SP[1], color: '#5a534a', mat: M.stone });
  const sTop = spY + 0.2;
  b.box(1.35, 1.0, 1.15, { x: 3.4, y: sTop, z: 2.6, color: '#5f594f', mat: M.stone });
  b.box(1.47, 0.12, 1.27, { x: 3.4, y: sTop + 1.0, z: 2.6, color: '#4a4440', mat: M.flat }); // slate roof
  b.cyl(0.16, 0.2, 0.85, { x: 3.72, y: sTop + 1.02, z: 2.77, color: '#4f4940', mat: M.stone, seg: 7 }); // chimney
  b.quad(0.34, 0.28, { x: 3.24, y: sTop + 0.62, z: 3.19, mat: M.glow, color: C.lamp, glow: 1.5 }); // warm window
  b.box(0.42, 0.72, 0.05, { x: 3.52, y: sTop, z: 3.17, color: '#2a2726', mat: M.stone }); // door

  // the two low stone houses
  const HA = [-1.7, 3.6];
  const haY = h(HA[0], HA[1]) - 0.04;
  b.box(1.8, 0.2, 1.7, { x: HA[0], y: haY, z: HA[1], color: '#5a534a', mat: M.stone });
  house(b, { x: HA[0], y: haY + 0.2, z: HA[1], w: 1.15, d: 1.05, h: 1.0, roof: 'gable', wall: '#5f594f', roofColor: '#4a4440', win: true, lit: 0.5, r: rng });
  b.cyl(0.07, 0.09, 0.5, { x: HA[0] + 0.32, y: haY + 1.2, z: HA[1] - 0.22, color: '#4f4940', mat: M.stone, seg: 7 });
  const HB = [1.7, 5.5];
  const hbY = h(HB[0], HB[1]) - 0.04;
  b.box(1.7, 0.2, 1.6, { x: HB[0], y: hbY, z: HB[1], color: '#5a534a', mat: M.stone });
  house(b, { x: HB[0], y: hbY + 0.2, z: HB[1], w: 1.05, d: 1.15, h: 0.95, ry: 0.45, roof: 'gable', wall: '#57524a', roofColor: '#46403c', win: true, lit: 0.6, r: rng });
  b.cyl(0.06, 0.08, 0.45, { x: HB[0] + 0.25, y: hbY + 1.15, z: HB[1] - 0.3, color: '#4f4940', mat: M.stone, seg: 7 });

  // the stone bell-tower
  const BT = [-3.05, 2.6];
  const btY = h(BT[0], BT[1]) - 0.02;
  b.cyl(0.42, 0.48, 2.7, { x: BT[0], y: btY, z: BT[1], color: '#57524a', mat: M.stone, seg: 10 });
  b.cyl(0.44, 0.46, 0.12, { x: BT[0], y: btY + 1.45, z: BT[1], color: accent, mat: M.stone, seg: 10 });
  b.cone(0.55, 0.8, { x: BT[0], y: btY + 2.7, z: BT[1], color: '#434038', mat: M.flat, seg: 10 });
  b.box(0.16, 0.5, 0.1, { x: BT[0], y: btY + 2.05, z: BT[1] + 0.44, color: '#141318', mat: M.stone });
  b.geo(new THREE.SphereGeometry(0.07, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2.4), { x: BT[0], y: btY + 2.15, z: BT[1] + 0.46, color: '#8a7a52', mat: M.metal });
  b.quad(0.3, 0.4, { x: BT[0] + 0.28, y: btY + 2.2, z: BT[1], ry: Math.PI / 2, mat: M.cloth, color: accent });

  // the great stone gate in a low wall
  const W1 = [[-3.5, 4.35], [-2.6, 4.52], [-1.75, 4.62], [-1.2, 4.64]];
  const W2 = [[-0.1, 4.68], [0.9, 4.5], [1.9, 4.15], [2.6, 4.0]];
  for (const wall of [W1, W2]) {
    for (let i = 0; i < wall.length - 1; i++) {
      const a = wall[i], c = wall[i + 1];
      const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
      const mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2;
      b.box(len + 0.06, 1.0, 0.26, { x: mx, y: h(mx, mz) + 0.02, z: mz, ry: -Math.atan2(c[1] - a[1], c[0] - a[0]), color: '#5a534a', mat: M.stone });
    }
  }
  const GATE = [-0.5, 4.72];
  const gy = h(GATE[0], GATE[1]) + 0.02;
  for (const s of [-0.38, 0.38]) {
    b.box(0.3, 1.32, 0.34, { x: GATE[0] + s, y: gy, z: GATE[1], color: '#4d473f', mat: M.stone });
  }
  b.box(1.1, 0.16, 0.36, { x: GATE[0], y: gy + 1.32, z: GATE[1], color: '#4d473f', mat: M.stone });
  b.box(0.86, 0.05, 0.38, { x: GATE[0], y: gy + 1.34, z: GATE[1], color: accent, mat: M.stone });
  b.box(0.7, 1.24, 0.07, { x: GATE[0], y: gy + 0.05, z: GATE[1] + 0.08, color: '#201d1f', mat: M.stone });
  for (const [gx, gz] of [[-0.16, 0.17], [0.16, 0.17], [-0.16, 0.21], [0.16, 0.21]]) {
    b.sphere(0.022, { x: GATE[0] + gx, y: gy + 0.4, z: GATE[1] + gz, color: C.gold, mat: M.metal, seg: 6 });
  }
  // brazier by the gate
  const BR = [-0.3, 4.25];
  const brY = h(BR[0], BR[1]);
  b.cyl(0.15, 0.17, 0.2, { x: BR[0], y: brY, z: BR[1], color: '#2e2c2e', mat: M.metal, seg: 8 });
  b.sphere(0.1, { x: BR[0], y: brY + 0.16, z: BR[1], mat: M.glow, color: '#ff8a3c', glow: 0.8, seg: 8 });

  // the dwarves (stocky, dark clothes)
  dwarf(b, rng, { x: 1.95, y: fTop + 0.01, z: 2.42, h: 0.3, color: '#3a3634', ry: -1.9, smith: true }); // by the forge
  dwarf(b, rng, { x: -0.5, y: h(-0.5, 5.15) + 0.03, z: 5.15, h: 0.3, color: '#403a3c', ry: 2.6 });       // at the gate
  dwarf(b, rng, { x: -1.5, y: haY + 0.2 + 0.01, z: 4.05, h: 0.28, color: '#3a3430', ry: 0.4 });      // by house A
  dwarf(b, rng, { x: 2.1, y: hbY + 0.2 + 0.01, z: 5.3, h: 0.28, color: '#443c3a', ry: 1.1 });          // by house B
  dwarf(b, rng, { x: 2.6, y: h(2.6, 1.9) + 0.03, z: 1.9, h: 0.29, color: '#373330', ry: -2.0 });         // on the path

  // the raven on a rock
  const RV = [4.0, 1.3];
  const rvY = h(RV[0], RV[1]);
  rock(b, { x: RV[0], y: rvY + 0.34, z: RV[1], r: 0.42, h: 0.85, color: '#7d7468', rand: rng });
  b.geo(new THREE.SphereGeometry(1, 8, 6), { x: RV[0], y: rvY + 1.34, z: RV[1], sx: 0.085, sy: 0.07, sz: 0.13, color: '#1c1b1f', mat: M.smooth }); // body
  b.sphere(0.045, { x: RV[0] + 0.02, y: rvY + 1.44, z: RV[1] + 0.06, color: '#1c1b1f', mat: M.smooth, seg: 7 }); // head
  b.box(0.05, 0.02, 0.02, { x: RV[0] + 0.04, y: rvY + 1.435, z: RV[1] + 0.1, color: '#3a352e', mat: M.smooth }); // beak

  // felled logs + a stump
  b.cyl(0.09, 0.1, 0.8, { x: 2.9, y: h(2.9, 4.6) + 0.09, z: 4.6, rx: Math.PI / 2, color: '#6b4a30', mat: M.wood, seg: 8 });
  b.cyl(0.08, 0.09, 0.7, { x: 2.75, y: h(2.75, 4.75) + 0.08, z: 4.75, rx: Math.PI / 2, rz: 0.3, color: '#5f442a', mat: M.wood, seg: 8 });
  b.cyl(0.12, 0.14, 0.28, { x: 3.05, y: h(3.05, 4.45), z: 4.45, color: '#5f442a', mat: M.wood, seg: 8 });

  /* --------------------------- the path + scrub ------------------------ */
  for (let i = 0; i < PATH.length - 1; i++) {
    const a = PATH[i], c = PATH[i + 1];
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2;
    b.box(len + 0.08, 0.06, 0.36, { x: mx, y: h(mx, mz) + 0.035, z: mz, ry: -Math.atan2(c[1] - a[1], c[0] - a[0]), color: '#6e6455', mat: M.stone });
  }
  let scrub = 0, tries = 0;
  while (scrub < 13 && tries < 400) {
    tries++;
    const [sx, sz] = rng.inDisc(8.6, 0.8);
    if (h(sx, sz) > 1.95) continue;                 // keep off the mountain skirt
    if (Math.hypot(sx - AX, sz - AZ) < 4.8) continue;
    if (Math.hypot(sx - DOOR.x, sz - DOOR.z) < 1.7) continue;
    if (sz > 4.2 && sz < 5.2 && sx > -4 && sx < 3.5) continue; // the wall line
    if (nearTown(sx, sz) || nearPath(sx, sz)) continue;
    if (Math.hypot(sx - RV[0], sz - RV[1]) < 0.9) continue;
    b.sphere(rng.range(0.07, 0.13), {
      x: sx, y: h(sx, sz) + 0.02, z: sz, sx: 1.3, sy: 0.6,
      color: rng.pick(SCRUB_C), mat: M.flat, seg: 7,
    });
    scrub++;
  }

  /* ------------------------------ static build ------------------------- */
  const staticGroup = b.build();
  object.add(staticGroup);

  /* ------------------- animated: the hoard light ----------------------- */
  // a gold pool of light before the door (breathes)
  const poolX = DOOR.x + Math.sin(DOOR.ry) * 0.95, poolZ = DOOR.z + Math.cos(DOOR.ry) * 0.95;
  const pool = new THREE.Mesh(new THREE.CircleGeometry(0.75, 24), glowMat(HOARD, 1.05, { transparent: true, opacity: 0.55, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(poolX, h(poolX, poolZ) + 0.03, poolZ);
  pool.castShadow = pool.receiveShadow = false;
  object.add(pool);

  // the moon-rune arc + three rune dots above the door
  const arcGeo = new THREE.TorusGeometry(0.8, 0.045, 5, 26, Math.PI);
  arcGeo.translate(0, 1.72, 0);
  const dots = [];
  for (let i = 0; i < 3; i++) {
    const a = Math.PI * (0.22 + 0.28 * i);
    const g = new THREE.SphereGeometry(0.06, 8, 6);
    g.translate(Math.cos(a) * 0.8, 1.72 + Math.sin(a) * 0.8, 0);
    dots.push(g);
  }
  const runeGeo = mergeGeometries([arcGeo, ...dots], false);
  runeGeo.applyMatrix4(new THREE.Matrix4().makeRotationY(DOOR.ry).setPosition(DOOR.x, tY, DOOR.z));
  const arcMat = glowMat(RUNE, 0.95, { transparent: true, opacity: 0.5, depthWrite: false });
  const arcMesh = new THREE.Mesh(runeGeo, arcMat);
  arcMesh.castShadow = arcMesh.receiveShadow = false;
  object.add(arcMesh);

  // the forge fire core (flickers)
  const forgeFire = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), glowMat('#ffab52', 1.8, { transparent: true, opacity: 0.85, depthWrite: false }));
  forgeFire.position.set(1.4, fTop + 0.33, 2.6);
  forgeFire.castShadow = forgeFire.receiveShadow = false;
  object.add(forgeFire);
  // the brazier fire (flickers)
  const brazierFire = new THREE.Mesh(new THREE.SphereGeometry(0.09, 9, 7), glowMat('#ff9a45', 1.7, { transparent: true, opacity: 0.85, depthWrite: false }));
  brazierFire.position.set(BR[0], brY + 0.24, BR[1]);
  brazierFire.castShadow = brazierFire.receiveShadow = false;
  object.add(brazierFire);

  // a wisp of smoke from the forge chimney
  const smoke = [];
  const smokeMat = new THREE.MeshBasicMaterial({ color: '#cfc8ba', transparent: true, opacity: 0.42, depthWrite: false });
  const em = [3.72, sTop + 1.87, 2.77];
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), smokeMat.clone());
    m.visible = false;
    m.castShadow = m.receiveShadow = false;
    object.add(m);
    smoke.push({ m, off: i / 5, ph: rng.range(0, 6) });
  }

  // gold glints — the treasure trail from the door, twinkling
  const GLINTS = [[2.75, 0.35], [2.95, 0.8], [2.8, 1.3], [2.7, 1.8], [2.5, 2.45], [2.3, 3.2], [3.25, 0.75], [2.45, 1.05], [3.45, 1.3], [0.2, 4.65], [-0.85, 4.3], [1.45, 4.5], [3.15, 0.55], [0.9, 4.05], [1.15, 4.3], [2.6, 4.4]];
  const glintN = GLINTS.length;
  const glints = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.05, 0), glowMat('#ffcf6a', 1.6), glintN);
  glints.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  glints.castShadow = glints.receiveShadow = false;
  const glintMeta = [];
  for (let i = 0; i < glintN; i++) {
    const [gx, gz] = GLINTS[i];
    const gy = h(gx, gz) + 0.03;
    glintMeta.push({ x: gx, y: gy, z: gz, ph: rng.range(0, 6.3) });
    setInst(glints, i, gx, gy, gz, 1);
  }
  glints.instanceMatrix.needsUpdate = true;
  object.add(glints);

  // faint glints on the snow cap
  const SPARK = [];
  for (let i = 0; i < 9; i++) {
    const [sx, sz] = rng.inDisc(0.38);
    SPARK.push({ x: 0.35 + sx, y: 12.5 + rng.range(0, 0.95), z: -2.15 + sz, ph: rng.range(0, 6.3) });
  }
  const sparks = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.05, 0), glowMat('#e6eefc', 1.3), SPARK.length);
  sparks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  sparks.castShadow = sparks.receiveShadow = false;
  for (let i = 0; i < SPARK.length; i++) setInst(sparks, i, SPARK[i].x, SPARK[i].y, SPARK[i].z, 1);
  sparks.instanceMatrix.needsUpdate = true;
  object.add(sparks);

  /* -------------------------------- update ----------------------------- */
  function update(t, dt) {
    // the forge fire flickers
    const f1 = 0.75 + 0.25 * Math.sin(t * 5.4) * Math.sin(t * 2.3 + 1.1);
    forgeFire.scale.setScalar(1 + 0.3 * Math.sin(t * 6.2 + 0.4));
    forgeFire.material.opacity = 0.7 + 0.3 * f1;
    // the brazier flickers
    brazierFire.scale.setScalar(1 + 0.25 * Math.sin(t * 5.7 + 1.6));
    brazierFire.material.opacity = 0.65 + 0.35 * Math.sin(t * 4.9 + 2.0) * Math.sin(t * 2.7);
    // the hoard glow breathes very slightly
    pool.material.color.copy(HOARD).multiplyScalar(1.12 + 0.1 * Math.sin(t * 0.85));
    pool.material.opacity = 0.5 + 0.1 * Math.sin(t * 0.85 + 0.5);
    // the moon runes breathe
    arcMat.color.copy(RUNE).multiplyScalar(0.9 + 0.14 * Math.sin(t * 0.65));
    arcMat.opacity = 0.45 + 0.2 * Math.sin(t * 0.65 + 1.1);
    // a wisp of smoke rises from the forge chimney
    for (const p of smoke) {
      const k = (t * 0.11 + p.off) % 1;
      p.m.visible = true;
      p.m.position.set(em[0] + Math.sin(p.ph + k * 4) * 0.07 * k, em[1] + k * 1.3, em[2] + Math.cos(p.ph + k * 3.1) * 0.06 * k);
      const sc = 0.7 + k * 1.5;
      p.m.scale.set(sc, sc * 1.2, sc);
      p.m.material.opacity = 0.4 * Math.sin(Math.PI * Math.min(1, k * 1.5));
    }
    // the gold glints twinkle
    for (let i = 0; i < glintN; i++) {
      const g = glintMeta[i];
      const s = 0.55 + 0.45 * Math.sin(t * (0.7 + g.ph) + g.ph * 6.28);
      setInst(glints, i, g.x, g.y + Math.sin(t * 0.5 + g.ph * 4) * 0.02, g.z, Math.max(0.3, s));
    }
    glints.instanceMatrix.needsUpdate = true;
    // the snow cap glints faintly
    for (let i = 0; i < SPARK.length; i++) {
      const s = SPARK[i];
      setInst(sparks, i, s.x, s.y, s.z, 0.6 + 0.4 * Math.sin(t * (0.4 + s.ph) + s.ph * 5));
    }
    sparks.instanceMatrix.needsUpdate = true;
  }

  return { object, update };
}
