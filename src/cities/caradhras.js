// Caradhras — the Redhorn, cruellest of the Misty Mountains.
// One strong idea: a great red-grey shoulder, a narrow high pass crossed by
// a snow-packed road, and a small company turned back by the mountain's
// refusal — snow falls, wind streaks the pass, a cold camp waits below.
import { THREE, Builder, M, C, terrainDisc, fbm, hash2, rock, Lines, solid, glowMat } from '../kit.js';
import { figure, setInst } from './_ab_util.js';

const SADDLE = [-4.55, 0.4]; // the pass crossing (road crest)
const FIRE = [7.0, 0, -1.7]; // camp fire (y filled below)

const SNOW_C = ['#eef2f5', '#e2e9f1', '#f5f7fa', '#d9e2ec'];
const ROCK_C = ['#8a5a48', '#7a4a3c', '#945f4b', '#6e4438'];
const ROCK_D = ['#5f3a2f', '#6e4438', '#553428', '#7a4a3c'];
const SCRUB_C = ['#557a3e', '#4a6a38', '#5f7a3e', '#43552f', '#6a5a3c'];

/* ----------------------------------------------------------- terrain -- */

const h = (x, z) => {
  // rolling rocky lowland — the approach from the south-east
  let y = 0.55 * fbm(x * 0.3 + 5.1, z * 0.3 + 7.7, { oct: 4, seed: 23 });
  y += 0.4 * fbm(x * 0.11 + 2.3, z * 0.11 + 8.9, { oct: 3, seed: 71 });
  // the great red shoulder: a broad ridge running north-south, notched by the pass
  const d = x + 4.8;                                        // 0 at the ridge line
  const east = Math.exp(-(d * d) / 13);                     // gentle east slope
  const notch = 1 - 0.7 * Math.exp(-((z - 0.4) ** 2) / 3.4); // the pass gap
  y += 5.6 * (0.42 + 0.58 * notch) * (d < 0 ? 1 : east);
  // the Redhorn mass: a steep dome north-west of the pass
  y += 1.7 * Math.exp(-((x + 6.9) ** 2) / 4.5 - ((z + 1.6) ** 2) / 5.0);
  return Math.max(0.12, y);
};

const slope = (x, z) =>
  Math.hypot(h(x + 0.25, z) - h(x - 0.25, z), h(x, z + 0.25) - h(x, z - 0.25)) / 0.5;

const colorAt = (x, z, y, up) => {
  const hh = hash2(Math.round(x * 2.6), Math.round(z * 2.6), 31);
  const snowline = 3.9 + hh * 1.6; // uneven snowline: 3.9..5.5
  if (y > snowline) return SNOW_C[Math.floor(hash2(Math.round(x * 3), Math.round(z * 3), 33) * 4) % 4];
  if (y > 1.7) {
    const st = slope(x, z);
    const g = hash2(Math.round(x * 2.1), Math.round(z * 2.1), 35);
    // steep gullies catch snow below the line
    if (y > 2.1 && st > 1.1 && g < 0.45) return SNOW_C[Math.floor(g * 9) % 4];
    return (st > 0.85 ? ROCK_D : ROCK_C)[Math.floor(hash2(Math.round(x * 1.7), Math.round(z * 1.7), 37) * 4) % 4];
  }
  return SCRUB_C[Math.floor(hash2(Math.round(x * 4.1), Math.round(z * 4.1), 39) * 5) % 5];
};

/* ----------------------- rock columns (for snow/streak safety) ---------- */
const CRAGS = [
  { x: -6.4, z: -1.6, re: 2.3 }, // the Redhorn
  { x: -6.0, z: -3.8, re: 1.7 }, // south crag
  { x: -8.2, z: 0.4, re: 1.9 },  // west crag
  { x: -3.6, z: 1.7, re: 1.3 },  // gate crag
  { x: 2.3, z: -2.9, re: 0.8 },
  { x: 5.4, z: 1.8, re: 0.7 },
  { x: 6.9, z: -1.3, re: 0.8 },  // camp shelter
  { x: 7.5, z: -1.9, re: 0.7 },  // camp shelter
];
const nearCrag = (x, z, pad = 0) => CRAGS.some((r) => Math.hypot(x - r.x, z - r.z) < r.re + pad);

/* ---------------------------- the pass road ----------------------------- */
const ROAD = [
  [8.6, -0.6], [7.4, -0.2], [6.2, 0.15], [5.0, 0.45], [3.7, 0.7],
  [2.4, 0.85], [1.1, 0.95], [-0.2, 0.9], [-1.5, 0.7], [-2.7, 0.35],
  [-3.7, -0.05], [-4.3, -0.15], [-4.55, 0.4], [-5.2, 0.9], [-6.3, 1.5],
  [-7.4, 2.2], [-8.4, 2.9],
];

