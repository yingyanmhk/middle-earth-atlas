// The Black Gate (Morannon) — the door of the dark land.
// One strong idea: a great iron rampart across a mountain gap — two huge dark
// towers flanking a massive iron gate, and before it a plain of ash and bones.
// The silhouette: two black towers with a huge dark gate between them, walling
// a pass between dark rock walls; through the ajar iron doors a faint red glow
// — the fires of the dark land. Vast, final, empty.
import { THREE, Builder, M, C, terrainDisc, fbm, hash2, rock, glowMat, solid } from '../kit.js';
import { figure, swayify } from './_ab_util.js';

const GATE_Z = -0.4;   // the Morannon's z (the pass runs along z)
const WALL_H = 6.0;    // height of the great rampart
const TOWER_X = 3.5;   // the two towers flank the gate
const TOWER_H = 12.0;  // tower shaft height
const DOOR_H = 4.3;    // height of the iron door leaves

/* ------------------------------ terrain ------------------------------ */

const h = (x, z) => {
  let y = 0.15 + 0.34 * fbm(x * 0.3 + 2.7, z * 0.3 + 8.1, { oct: 4, seed: 23 });
  // the pass floor rises toward the Morannon
  y += 0.42 * Math.exp(-((x * x) / 16 + ((z + 0.6) ** 2) / 26));
  // a shallow road groove from the gate southward (the way of the messengers)
  const road = Math.exp(-((x * x) / 1.15)) * Math.exp(-(((z - 3.4) ** 2) / 9));
  y -= 0.16 * road;
  // the feet of the mountain walls on either flank
  y += 0.8 * Math.exp(-(((x + 7.4) ** 2) / 12 + ((z - 0.6) ** 2) / 30));
  y += 0.8 * Math.exp(-(((x - 7.4) ** 2) / 12 + ((z - 0.6) ** 2) / 30));
  // low ridges of the near dark land behind the gate, leaving the pass open
  y += 0.55 * Math.exp(-(((x + 4.8) ** 2) / 14 + ((z + 7) ** 2) / 34));
  y += 0.55 * Math.exp(-(((x - 4.8) ** 2) / 14 + ((z + 7) ** 2) / 34));
  return Math.max(0.06, y);
};

const colorAt = (x, z, y) => {
  const j = hash2(Math.round(x * 2.6), Math.round(z * 2.6), 9);
  const sl = Math.abs(h(x + 0.06, z) - h(x - 0.06, z)) + Math.abs(h(x, z + 0.06) - h(x, z - 0.06));
  let base;
  if (Math.abs(x) < 0.45 && z > 0.5) base = 0x55504a;   // the dark road
  else if (sl > 0.5) base = 0x4a463f;                   // steep ash banks
  else if (y > 0.75) base = 0x6a655d;                   // higher ground
  else if (j < 0.5) base = 0x8a8378;                    // pale ash
  else if (j < 0.85) base = 0x9a9184;
  else base = 0x716c63;                                 // dark ash patches
  const c = Math.round(base + (j - 0.5) * 10);
  return '#' + c.toString(16).padStart(6, '0');
};

/* ------------------------ a dark square tower ------------------------ */

function gateTower(b, { x, z, ember, accent }) {
  // the black shaft (slightly deeper than wide, clasped by the rampart)
  b.box(1.5, TOWER_H, 1.7, { x, y: 0, z, color: '#2e2e36', mat: M.stone });
  // iron corner pilasters
  for (const ox of [-0.63, 0.63]) for (const oz of [-0.63, 0.63]) {
    b.box(0.24, TOWER_H, 0.24, { x: x + ox, y: 0, z: z + oz, color: '#33333c', mat: M.rough_metal });
  }
  // iron bands at intervals
  for (const by of [2.8, 5.6, 8.4]) {
    b.box(1.62, 0.16, 1.82, { x, y: by, z, color: '#3a3a42', mat: M.rough_metal });
  }
  // narrow slit windows, dark (a couple faintly ember-lit)
  for (const wy of [3.6, 6.2, 8.8, 11.2]) {
    const lit = ember && (wy === 8.8 || wy === 11.2);
    b.quad(0.09, 0.42, { x, y: wy, z: z + 0.86, mat: lit ? M.glow : M.smooth, color: lit ? accent : '#0d0d12', glow: 0.55 });
    b.quad(0.09, 0.42, { x, y: wy, z: z - 0.86, ry: Math.PI, mat: M.smooth, color: '#0d0d12' });
    b.quad(0.09, 0.42, { x: x + 0.76, y: wy, z, ry: Math.PI / 2, mat: M.smooth, color: '#0d0d12' });
    b.quad(0.09, 0.42, { x: x - 0.76, y: wy, z, ry: -Math.PI / 2, mat: M.smooth, color: '#0d0d12' });
  }
  // the crenellated crown
  b.box(1.9, 0.3, 1.9, { x, y: TOWER_H, z, color: '#2a2a32', mat: M.stone });
  for (const ox of [-0.6, 0, 0.6]) for (const oz of [-0.6, 0, 0.6]) {
    if (ox === 0 && oz === 0) continue;
    b.box(0.32, 0.55, 0.32, { x: x + ox, y: TOWER_H + 0.35, z: z + oz, color: '#2e2e36', mat: M.stone });
  }
}

