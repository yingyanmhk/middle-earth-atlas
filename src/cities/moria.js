// Moria (Khazad-dûm) — a kingdom of the deep, whose door opens only to moonlight.
// One strong idea: seen from the threshold — a great moon-written door in the
// mountain, a darkness full of receding pillars, and a single slender bridge
// over a faintly glowing abyss. Vast, dark, echoing, ancient.
import { THREE, Builder, M, C, terrainDisc, fbm, hash2, rock, bridge, glowMat } from '../kit.js';
import { figure, setInst } from './_ab_util.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const DOOR_Z = -5.6;                       // the Doors of Durin sit at this depth
const BLUE = new THREE.Color('#aebff5');   // moon-letter light

/* ------------------------------ terrain ------------------------------ */
const h = (x, z) => {
  let y = 0.28 + 0.16 * fbm(x * 0.5 + 3.1, z * 0.5 + 9.7, { oct: 4, seed: 31 });
  // the mountain mass rises steeply behind the door
  const ramp = THREE.MathUtils.smoothstep(-z, 6.4, 9.8);
  y += ramp * (4.4 + 4.2 * fbm(x * 0.16 + 2.2, z * 0.3 + 7.7, { oct: 3, seed: 41 }));
  // the old road climbs gently toward the threshold
  y += 0.28 * Math.exp(-(x * x + (z + 4.5) ** 2) / 42);
  return Math.max(0.12, y);
};

const colorAt = (x, z, y, up) => {
  const j = hash2(Math.round(x * 4), Math.round(z * 4), 17);
  if (y > 4.5) {
    const c = Math.round(0x33363e + (j - 0.5) * 16);            // high mountain — darker
    return '#' + c.toString(16).padStart(6, '0');
  }
  if (up > 0.7) {                                               // steep cliff faces catch the cool fill
    const c = Math.round(0x4d515b + (j - 0.5) * 14);
    return '#' + c.toString(16).padStart(6, '0');
  }
  const c = Math.round(0x41444c + (j - 0.5) * 16);              // grey-slate hall floor
  return '#' + c.toString(16).padStart(6, '0');
};