/** z of the road centreline at a given x (linear along the polyline) */
const roadZ = (x) => {
  if (x <= ROAD[0][0]) return ROAD[0][1];
  for (let i = 0; i < ROAD.length - 1; i++) {
    const a = ROAD[i], c = ROAD[i + 1];
    if (x <= c[0]) return a[1] + (c[1] - a[1]) * ((x - a[0]) / (c[0] - a[0]));
  }
  return ROAD[ROAD.length - 1][1];
};

/* ------------------------------------------------------------------------ */

function crag(b, rng, x, z, r, hh, tint, snow = true) {
  const base = h(x, z) + 0.24 * hh;
  rock(b, { x, y: base, z, r, h: hh, color: tint, rand: rng, detail: 1 });
  if (snow) {
    rock(b, {
      x: x + rng.range(-0.2, 0.2), y: base + hh * 0.34, z: z + rng.range(-0.2, 0.2),
      r: r * 0.5, h: hh * 0.38, color: rng.pick(['#eef2f5', '#e6ecf2']), rand: rng, detail: 1,
    });
  }
}

/** a line of thin wind streaks over the pass; returns a Lines instance */
function streaks(rng, n) {
  const L = new Lines();
  let made = 0, tries = 0;
  while (made < n && tries < 500) {
    tries++;
    const overPass = rng.chance(0.65);
    const x0 = overPass ? rng.range(-7.6, -3.3) : rng.range(-5.0, -3.2);
    const z0 = rng.range(-2.7, 2.7);
    if (nearCrag(x0, z0, 0.6)) continue;
    const y0 = Math.max(h(x0, z0), overPass ? 3.4 : 5.4) + rng.range(1.7, 3.2);
    const len = rng.range(1.2, 2.1);
    L.path(
      [[x0, y0, z0],
       [x0 + len * 0.45, y0 - rng.range(0.1, 0.22), z0 + rng.range(-0.1, 0.1)],
       [x0 + len, y0 - rng.range(0.04, 0.14), z0 + rng.range(-0.2, 0.05)]],
      '#d3deea', rng.range(0.75, 1.2));
    made++;
  }
  return L;
}