/* --------------------------- the iron gate --------------------------- */

function gateDoors(b, rng) {
  // the door jambs (great iron columns, flush with the rampart's face)
  b.box(0.55, DOOR_H + 0.2, 1.6, { x: -2.44, y: 0, z: GATE_Z, color: '#2f2f38', mat: M.rough_metal });
  b.box(0.55, DOOR_H + 0.2, 1.6, { x: 2.44, y: 0, z: GATE_Z, color: '#2f2f38', mat: M.rough_metal });
  // the two great iron leaves, slightly ajar (both swing inward into the dark)
  for (const s of [-1, 1]) {
    b.push({ x: s * 2.2, y: 0, z: GATE_Z, ry: s * 0.18 });
    const leafX = s * 1.0; // leaf extends from the hinge toward the centre
    b.box(1.9, DOOR_H, 0.24, { x: leafX, color: '#34343c', mat: M.rough_metal });
    // vertical iron strips
    b.box(0.07, DOOR_H, 0.26, { x: leafX + s * 0.45, color: '#31313a', mat: M.rough_metal });
    b.box(0.07, DOOR_H, 0.26, { x: leafX - s * 0.45, color: '#31313a', mat: M.rough_metal });
    // rivet rows
    for (const ry of [0.7, 1.5, 2.3, 3.1]) {
      for (const off of [-0.5, 0, 0.5]) {
        if (s === -1 && off === 0 && (ry === 1.5 || ry === 2.3)) continue; // keep the ring clear
        b.sphere(0.045, { x: leafX + s * off, y: ry, z: 0.125, color: '#45454e', mat: M.rough_metal, seg: 7 });
      }
    }
    // the huge iron ring on the left leaf
    if (s === -1) {
      b.cyl(0.08, 0.09, 0.05, { x: leafX, y: 1.85, z: 0.1, color: '#2c2c34', mat: M.rough_metal, seg: 8 });
      b.torus(0.3, 0.05, { x: leafX, y: 1.85, z: 0.14, mat: M.rough_metal, color: '#40404a', rseg: 7, tseg: 20 });
    }
    b.pop();
  }
}

/* ------------------------------- build ------------------------------- */