export default function build({ rng, city, accent }) {
  const b = new Builder();
  const object = new THREE.Group();

  /* ------------------------------- terrain ------------------------------- */
  terrainDisc(b, { r: 10.5, rings: 46, segs: 72, height: h, colorAt, mat: M.stone, seed: 31 });

  /* ------------------------- the mountain (back) ------------------------- */
  const ROCKS = [
    { x: 0.8, z: -8.0, r: 2.2, h: 5.2, c: '#3a3d46' },
    { x: -3.8, z: -7.8, r: 2.0, h: 4.8, c: '#343740' },
    { x: 5.6, z: -7.9, r: 2.1, h: 5.0, c: '#3a3d46' },
    { x: -7.6, z: -7.4, r: 1.9, h: 4.4, c: '#33363e' },
    { x: 8.6, z: -7.0, r: 1.7, h: 4.0, c: '#363a43' },
    { x: -1.6, z: -8.6, r: 1.6, h: 3.6, c: '#30333b' },
    { x: 3.4, z: -8.7, r: 1.5, h: 3.4, c: '#33363e' },
    { x: 9.0, z: -4.4, r: 1.2, h: 3.0, c: '#3d4149' },
    { x: -9.0, z: -4.6, r: 1.2, h: 2.9, c: '#3d4149' },
  ];
  for (const rk of ROCKS) {
    rock(b, { x: rk.x, y: h(rk.x, rk.z) + rk.h * 0.4 - 0.02, z: rk.z, r: rk.r, h: rk.h, color: rk.c, rand: rng });
  }

  /* ------------------------- the Doors of Durin ------------------------- */
  // two massive carved jambs
  for (const s of [-1, 1]) {
    b.box(1.3, 9.6, 1.3, { x: s * 2.6, y: 0, z: DOOR_Z, color: '#464a53', mat: M.stone });
    b.box(1.5, 0.22, 1.5, { x: s * 2.6, y: 9.58, z: DOOR_Z, color: '#51555f', mat: M.stone });
    for (const yy of [2.6, 4.3]) {                                // small accent rune-studs
      b.box(0.12, 0.12, 0.12, { x: s * 3.34, y: yy, z: DOOR_Z, color: accent, mat: M.stone });
    }
  }
  // the great arch between them
  b.geo(new THREE.TorusGeometry(2.6, 0.65, 6, 30, Math.PI), { x: 0, y: 5.2, z: DOOR_Z, color: '#464a53', mat: M.stone });
  // the dark mouth behind the arch — a slab of blackness
  b.box(3.95, 7.2, 0.32, { x: 0, y: 0, z: DOOR_Z - 0.28, color: '#0a0b0e', mat: M.stone });
  // two dark pillars just inside the mouth
  for (const s of [-1, 1]) {
    b.box(0.4, 4.0, 0.4, { x: s * 1.25, y: 0, z: DOOR_Z - 0.1, color: '#171a20', mat: M.stone });
    b.box(0.46, 0.14, 0.46, { x: s * 1.25, y: 3.97, z: DOOR_Z - 0.1, color: '#1f232b', mat: M.stone });
  }

  /* ------------------- the hall: receding rows of pillars ----------------- */
  const ROWS = [
    { z: 2.8, xs: 2.5, w: 0.85, h: 6.2, c: '#3f434c', cap: '#4b505a' },
    { z: -0.8, xs: 2.9, w: 0.68, h: 5.3, c: '#2c3038', cap: '#363b45' },
    { z: -2.8, xs: 3.1, w: 0.54, h: 4.6, c: '#1e2128', cap: '#282c34' },
  ];
  for (const row of ROWS) {
    for (const s of [-1, 1]) {
      b.box(row.w, row.h, row.w, { x: s * row.xs, y: 0, z: row.z, color: row.c, mat: M.stone });
      b.box(row.w + 0.14, 0.16, row.w + 0.14, { x: s * row.xs, y: row.h - 0.06, z: row.z, color: row.cap, mat: M.stone });
    }
  }

  /* --------------------- the chasm and Durin's Bridge -------------------- */
  const CH = { z: 1.0, hw: 1.6, y0: 0.14, yTop: 0.58, x0: -5.5, x1: 8.5 };
  const chH = CH.yTop - CH.y0, chCy = CH.y0 + chH / 2, chLen = CH.x1 - CH.x0 + 0.2;
  b.box(chLen, chH, 0.16, { x: (CH.x0 + CH.x1) / 2, y: chCy, z: CH.z - CH.hw - 0.08, color: '#15171b', mat: M.stone });
  b.box(chLen, chH, 0.16, { x: (CH.x0 + CH.x1) / 2, y: chCy, z: CH.z + CH.hw + 0.08, color: '#15171b', mat: M.stone });
  b.box(0.16, chH, CH.hw * 2 + 0.16, { x: CH.x0 - 0.08, y: chCy, z: CH.z, color: '#15171b', mat: M.stone });
  b.box(0.16, chH, CH.hw * 2 + 0.16, { x: CH.x1 + 0.08, y: chCy, z: CH.z, color: '#15171b', mat: M.stone });
  // faint deep glows at the bottom of the gulf (static)
  b.geo(new THREE.PlaneGeometry(0.9, 0.5), { x: -2.6, y: 0.18, z: CH.z + 0.4, rx: -Math.PI / 2, mat: M.glow, color: '#4f9a8f', glow: 1.35 });
  b.geo(new THREE.PlaneGeometry(0.7, 0.4), { x: 4.6, y: 0.18, z: CH.z - 0.3, rx: -Math.PI / 2, mat: M.glow, color: '#4f9a8f', glow: 1.35 });
  // the slender span, no rails
  bridge(b, { from: [0, 0.66, CH.z + CH.hw], to: [0, 0.66, CH.z - CH.hw], w: 0.3, rise: 0.1, color: '#4a4e58', mat: M.stone, rails: false, segments: 6 });
  for (const s of [-1, 1]) b.box(0.6, 0.26, 0.6, { x: 0, y: 0.4, z: CH.z + s * CH.hw, color: '#3f434c', mat: M.stone });

  /* -------------------------- the Tomb of Balin -------------------------- */
  const TB = { x: -7.5, z: 0.6 };
  b.box(3.4, 1.6, 0.3, { x: TB.x, y: 0, z: TB.z - 1.9, color: '#35383f', mat: M.stone });      // back wall
  b.box(0.3, 1.3, 4.1, { x: TB.x - 1.7, y: 0, z: TB.z + 0.2, color: '#3a3d45', mat: M.stone }); // left wall
  b.box(0.3, 0.9, 3.6, { x: TB.x + 1.7, y: 0, z: TB.z + 0.4, color: '#3a3d45', mat: M.stone }); // broken right wall
  b.box(1.5, 0.18, 0.8, { x: TB.x, y: 0, z: TB.z + 0.1, color: '#3d4048', mat: M.stone });     // base
  b.box(1.35, 0.4, 0.66, { x: TB.x, y: 0.19, z: TB.z + 0.1, color: '#4a4e58', mat: M.stone }); // lid
  b.box(1.35, 0.05, 0.66, { x: TB.x, y: 0.59, z: TB.z + 0.1, color: accent, mat: M.stone });   // carved band
  b.box(0.6, 0.42, 0.5, { x: TB.x + 0.95, y: 0, z: TB.z - 0.8, rx: 0.18, ry: 0.5, color: '#33363d', mat: M.stone }); // fallen stone
  b.cyl(0.025, 0.032, 0.5, { x: TB.x - 1.1, y: 0, z: TB.z + 1.45, color: '#3a3d45', mat: M.stone, seg: 6 }); // torch pole

  /* ----------------------- fallen stone, bones, helms --------------------- */
  b.box(0.7, 0.45, 0.55, { x: 2.3, y: 0, z: -4.4, rx: 0.1, ry: 0.3, color: '#3a3d44', mat: M.stone });
  b.box(0.5, 0.5, 0.5, { x: -2.9, y: 0, z: 3.0, rz: 0.14, ry: 0.7, color: '#3d4048', mat: M.stone });
  b.box(0.55, 0.4, 0.5, { x: 3.8, y: 0, z: 2.9, rx: 0.08, ry: -0.4, color: '#3a3d44', mat: M.stone });
  b.box(0.45, 0.45, 0.45, { x: -6.2, y: 0, z: -0.7, rz: 0.12, color: '#33363d', mat: M.stone });
  // broken column one (right of the hall)
  b.box(0.5, 0.14, 0.5, { x: 4.7, y: 0, z: -1.6, color: '#3d4048', mat: M.stone });
  b.cyl(0.13, 0.16, 0.5, { x: 4.55, y: 0.14, z: -1.6, color: '#3a3d44', mat: M.stone, seg: 8 });
  b.cyl(0.15, 0.15, 1.8, { x: 5.0, y: 0.2, z: -1.4, rx: Math.PI / 2 - 0.16, ry: 0.45, color: '#3f424a', mat: M.stone, seg: 8 });
  b.box(0.5, 0.14, 0.5, { x: 5.15, y: 0.22, z: -1.95, rx: 0.35, color: '#3d4048', mat: M.stone });
  // broken column two (left, by the chasm)
  b.box(0.42, 0.12, 0.42, { x: -2.3, y: 0, z: 3.4, color: '#3a3d44', mat: M.stone });
  b.cyl(0.12, 0.14, 1.4, { x: -2.05, y: 0.16, z: 3.25, rx: Math.PI / 2 - 0.2, ry: -0.5, color: '#3d4048', mat: M.stone, seg: 8 });
  // bones
  const BONE = '#a89d8a';
  const bones = [
    [-1.6, -4.5, 0.3], [-1.75, -4.4, 0.4], [1.9, -4.7, 0.2], [2.05, -4.6, -0.2],
    [-8.3, 0.9, 0.3], [-8.15, 0.95, -0.2], [-8.45, 0.8, 0.1], [2.9, 3.15, 0.3], [2.7, 3.2, -0.25],
  ];
  for (const [bx, bz, by] of bones) {
    b.cyl(0.022, 0.026, 0.16, { x: bx, y: by, z: bz, rx: rng.range(0.4, 1.4), rz: rng.range(0, 3.1), color: BONE, mat: M.stone, seg: 6 });
  }
  for (const [sx, sz] of [[-1.5, -4.35], [-8.2, 0.6], [3.0, 3.0]]) {
    b.sphere(0.034, { x: sx, y: 0.05, z: sz, sx: 1, sy: 0.8, color: BONE, mat: M.smooth, seg: 8 });
  }
  // helms
  for (const [hx, hz] of [[0.7, -4.5], [-2.1, 2.9], [-7.9, 1.3]]) {
    b.geo(new THREE.SphereGeometry(0.055, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2.4), { x: hx, y: 0.02, z: hz, color: '#4d5058', mat: M.metal });
  }

  /* --------------------- the company at the threshold --------------------- */
  const FIGZ = 4.6;
  const figs = [
    { x: -1.3, c: '#8a8a94', lantern: true },
    { x: -0.4, c: '#5d6b52' },
    { x: 0.5, c: '#7a6a52' },
    { x: 1.4, c: '#6a5a4a' },
  ];
  for (const f of figs) {
    const fy = h(f.x, FIGZ) + 0.03;
    figure(b, { x: f.x, y: fy, z: FIGZ, h: 0.33, color: f.c, ry: Math.PI });
    b.box(0.09, 0.12, 0.07, { x: f.x, y: fy + 0.26, z: FIGZ + 0.1, color: '#4d3f31', mat: M.cloth });
  }
  // the lantern (held out toward the door) + its little cap
  const LAN = { x: figs[0].x, y: h(figs[0].x, FIGZ) + 0.03 + 0.165, z: FIGZ - 0.1 };
  b.box(0.06, 0.06, 0.06, { x: LAN.x, y: LAN.y + 0.06, z: LAN.z, color: '#3a3d45', mat: M.stone });

  /* ------------------------------ static build ---------------------------- */
  const staticGroup = b.build();
  object.add(staticGroup);

  /* --------------------------- animated lights --------------------------- */
  // the moon-written lintel: a faint star-blue arc with a line of star-dots
  const arcGeo = new THREE.TorusGeometry(2.15, 0.08, 4, 40, Math.PI);
  arcGeo.translate(0, 5.2, -4.9);
  const dotGeos = [];
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.14 + 0.72 * (i / 6));
    const g = new THREE.SphereGeometry(0.085, 8, 6);
    g.translate(Math.cos(a) * 2.15, 5.2 + Math.sin(a) * 2.15, -4.9);
    dotGeos.push(g);
  }
  const lintel = mergeGeometries([arcGeo, ...dotGeos], false);
  const doorMat = glowMat(BLUE, 1.3);
  const doorGlow = new THREE.Mesh(lintel, doorMat);
  object.add(doorGlow);

  // faint moonlight on the threshold
  const moonMat = glowMat('#7485c9', 0.8, { transparent: true, opacity: 0.28, depthWrite: false });
  const moonPool = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.4), moonMat);
  moonPool.rotation.x = -Math.PI / 2;
  moonPool.position.set(0, 0.65, -4.3);
  object.add(moonPool);

  // the abyss glow, far below the bridge
  const abyssMat = glowMat('#2f6b63', 1.1, { transparent: true, opacity: 0.8, depthWrite: false });
  const abyss = new THREE.Mesh(new THREE.PlaneGeometry(CH.x1 - CH.x0 - 0.3, CH.hw * 2 - 0.5), abyssMat);
  abyss.rotation.x = -Math.PI / 2;
  abyss.position.set((CH.x0 + CH.x1) / 2, 0.17, CH.z);
  object.add(abyss);

  // far dwarf lamps (tiny warm points in the dark)
  const LAMPS = [
    [0, 2.9, DOOR_Z - 0.06],
    [-0.8, 2.2, DOOR_Z - 0.08],
    [0.8, 2.2, DOOR_Z - 0.08],
    [-3.1, 4.68, -2.8],
    [3.1, 4.68, -2.8],
  ];
  const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), glowMat(C.lamp, 1.55), LAMPS.length);
  lamps.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < LAMPS.length; i++) setInst(lamps, i, LAMPS[i][0], LAMPS[i][1], LAMPS[i][2], 1);
  lamps.instanceMatrix.needsUpdate = true;
  object.add(lamps);

  // the tomb's single torch
  const torchGlow = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), glowMat(C.lamp, 2.0, { transparent: true, opacity: 0.85 }));
  torchGlow.position.set(TB.x - 1.1, 0.55, TB.z + 1.45);
  const torchFlame = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.15, 7), new THREE.MeshStandardMaterial({ color: '#e8923c', roughness: 0.6, emissive: '#7a2f12', emissiveIntensity: 0.7 }));
  torchFlame.position.set(TB.x - 1.1, 0.575, TB.z + 1.45);
  object.add(torchGlow, torchFlame);

  // the lantern at the threshold
  const lanternGlow = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), glowMat(C.lamp, 1.9, { transparent: true, opacity: 0.9 }));
  lanternGlow.position.set(LAN.x, LAN.y, LAN.z);
  object.add(lanternGlow);

  // dust motes drifting in the dark
  const DUST_N = 24;
  const dust = new THREE.InstancedMesh(new THREE.SphereGeometry(0.022, 6, 5), new THREE.MeshBasicMaterial({ color: '#aab3d0', transparent: true, opacity: 0.4, depthWrite: false }), DUST_N);
  dust.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  dust.castShadow = false;
  const dustMeta = [];
  for (let i = 0; i < DUST_N; i++) {
    dustMeta.push({ x: rng.range(-4, 4), y: rng.range(0.6, 4.6), z: rng.range(-5, 4.5), spd: rng.range(0.1, 0.24), ph: rng.range(0, 6.3), s: rng.range(0.7, 1.5) });
  }
  object.add(dust);

  /* ------------------------------- update -------------------------------- */
  function update(t, dt) {
    // the door's star-light breathes
    doorMat.color.copy(BLUE).multiplyScalar(1.3 * (1 + 0.09 * Math.sin(t * 0.7)));
    moonMat.opacity = 0.26 + 0.06 * Math.sin(t * 0.7);
    // the abyss glows in a slow heartbeat
    abyssMat.opacity = 0.5 + 0.3 * Math.sin(t * 0.5);
    // the torch flame flickers
    const fl = 0.72 + 0.28 * Math.sin(t * 5.2) * Math.sin(t * 2.6 + 1.3);
    torchFlame.scale.set(1 + 0.22 * Math.sin(t * 6.4 + 0.5), fl, 1 + 0.22 * Math.sin(t * 5.7));
    torchGlow.scale.setScalar(0.85 + 0.25 * fl);
    torchGlow.material.opacity = 0.7 + 0.3 * fl;
    // the lantern sways a little
    lanternGlow.position.x = LAN.x + Math.sin(t * 0.9) * 0.02;
    lanternGlow.position.z = LAN.z + Math.cos(t * 0.8) * 0.015;
    lanternGlow.material.opacity = 0.75 + 0.2 * Math.sin(t * 2.4);
    // dwarf lamps twinkle far off
    for (let i = 0; i < LAMPS.length; i++) {
      const s = 0.75 + 0.3 * Math.sin(t * (1.3 + i * 0.45) + i * 2.1);
      setInst(lamps, i, LAMPS[i][0], LAMPS[i][1], LAMPS[i][2], s);
    }
    lamps.instanceMatrix.needsUpdate = true;
    // dust drifts
    for (let i = 0; i < DUST_N; i++) {
      const m = dustMeta[i];
      setInst(dust, i,
        m.x + Math.sin(t * m.spd + m.ph) * 0.55,
        m.y + Math.sin(t * m.spd * 0.7 + m.ph * 1.3) * 0.35,
        m.z + Math.cos(t * m.spd * 0.8 + m.ph) * 0.55,
        m.s);
    }
    dust.instanceMatrix.needsUpdate = true;
  }

  return { object, update };
}