export default function build({ rng, city, accent }) {
  const b = new Builder();
  const object = new THREE.Group();

  /* ------------------------------- terrain ------------------------------ */
  terrainDisc(b, { r: 10.5, rings: 60, segs: 96, height: h, colorAt, mat: M.stone, seed: 47 });

  /* ------------------------------ the road ------------------------------ */
  for (let i = 0; i < ROAD.length - 1; i++) {
    const a = ROAD[i], c = ROAD[i + 1];
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2;
    const my = h(mx, mz);
    const hi = Math.min(1, Math.max(0, (my - 1.2) / 3.2)); // how high up the pass
    const w = 0.95 - hi * 0.28;                            // narrower on the crest
    const snowed = hi > 0.45 ? '#e7ecf1' : '#c6c0b2';      // packed snow above, rock below
    b.box(len, 0.07, w, {
      x: mx, y: my + 0.03, z: mz,
      ry: -Math.atan2(c[1] - a[1], c[0] - a[0]),
      rz: Math.atan2(h(c[0], c[1]) - h(a[0], a[1]), len), // tilt along the slope
      color: snowed, mat: M.stone,
    });
  }

  /* ------------------------------ the crags ----------------------------- */
  crag(b, rng, -6.4, -1.6, 1.5, 2.2, '#8a5a48'); // the Redhorn
  crag(b, rng, -6.0, -3.8, 1.1, 2.0, '#945f4b'); // south crag
  crag(b, rng, -8.2, 0.4, 1.2, 2.2, '#7a4a3c');  // west crag behind the pass
  crag(b, rng, -3.6, 1.7, 0.8, 1.5, '#84574a');  // gate crag on the east flank
  // boulders on the approach and the camp shelter
  crag(b, rng, 2.3, -2.9, 0.5, 0.9, '#7a4a3c', false);
  crag(b, rng, 5.4, 1.8, 0.45, 0.8, '#8a5a48', false);
  crag(b, rng, 6.9, -1.3, 0.5, 1.0, '#6e4438', false);
  crag(b, rng, 7.5, -1.9, 0.45, 0.9, '#84574a', false);

  /* ------------------------- cairn at the pass -------------------------- */
  const cy = h(SADDLE[0], SADDLE[1]) + 0.06;
  b.box(0.34, 0.09, 0.26, { x: SADDLE[0], y: cy, z: SADDLE[1], color: '#b3ac9e', mat: M.stone });
  b.box(0.26, 0.08, 0.2, { x: SADDLE[0], y: cy + 0.11, z: SADDLE[1], color: '#c0b9ab', mat: M.stone });
  b.box(0.18, 0.08, 0.14, { x: SADDLE[0], y: cy + 0.21, z: SADDLE[1], color: '#a8a194', mat: M.stone });
  b.cyl(0.012, 0.012, 0.52, { x: SADDLE[0], y: cy + 0.3, z: SADDLE[1], color: C.darkwood, mat: M.wood, seg: 5 });
  b.quad(0.12, 0.08, { x: SADDLE[0] + 0.06, y: cy + 0.46, z: SADDLE[1], color: accent, mat: M.cloth });

  /* --------------------------- thin scrub below ------------------------- */
  for (let i = 0; i < 16; i++) {
    const [bx, bz] = rng.inDisc(8.6, 1.2);
    if (h(bx, bz) > 1.3) continue;
    if (nearCrag(bx, bz)) continue;
    if (Math.abs(bz - roadZ(bx)) < 0.45) continue; // keep off the road
    b.sphere(rng.range(0.05, 0.11), {
      x: bx, y: h(bx, bz) + 0.02, z: bz, sx: 1.2, sy: 0.7,
      color: rng.pick(SCRUB_C), mat: M.flat, seg: 7,
    });
  }

  /* --------------------------- the company ------------------------------ */
  const COMPANY = [
    { x: -3.9, z: -0.08, ry: -0.5, cloak: '#557a3e', arms: 1 }, // leader, turned back
    { x: -2.6, z: 0.4, ry: -0.25, cloak: '#6e5a44', arms: 1 },
    { x: -1.2, z: 0.9, ry: -0.1, cloak: '#4a4a52', arms: 1 },
    { x: 0.4, z: 0.95, ry: 0.05, cloak: '#5d5345', arms: 0 },
  ];
  for (const p of COMPANY) {
    const py = h(p.x, p.z) + 0.06;
    figure(b, { x: p.x, y: py, z: p.z, h: 0.36, color: p.cloak, skin: '#3a3f46', ry: p.ry, arms: p.arms, mat: M.smooth });
    b.box(0.09, 0.13, 0.06, { x: p.x - 0.055, y: py + 0.17, z: p.z + 0.02, color: '#7a5a3a', mat: M.cloth });
  }
  // the pack animal — a small dark shape with a pack
  const A = { x: 1.9, z: 0.85 };
  const ay = h(A.x, A.z) + 0.06;
  b.sphere(0.16, { x: A.x, y: ay + 0.17, z: A.z, sx: 1.5, sy: 0.72, sz: 0.85, color: '#3f3a36', mat: M.smooth, seg: 10 });
  b.sphere(0.06, { x: A.x + 0.21, y: ay + 0.24, z: A.z, color: '#3f3a36', mat: M.smooth, seg: 8 });
  for (const [lx, lz] of [[0.08, -0.06], [0.08, 0.06], [-0.07, -0.05], [-0.07, 0.05]]) {
    b.cyl(0.018, 0.022, 0.2, { x: A.x + lx, y: ay + 0.08, z: A.z + lz, color: '#2e2a26', mat: M.smooth, seg: 5 });
  }
  b.box(0.15, 0.11, 0.09, { x: A.x - 0.02, y: ay + 0.33, z: A.z, color: '#6a4a2e', mat: M.cloth });

  /* ------------------------ the abandoned camp -------------------------- */
  FIRE[1] = h(FIRE[0], FIRE[2]) + 0.05;
  // a rock shelter: two boulders making a corner, facing away from the wind
  // (the shelter rocks themselves are added above); a bedroll, a cold fire
  b.cyl(0.045, 0.05, 0.32, { x: 6.35, y: h(6.35, -1.3) + 0.05, z: -1.3, rx: Math.PI / 2, color: accent, mat: M.cloth, seg: 8 });
  for (const [s, t] of [[0.9, 0.4], [2.5, 2.9], [4.4, 5.2]]) {
    b.rod([FIRE[0] + Math.cos(s) * 0.2, FIRE[1] + 0.02, FIRE[2] + Math.sin(s) * 0.2],
      [FIRE[0] + Math.cos(t) * 0.2, FIRE[1] + 0.06, FIRE[2] + Math.sin(t) * 0.2], 0.024,
      { color: '#5a3a24', mat: M.wood, seg: 5 });
  }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.4;
    b.sphere(0.042, { x: FIRE[0] + Math.cos(a) * 0.21, y: FIRE[1] + 0.02, z: FIRE[2] + Math.sin(a) * 0.21, color: '#4a3a2e', mat: M.stone, seg: 6 });
  }
  b.disc(0.5, { x: FIRE[0], y: FIRE[1] - 0.015, z: FIRE[2], mat: M.glow, color: '#ff7a3c', glow: 0.75, seg: 18 });

  /* ---------------------------- static build ---------------------------- */
  object.add(b.build());

  /* --------------------------- falling snow ----------------------------- */
  const N_SNOW = 150;
  const snow = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.055, 0), solid('#eef2f5', { roughness: 0.9 }), N_SNOW);
  snow.frustumCulled = false;
  snow.castShadow = snow.receiveShadow = false;
  const SP = [];
  for (let i = 0; i < N_SNOW; i++) {
    const big = i >= N_SNOW - 12;                  // a few larger flakes
    const mountain = i % 3 === 0;                  // ~1/3 over the pass and crest
    let x0, z0, tries = 0;
    do {
      tries++;
      if (mountain) { x0 = rng.range(-7.2, 0.8); z0 = rng.range(-2.6, 2.6); }
      else { x0 = rng.range(0.6, 9.0); z0 = rng.range(-6.0, 6.0); }
    } while (nearCrag(x0, z0) && tries < 30);
    const gh = h(x0, z0);
    let floor = mountain ? gh + 1.35 : gh + 0.5;
    if (tries >= 30) floor = Math.max(floor, 6.6); // safety: stay above the crest
    SP.push({
      x0, z0, floor, span: rng.range(2.8, 5.2),
      dx: rng.range(0.1, mountain ? 0.22 : 0.3),   // blown eastward as it falls
      dz: rng.range(-0.18, 0.22),
      speed: rng.range(0.1, 0.24), ph: rng.range(0, 1),
      wf: rng.int(1, 3), wa: rng.range(0.1, 0.3),
      scale: big ? rng.range(2.2, 3.0) : rng.range(0.8, 1.4),
    });
    setInst(snow, i, x0, floor, z0, SP[i].scale, 0, 0, 0, SP[i].scale * 0.8);
  }
  object.add(snow);

  /* ---------------------------- wind streaks ---------------------------- */
  const windA = new THREE.Group();
  windA.add(streaks(rng, 9).build(M.line));
  const windB = new THREE.Group();
  windB.add(streaks(rng, 7).build(M.line));
  object.add(windA, windB);

  /* ------------------------------ the fire ------------------------------ */
  const fire = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), glowMat('#ff8a3c', 1.25, { transparent: true, opacity: 0.9 }));
  fire.position.set(FIRE[0], FIRE[1] + 0.05, FIRE[2]);
  fire.castShadow = fire.receiveShadow = false;
  object.add(fire);

  /* ------------------------------- smoke -------------------------------- */
  const smoke = [];
  const smokeMat = new THREE.MeshBasicMaterial({ color: '#cfc8ba', transparent: true, opacity: 0.4, depthWrite: false });
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), smokeMat.clone());
    m.visible = false;
    m.castShadow = m.receiveShadow = false;
    object.add(m);
    smoke.push({ m, off: i / 4, ph: rng.range(0, 6) });
  }

  /* -------------------------------- update ------------------------------ */
  function update(t, dt) {
    // snow falls, blown east across the pass
    for (let i = 0; i < N_SNOW; i++) {
      const p = SP[i];
      const k = (t * p.speed + p.ph) % 1;
      const fall = 1 - k;
      const sw = Math.sin(k * Math.PI * 2 * p.wf + p.ph * 6.28) * p.wa;
      setInst(snow, i,
        p.x0 + p.dx * fall + sw,
        p.floor + p.span * fall,
        p.z0 + p.dz * fall + Math.cos(k * Math.PI * 2 * p.wf + p.ph * 4.1) * p.wa * 0.7,
        p.scale, 0, k * 1.7, 0, p.scale * 0.8);
    }
    snow.instanceMatrix.needsUpdate = true;
    // wind streaks drift east across the pass, then wrap
    windA.position.x = (t * 0.5) % 2.4;
    windA.position.z = Math.sin(t * 0.13) * 0.35;
    windB.position.x = (t * 0.32) % 2.2;
    windB.position.z = Math.sin(t * 0.11 + 1.3) * 0.3;
    // the camp fire flickers faintly
    const f = 0.75 + 0.25 * Math.sin(t * 5.2 + Math.sin(t * 2.3) * 1.4);
    fire.scale.setScalar(1 + 0.16 * Math.sin(t * 6.1 + 0.7));
    fire.material.opacity = f;
    // a thin wisp of smoke, blown flat
    for (const p of smoke) {
      const k = (t * 0.1 + p.off) % 1;
      const rise = k * 0.7;
      p.m.visible = true;
      p.m.position.set(FIRE[0] + rise * 0.5 + Math.sin(p.ph + k * 4) * 0.06, FIRE[1] + 0.08 + rise, FIRE[2] - rise * 0.2);
      const sc = 0.8 + k * 1.5;
      p.m.scale.set(sc, sc * 1.2, sc);
      p.m.material.opacity = 0.36 * Math.sin(Math.PI * Math.min(1, k * 1.5));
    }
  }

  return { object, update };
}