export default function build({ rng, city, accent }) {
  const b = new Builder();
  const object = new THREE.Group();

  /* ------------------------------ terrain ------------------------------ */
  terrainDisc(b, { r: 10.5, rings: 60, segs: 96, height: h, colorAt, mat: M.stone, seed: 23 });

  /* ------------------- the dark rock walls of the pass ------------------ */
  const ROCK_COLS = ['#3a3a42', '#35353c', '#40404a', '#313138'];
  // [x, z, r, h] — the western and eastern walls of the pass, teeth by the
  // gate, and the near ridge of the dark land behind it. (rock() centres its
  // displaced blob at y + 0.35h and reaches ~0.94h below that, so each rock is
  // placed at ground + 0.58h to sit its base on the ash.)
  const ROCKS = [
    [-7.4, 1.4, 1.7, 2.6], [-8.7, 2.9, 1.5, 2.3], [-8.2, -1.0, 1.45, 2.0], [-9.1, 0.3, 1.15, 1.7],
    [-6.9, 4.1, 1.15, 1.4], [-6.1, -2.2, 1.05, 1.2],
    [7.4, 1.4, 1.7, 2.6], [8.7, 2.9, 1.5, 2.3], [8.2, -1.0, 1.45, 2.0], [9.1, 0.3, 1.15, 1.7],
    [6.9, 4.1, 1.15, 1.4], [6.1, -2.2, 1.05, 1.2],
    [-5.7, 1.2, 1.0, 1.6], [5.7, 1.2, 1.0, 1.6],
    [-6.7, -6.9, 1.55, 2.2], [6.7, -6.9, 1.55, 2.2], [-9.0, -5.4, 1.15, 1.5], [9.0, -5.4, 1.15, 1.5],
  ];
  for (const [rx, rz, rr, rh] of ROCKS) {
    rock(b, { x: rx, y: h(rx, rz) + 0.58 * rh, z: rz, r: rr, h: rh, color: rng.pick(ROCK_COLS), rand: rng, detail: 1 });
  }
  // scattered boulders on the ash plain
  for (let i = 0; i < 8; i++) {
    const [x, z] = rng.inDisc(8.2, 2.0);
    if (Math.abs(x) < 3.0 && z < 2.6) continue;               // keep the gate apron clear
    const s = rng.range(0.35, 0.6);
    rock(b, { x, y: h(x, z) + 0.58 * s, z, r: s, h: s * 1.2, color: rng.pick(['#4a4640', '#3f3c36', '#55514a']), rand: rng, detail: 1 });
  }

  /* --------------------- the great rampart (Morannon) ------------------ */
  // the wall's solid flanks (the towers stand within them)
  b.box(1.88, WALL_H, 1.6, { x: -3.66, y: 0, z: GATE_Z, color: '#3a3a42', mat: M.stone });
  b.box(1.88, WALL_H, 1.6, { x: 3.66, y: 0, z: GATE_Z, color: '#3a3a42', mat: M.stone });
  // the transom above the gate
  b.box(5.36, 1.6, 1.6, { x: 0, y: 4.4, z: GATE_Z, color: '#3a3a42', mat: M.stone });
  // merlons on the transom and the wall's outer ends
  for (const mx of [-2.2, -1.85, 1.85, 2.2]) b.box(0.35, 0.55, 0.5, { x: mx, y: WALL_H, z: GATE_Z, color: '#33333c', mat: M.stone });
  for (const mx of [-4.45, 4.45]) b.box(0.35, 0.55, 0.5, { x: mx, y: WALL_H, z: GATE_Z, color: '#33333c', mat: M.stone });
  // the great pointed arch over the gate (an iron helm)
  for (const s of [-1, 1]) {
    b.box(0.8, 3.64, 1.5, { x: s * 2.4, y: 4.6, z: GATE_Z, rz: s * 0.72, color: '#3a3a42', mat: M.rough_metal });
  }
  b.cone(0.16, 0.5, { x: 0, y: 7.3, z: GATE_Z, color: '#2a2a32', mat: M.rough_metal, seg: 8 });

  /* ------------------------ the two great towers ----------------------- */
  gateTower(b, { x: -TOWER_X, z: GATE_Z, ember: true, accent });
  gateTower(b, { x: TOWER_X, z: GATE_Z, ember: true, accent });

  /* --------------------------- the iron gate --------------------------- */
  gateDoors(b, rng);

  /* --------------------- the plain before the gate --------------------- */
  // the fallen of the last stand: scattered bones
  for (let i = 0; i < 24; i++) {
    const x = i < 3 ? rng.range(-3.2, 3.2) : rng.range(-8.4, 8.4);
    const z = i < 3 ? rng.range(1.0, 1.9) : rng.range(1.9, 8.4);
    b.cyl(0.035, 0.05, rng.range(0.2, 0.55), {
      x, y: h(x, z) + 0.03, z,
      rx: Math.PI / 2 + rng.range(-0.18, 0.18), ry: rng.range(0, Math.PI),
      color: rng.pick(['#cfc8b8', '#c2bba8', '#d8d2c2']), mat: M.smooth, seg: 8,
    });
  }
  // broken spears stuck in the ash
  const spear = (x, z, tilt) => {
    const sy = h(x, z);
    const tip = [x + Math.cos(tilt) * 0.24, sy + 0.9, z + Math.sin(tilt) * 0.24];
    b.rod([x, sy, z], tip, 0.02, { color: '#33333b', mat: M.rough_metal, seg: 5 });
    b.box(0.05, 0.14, 0.05, { x: tip[0], y: tip[1] - 0.05, z: tip[2], rx: 0.4, ry: tilt, color: '#2c2c34', mat: M.rough_metal });
  };
  spear(-3.4, 5.4, 2.6);
  spear(3.7, 6.5, 5.4);
  // a torn black banner caught on the nearer spear
  b.box(0.16, 0.09, 0.012, { x: -3.56, y: h(-3.4, 5.4) + 0.84, z: 5.52, rz: 0.25, color: '#16161c', mat: M.cloth });
  // ash heaps at the gate's foot
  for (const [ax, az] of [[-1.9, 1.75], [2.0, 1.6]]) {
    b.cone(rng.range(0.22, 0.3), rng.range(0.26, 0.34), { x: ax, y: h(ax, az), z: az, color: '#4a463f', mat: M.stone, seg: 9 });
  }
  // dark orc figures at the gate base, two with planted spears
  const ORCS = [[-2.7, 1.35, 0.3], [2.5, 1.5, -0.4], [-1.1, 1.65, 0.1], [1.6, 1.25, -0.2]];
  for (const [ox, oz, ory] of ORCS) {
    figure(b, { x: ox, y: h(ox, oz) + 0.01, z: oz, h: 0.32, color: '#2c2c30', skin: '#3f3f3a', ry: ory, mat: M.cloth });
  }
  for (const [ox, oz] of [[-2.7, 1.35], [2.5, 1.5]]) {
    b.rod([ox + 0.12, h(ox, oz) + 0.01, oz + 0.06], [ox + 0.16, h(ox, oz) + 0.67, oz + 0.1], 0.016, { color: '#33333a', mat: M.rough_metal, seg: 5 });
  }
  // the messenger of the West, alone before the gate: grey robe, gold staff
  const mx = 0.35, mz = 7.4;
  const my = h(mx, mz) + 0.01;
  figure(b, { x: mx, y: my, z: mz, h: 0.42, color: '#8d8d94', skin: '#d9d2c4', ry: Math.PI, mat: M.cloth });
  b.rod([mx + 0.12, my + 0.18, mz], [mx + 0.18, my + 0.74, mz], 0.015, { color: C.gold, mat: M.metal, seg: 5 });
  b.sphere(0.028, { x: mx + 0.19, y: my + 0.77, z: mz, mat: M.glow, color: C.gold, glow: 1.3, seg: 8 });

  /* --------------------------- static build ---------------------------- */
  const staticGroup = b.build();
  object.add(staticGroup);

  /* ------------------- banners of Mordor (they stir) ------------------- */
  const bannerB = new Builder();
  // great banners on the two towers
  for (const s of [-1, 1]) {
    const bx = s * TOWER_X;
    bannerB.cyl(0.028, 0.028, 1.7, { x: bx, y: TOWER_H + 0.9, z: GATE_Z, color: '#23232a', mat: M.stone, seg: 6 });
    bannerB.box(0.55, 0.48, 0.012, { x: bx, y: TOWER_H + 1.75, z: GATE_Z, color: '#16161c', mat: M.cloth });
  }
  // smaller banners on the rampart
  for (const s of [-1, 1]) {
    const bx = s * 3.7;
    bannerB.cyl(0.022, 0.022, 1.3, { x: bx, y: 6.0, z: GATE_Z, color: '#23232a', mat: M.stone, seg: 6 });
    bannerB.box(0.42, 0.36, 0.012, { x: bx, y: 6.95, z: GATE_Z, color: '#16161c', mat: M.cloth });
  }
  // the great banner over the gate itself
  bannerB.cyl(0.024, 0.024, 1.4, { x: 0, y: 6.0, z: GATE_Z, color: '#23232a', mat: M.stone, seg: 6 });
  bannerB.box(0.6, 0.44, 0.012, { x: 0, y: 6.9, z: GATE_Z, color: '#16161c', mat: M.cloth });
  const bannerGroup = bannerB.build();
  const sway = swayify(bannerGroup, { top: 14.6, len: 6.5, amp: 0.13, freq: 0.5, key: 'bg-banners' });
  object.add(bannerGroup);

  /* -------------------- the faint fires of the dark land ---------------- */
  const glows = [];
  const fireGlow = (w, hh, color, inten, x, y, z, o0, o1, spd, ph) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, hh),
      glowMat(color, inten, { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    m.position.set(x, y, z);
    m.material.opacity = o0;
    object.add(m);
    glows.push({ mesh: m, o0, o1, spd, ph });
  };
  fireGlow(6, 3.4, '#b03a2a', 1.25, 0, 7.6, -7.7, 0.045, 0.085, 0.3, 0.0);   // beyond the gate, on the horizon
  fireGlow(2.6, 4.5, '#c8402a', 1.25, 0, 2.25, -1.55, 0.09, 0.16, 0.36, 1.3); // firelight through the ajar doors
  const spill = new THREE.Mesh(
    new THREE.CircleGeometry(1.5, 24),
    glowMat('#b03a2a', 1.1, { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  spill.rotation.x = -Math.PI / 2;
  spill.position.set(0, h(0, 0.9) + 0.02, 0.9);
  spill.material.opacity = 0.035;
  object.add(spill);
  glows.push({ mesh: spill, o0: 0.035, o1: 0.06, spd: 0.28, ph: 2.1 });

  /* ----------------------- wind-blown ash motes ------------------------ */
  const N = 90;
  const moteGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3);
  const motes = [];
  for (let i = 0; i < N; i++) {
    const [x, z] = rng.inDisc(8.6);
    motes.push({ x, y: rng.range(0.45, 2.6), z, ph: rng.range(0, Math.PI * 2) });
    pos[i * 3] = x; pos[i * 3 + 1] = motes[i].y; pos[i * 3 + 2] = z;
  }
  moteGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const motePts = new THREE.Points(moteGeo, new THREE.PointsMaterial({
    color: '#9a948c', size: 0.055, transparent: true, opacity: 0.55, depthWrite: false, sizeAttenuation: true,
  }));
  motePts.frustumCulled = false;
  object.add(motePts);

  /* ------------------- carrion birds circling above -------------------- */
  const birdMat = solid('#17171c', { roughness: 0.9 });
  const birds = [];
  const makeBird = (radius, alt, speed, ph) => {
    const orbit = new THREE.Group();
    orbit.position.y = 14.7;
    const bank = new THREE.Group();
    const bird = new THREE.Group();
    const wings = new THREE.Group();
    const wb = new Builder();
    wb.box(0.34, 0.016, 0.13, { x: -0.23, z: 0.03, rz: -0.45, color: '#17171c', mat: M.flat });
    wb.box(0.34, 0.016, 0.13, { x: 0.23, z: 0.03, rz: 0.45, color: '#17171c', mat: M.flat });
    wings.add(wb.build());
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.34), birdMat);
    bird.add(body);
    bird.add(wings);
    bird.position.set(radius, alt, 0);
    bank.add(bird);
    orbit.add(bank);
    object.add(orbit);
    birds.push({ orbit, bank, wings, speed, ph });
  };
  makeBird(3.4, 0.4, 0.14, 0.0);
  makeBird(4.7, -0.2, 0.09, 2.4);

  /* ------------------------------- update ------------------------------ */
  function update(t, dt) {
    sway.uTime.value = t;                                  // the dark banners stir
    for (const g of glows) {                               // the fires breathe
      const k = 0.5 + 0.5 * Math.sin(t * g.spd + g.ph);
      g.mesh.material.opacity = g.o0 + (g.o1 - g.o0) * k;
    }
    for (const b of birds) {                               // birds circle above
      b.orbit.rotation.y = b.ph + t * b.speed;
      b.wings.rotation.z = 0.38 * Math.sin(t * 2.3 + b.ph * 3.1);
      b.bank.rotation.z = 0.1 * Math.sin(t * 0.9 + b.ph * 1.7);
    }
    for (let i = 0; i < N; i++) {                          // wind-blown ash
      const m = motes[i];
      pos[i * 3] = m.x + Math.sin(t * 0.1 + m.ph) * 0.9;
      pos[i * 3 + 1] = m.y + Math.sin(t * 0.16 + m.ph * 1.7) * 0.38;
      pos[i * 3 + 2] = m.z + Math.cos(t * 0.08 + m.ph * 1.3) * 0.7;
    }
    moteGeo.attributes.position.needsUpdate = true;
  }

  return { object, update };
}
