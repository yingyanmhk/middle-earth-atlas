// Minas Tirith — the White City of Gondor.
// One strong idea: seven circles of white stone, a stepped pyramid of walls
// climbing the spur of Mindolluin like a great white ship turned to stone —
// wide at the Great Gate, narrowing up to the Citadel and the White Tree.
import { THREE, Builder, M, C, terrainDisc, fbm, hash2, tower, house, arch, wallRing, tree, rock, scatter, solid, glowMat } from '../kit.js';
import { figure, setInst } from './_ab_util.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const WHITES = [C.ivory, C.plaster, '#ece3d0', '#e6dcc8', '#f0e6d5', '#e9dfcb', C.ivory];
const SLATES = ['#5d6474', '#4a4e58', '#34343a', '#6a6f7e', '#59617a'];
const DARK = '#22262e';
const ROBES = ['#e8e2d2', '#cfc9c0', '#8f939b', '#5d6474', '#a8956d'];

// the seven circles: (z, radius, drum rise, gate angle, gate half-width)
const TIERS = [
  { z: 3.5, R: 4.5, rise: 2.0, gate: Math.PI / 2, gw: 0.30 },
  { z: 2.3, R: 4.0, rise: 1.9, gate: Math.PI / 2 + 0.35, gw: 0.10 },
  { z: 1.1, R: 3.5, rise: 1.8, gate: Math.PI / 2 - 0.30, gw: 0.10 },
  { z: 0.0, R: 3.0, rise: 1.7, gate: Math.PI / 2 + 0.50, gw: 0.10 },
  { z: -1.2, R: 2.5, rise: 1.6, gate: Math.PI / 2 - 0.45, gw: 0.10 },
  { z: -2.5, R: 2.0, rise: 1.5, gate: Math.PI / 2 + 0.25, gw: 0.10 },
];
const CIT = { z: -3.8, R: 1.5, rise: 1.5, gate: Math.PI / 2, gw: 0.10 };

const BIRDS = [
  { R: 2.3, y: 14.8, spd: 0.16, ph: 0.0, s: 1.15 },
  { R: 2.9, y: 15.4, spd: 0.13, ph: 2.1, s: 1.0 },
  { R: 3.4, y: 14.4, spd: 0.11, ph: 4.2, s: 1.25 },
  { R: 2.6, y: 15.8, spd: 0.15, ph: 1.3, s: 0.9 },
  { R: 3.8, y: 15.0, spd: 0.10, ph: 5.1, s: 1.1 },
];

const angDist = (a, b) => {
  const d = Math.abs(((a - b) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
  return d;
};

const h = (x, z) => {
  let y = 0.16 * fbm(x * 0.3 + 1.7, z * 0.3 + 4.1, { oct: 4, seed: 23 });
  y += 15 * Math.exp(-((x - 0.8) ** 2 + (z + 8.2) ** 2) / 10); // Mindolluin
  y += 1.1 * Math.exp(-((x + 5.2) ** 2 + (z + 4.5) ** 2) / 26); // left flank
  y += 0.9 * Math.exp(-((x - 4.8) ** 2 + (z + 4.0) ** 2) / 24); // right flank
  const apron = Math.exp(-(x * x + (z - 2.0) ** 2) / 38); // level the city's foot
  y *= 1 - 0.88 * apron;
  return Math.max(0.04, y);
};

const colorAt = (x, z, y, up) => {
  const j = hash2(Math.round(x * 3), Math.round(z * 3), 7);
  if (Math.hypot(x, z - 2.2) < 5.6) {
    // dusty stone apron under the city
    const c = Math.round(0x8f8b78 + (j - 0.5) * 16);
    return '#' + c.toString(16).padStart(6, '0');
  }
  if (y > 3.0) {
    const k = Math.min(1, (y - 3.0) / 10);
    const c = Math.round(0x5d6474 + (0x6a7283 - 0x5d6474) * k + (j - 0.5) * 18);
    return '#' + c.toString(16).padStart(6, '0');
  }
  if (up > 0.72) {
    const c = Math.round(0x5d6474 + (j - 0.5) * 16);
    return '#' + c.toString(16).padStart(6, '0');
  }
  const c = Math.round(0x7a8868 + (j - 0.5) * 14);
  return '#' + c.toString(16).padStart(6, '0');
};

/* warm windows with a controlled glow (the city glows at dusk, not blowout) */
function win(b, { x = 0, y = 0, z = 0, w = 1.2, d = 1.2, h = 1.2, ry = 0, lit = 0.6, rng, glow = [1.4, 1.8] }) {
  b.push({ x, y, z, ry });
  const nRows = Math.max(1, Math.floor((h - 0.35) / 0.8));
  for (let f = 0; f < 4; f++) {
    const along = f % 2 === 0 ? w : d;
    const off = (f % 2 === 0 ? d : w) / 2 + 0.013;
    const nCols = Math.max(1, Math.min(3, Math.floor(along / 0.75)));
    const ang = f * Math.PI / 2;
    for (let i = 0; i < nCols; i++) {
      for (let j = 0; j < nRows; j++) {
        const u = (i + 0.5) / nCols * along - along / 2;
        const v = 0.42 + j * ((h - 0.65) / Math.max(1, nRows));
        if (v > h - 0.12) continue;
        const isLit = rng() < lit;
        const px = Math.sin(ang) * off + Math.cos(ang) * u;
        const pz = Math.cos(ang) * off - Math.sin(ang) * u;
        b.quad(0.2, 0.27, { x: px, y: v, z: pz, ry: ang, mat: isLit ? M.glow : M.smooth, color: isLit ? C.lamp : C.charcoal, glow: rng.range(glow[0], glow[1]) });
      }
    }
  }
  b.pop();
}

export default function build({ rng, city, accent }) {
  const b = new Builder();
  const object = new THREE.Group();

  /* ------------------------------- terrain ------------------------------- */
  terrainDisc(b, { r: 10.5, rings: 48, segs: 64, height: h, colorAt, mat: M.stone, seed: 23 });

  /* ------------------------ the seven circles ---------------------------- */
  let prevTop = 0;
  for (let i = 0; i < TIERS.length; i++) {
    const t = TIERS[i];
    t.drumY = i === 0 ? 0 : prevTop + 0.03;
    t.top = t.drumY + t.rise;
    t.floor = t.top + 0.02;
    t.riseNext = i < TIERS.length - 1 ? TIERS[i + 1].rise : CIT.rise;
    prevTop = t.top;
  }
  CIT.drumY = prevTop + 0.03;
  CIT.top = CIT.drumY + CIT.rise;
  CIT.floor = CIT.top + 0.02;

  // each circle is a solid white drum — the wall itself; the next drum steps
  // back and up, so the city terraces into the mountain like a great white ship.
  for (let i = 0; i < TIERS.length; i++) {
    const t = TIERS[i];
    b.cyl(t.R, t.R, t.rise, { x: 0, y: t.drumY, z: t.z, color: WHITES[i], mat: M.stone, seg: 40 });
  }
  b.cyl(CIT.R, CIT.R, CIT.rise, { x: 0, y: CIT.drumY, z: CIT.z, color: WHITES[6], mat: M.stone, seg: 40 });

  // crenellations along every drum rim
  const crenStep = 0.18;
  for (let i = 0; i < TIERS.length; i++) {
    const t = TIERS[i];
    const towerAngles = i === 0 ? [0.5, Math.PI - 0.5] : [t.gate - 0.45, t.gate + 0.45];
    for (let a = 0; a < Math.PI * 2; a += crenStep) {
      if (Math.round(a / crenStep) % 2 === 1) continue;
      if (angDist(a, t.gate) < t.gw + 0.07) continue;
      let near = false;
      for (const ta of towerAngles) if (angDist(a, ta) < 0.2) { near = true; break; }
      if (near) continue;
      b.box(0.32, 0.24, 0.3, { x: Math.cos(a) * t.R, y: t.floor, z: t.z + Math.sin(a) * t.R, ry: -a + Math.PI / 2, color: WHITES[i], mat: M.stone });
    }
  }

  // dark arrow slits on the drum walls, a few lit
  for (let i = 0; i < TIERS.length; i++) {
    const t = TIERS[i];
    for (let k = 0; k < 3; k++) {
      const a = rng.range(0.3, Math.PI - 0.3);
      const lit = rng.chance(0.4);
      const y = t.top - 0.5 - k * 0.45;
      if (y < t.drumY + 0.3) continue;
      b.quad(0.08, 0.34, { x: Math.cos(a) * (t.R + 0.02), y, z: t.z + Math.sin(a) * (t.R + 0.02), ry: Math.PI / 2 - a, mat: lit ? M.glow : M.smooth, color: lit ? C.lamp : C.charcoal, glow: 1.5 });
    }
  }

  // towers on each circle
  for (let i = 0; i < TIERS.length; i++) {
    const t = TIERS[i];
    if (i === 0) {
      // the Great Gate's flanking towers, on the ground
      for (const sx of [-2.05, 2.05]) {
        tower(b, { x: sx, y: 0.01, z: 8.0, r: 0.6, h: 4.6, cap: 'cone', wall: C.ivory, capColor: SLATES[0], seg: 10, rand: rng, lit: 0.25 });
      }
      // side towers on the first circle's rim
      for (const a of [0.5, Math.PI - 0.5]) {
        tower(b, { x: Math.cos(a) * t.R, y: 0.01, z: t.z + Math.sin(a) * t.R, r: 0.5, h: 3.4, cap: 'crenel', wall: C.ivory, seg: 10, rand: rng, lit: 0.2 });
      }
    } else {
      for (const da of [-0.45, 0.45]) {
        const a = t.gate + da;
        tower(b, { x: Math.cos(a) * t.R, y: t.floor, z: t.z + Math.sin(a) * t.R, r: 0.5, h: t.rise + 1.3, cap: i % 2 ? 'cone' : 'crenel', wall: WHITES[i], capColor: SLATES[i % SLATES.length], seg: 10, rand: rng, lit: 0.25 });
      }
    }
  }

  // gates: the Great Gate below, small gates above, each set differently
  for (let i = 0; i < TIERS.length; i++) {
    const t = TIERS[i];
    if (i === 0) {
      arch(b, { x: 0, y: 0.02, z: 8.05, w: 2.6, h: 3.0, t: 0.4, depth: 0.7, color: C.ivory, mat: M.stone });
      b.quad(1.6, 2.3, { x: 0, y: 1.3, z: 8.03, mat: M.smooth, color: DARK });
    } else {
      const gx = Math.cos(t.gate) * t.R, gz = t.z + Math.sin(t.gate) * t.R;
      arch(b, { x: gx, y: t.floor, z: gz, w: 1.1, h: 1.35, t: 0.2, depth: 0.34, ry: Math.PI / 2 - t.gate, color: C.ivory, mat: M.stone });
      b.quad(0.6, 0.9, { x: gx - 0.035 * Math.cos(t.gate), y: t.floor + 0.51, z: gz - 0.035 * Math.sin(t.gate), ry: Math.PI / 2 - t.gate, mat: M.smooth, color: DARK });
    }
  }

  // streets: houses on the exposed crescent of each circle
  for (let i = 0; i < TIERS.length; i++) {
    const t = TIERS[i];
    const next = i < TIERS.length - 1 ? TIERS[i + 1] : CIT;
    const inside = (x, z) => {
      if (x * x + z * z > (t.R - 0.65) ** 2) return false;
      const dz = z - (next.z - t.z); // next circle centre in local coords
      return x * x + dz * dz > (next.R + 0.3) ** 2;
    };
    const count = [4, 5, 5, 4, 3, 2][i];
    for (const p of scatter(rng, { count, rMin: 0.9, rMax: t.R - 0.65, size: [0.65, 1.0], gap: 0.2, inside, tries: 4000, align: 'grid' })) {
      const hh = rng.range(0.6, Math.min(1.3, t.riseNext - 0.45));
      const wall = rng.pick(WHITES);
      const roofC = rng.pick(SLATES);
      house(b, { x: p.x, y: t.floor, z: t.z + p.z, w: p.w, d: p.d, h: hh, ry: p.ry, roof: rng.pick(['gable', 'gable', 'gable', 'hip', 'flat']), wall, roofColor: roofC, win: false, r: rng });
      win(b, { x: p.x, y: t.floor, z: t.z + p.z, w: p.w, d: p.d, h: hh, ry: p.ry, lit: 0.6 + i * 0.03, rng, glow: [1.4, 1.8] });
    }
  }

  /* ------------------------------ the Citadel ---------------------------- */
  b.push({ y: CIT.floor + 0.02 });
  wallRing(b, { x: 0, z: CIT.z, r: CIT.R, h: 1.5, t: 0.3, seg: 32, towers: 5, gate: CIT.gate, gateWidth: 0.1, color: C.ivory, towerCap: 'crenel', mat: M.stone });
  b.pop();
  // round plaza
  b.disc(1.05, { x: 0, y: CIT.floor + 0.04, z: CIT.z, color: C.plaster, mat: M.smooth, seg: 24 });
  // the White Tree and its small fountain
  const TY = CIT.floor + 0.06;
  b.torus(0.5, 0.05, { x: 0, y: TY, z: CIT.z, color: C.ivory, mat: M.stone, rseg: 6, tseg: 20 });
  b.disc(0.43, { x: 0, y: TY + 0.01, z: CIT.z, color: '#9fb9c9', mat: M.water, seg: 20 });
  // silver trunk, pale withered crown
  b.cyl(0.035, 0.05, 0.85, { x: 0, y: TY + 0.02, z: CIT.z, color: C.silver, mat: M.smooth, seg: 7 });
  b.cyl(0.018, 0.026, 0.5, { x: 0.14, y: TY + 0.62, z: CIT.z + 0.06, rx: 0.3, ry: 0.5, color: C.silver, mat: M.smooth, seg: 6 });
  b.cyl(0.016, 0.024, 0.45, { x: -0.12, y: TY + 0.56, z: CIT.z - 0.07, rx: -0.35, ry: -0.6, color: C.silver, mat: M.smooth, seg: 6 });
  b.cyl(0.013, 0.018, 0.32, { x: 0.02, y: TY + 0.82, z: CIT.z + 0.1, rx: 0.5, color: C.silver, mat: M.smooth, seg: 6 });
  const blobs = [
    [0.1, TY + 0.88, CIT.z + 0.05, 0.17],
    [-0.08, TY + 0.84, CIT.z - 0.06, 0.15],
    [0.16, TY + 0.78, CIT.z - 0.02, 0.13],
    [-0.02, TY + 0.92, CIT.z + 0.01, 0.12],
  ];
  for (const [bx, by, bz, br] of blobs) {
    b.geo(new THREE.IcosahedronGeometry(1, 0), { x: bx, y: by, z: bz, sx: br, sy: br * 0.9, sz: br, color: rng.pick(['#eef1f4', '#dfe5ea', '#f4f6f8']), mat: M.smooth, ry: rng.range(0, 6) });
  }
  b.sphere(0.13, { x: 0, y: TY + 0.86, z: CIT.z, mat: M.glow, color: '#dfe8f0', glow: 1.25, seg: 10 });
  // the beacon of Ecthelion
  const BT = CIT.floor;
  b.cyl(0.42, 0.52, 5.0, { x: 0, y: BT, z: -4.3, color: C.ivory, mat: M.stone, seg: 12 });
  b.cyl(0.55, 0.42, 0.14, { x: 0, y: BT + 5.0, z: -4.3, color: C.ivory, mat: M.stone, seg: 12 });
  b.cone(0.26, 0.1, { x: 0, y: BT + 5.14, z: -4.3, rx: Math.PI, color: C.charcoal, mat: M.stone, seg: 10 });
  // citadel gate and its banner pole
  arch(b, { x: 0, y: CIT.floor, z: CIT.z + CIT.R - 0.02, w: 1.0, h: 1.5, t: 0.2, depth: 0.3, color: C.ivory, mat: M.stone });
  b.quad(0.6, 1.0, { x: 0, y: CIT.floor + 0.56, z: CIT.z + CIT.R - 0.06, mat: M.smooth, color: DARK });
  b.cyl(0.02, 0.025, 2.6, { x: 0.8, y: CIT.floor, z: CIT.z + CIT.R + 0.18, color: C.ash, mat: M.stone, seg: 5 });

  /* ------------------------ approach from the Pelennor ------------------- */
  b.box(1.5, 0.06, 2.2, { x: 0, y: h(0, 9.25) + 0.02, z: 9.25, color: '#c9b78a', mat: M.stone });
  for (const sx of [-1.35, 1.35]) {
    b.cyl(0.022, 0.03, 3.6, { x: sx, y: 0.01, z: 8.3, color: C.ash, mat: M.stone, seg: 5 });
  }

  /* ----------------------- Mindolluin and its pines ---------------------- */
  rock(b, { x: 0.5, y: h(0.5, -7.9) - 0.2, z: -7.9, r: 1.9, h: 3.8, color: '#6a7283', rand: rng });
  rock(b, { x: -2.4, y: h(-2.4, -7.5) - 0.2, z: -7.5, r: 1.6, h: 3.0, color: '#5d6474', rand: rng });
  rock(b, { x: 2.8, y: h(2.8, -7.7) - 0.2, z: -7.7, r: 1.3, h: 2.6, color: '#59617a', rand: rng });
  const PINES = [
    [-6.2, 1.0, 1.9], [-6.9, -1.2, 1.6], [-5.6, -4.2, 2.0], [6.6, 1.4, 1.7], [6.9, -0.8, 1.5], [5.9, -3.6, 1.9],
    [-5.6, -6.6, 1.8], [5.6, -6.0, 1.6], [2.6, -6.0, 1.9], [4.7, -6.4, 1.5], [-4.7, -5.6, 1.7], [-5.0, -8.2, 1.9],
    [-5.9, 6.8, 1.4], [6.2, 6.2, 1.5],
  ];
  for (const [px, pz, ph] of PINES) {
    tree(b, { x: px, y: h(px, pz) + 0.01, z: pz, h: ph, kind: 'pine', trunk: C.darkwood });
  }

  /* ------------------------------- figures ------------------------------ */
  const fig = (x, y, z, ry) => figure(b, { x, y, z, h: 0.3, color: rng.pick(ROBES), ry: ry ?? rng.range(0, 6) });
  fig(1.15, h(1.15, 8.7) + 0.02, 8.7, 3.0);
  fig(-1.1, h(-1.1, 8.9) + 0.02, 8.9, 0.2);
  fig(0.2, h(0.2, 8.85) + 0.02, 8.85, 0.8);
  fig(0.4, TIERS[0].floor + 0.01, 7.0, 2.6);
  fig(-0.6, TIERS[0].floor + 0.01, 6.9, 0.5);
  fig(0.6, TIERS[1].floor + 0.01, 5.1, 2.8);
  fig(-0.5, TIERS[1].floor + 0.01, 5.2, 0.4);
  fig(0.5, TIERS[2].floor + 0.01, 3.7, 2.5);
  fig(0.4, TIERS[3].floor + 0.01, 2.0, 0.6);
  fig(0.3, TIERS[4].floor + 0.01, 0.2, 2.7);
  fig(0.2, TIERS[5].floor + 0.01, -1.6, 0.5);
  fig(0.3, CIT.floor + 0.02, CIT.z + 0.3, 2.9);
  fig(-0.4, CIT.floor + 0.02, CIT.z - 0.25, 0.7);

  /* ------------------------------ static build -------------------------- */
  const staticGroup = b.build();
  object.add(staticGroup);

  /* ------------------------------ banners ------------------------------- */
  const banners = [];
  const addBanner = (x, y, z, poleH, w, hh, phase) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y + poleH - 0.1, z);
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), new THREE.MeshStandardMaterial({ color: accent, roughness: 0.9, metalness: 0, side: THREE.DoubleSide }));
    cloth.position.y = -hh / 2;
    pivot.add(cloth);
    object.add(pivot);
    banners.push({ pivot, phase });
  };
  addBanner(-1.35, 0.01, 8.3, 3.6, 0.6, 0.44, 0.0);
  addBanner(1.35, 0.01, 8.3, 3.6, 0.6, 0.44, 1.7);
  addBanner(0.8, CIT.floor, CIT.z + CIT.R + 0.18, 2.6, 0.42, 0.34, 3.1);

  /* -------------------------------- birds ------------------------------- */
  const gBody = new THREE.ConeGeometry(0.035, 0.18, 5);
  gBody.rotateZ(-Math.PI / 2);
  gBody.translate(0.06, 0, 0);
  const gWing = new THREE.BoxGeometry(0.22, 0.008, 0.07);
  const gWingL = gWing.clone(); gWingL.translate(0, 0.045, 0.05);
  const gWingR = gWing.clone(); gWingR.translate(0, 0.045, -0.05);
  const birdGeo = mergeGeometries([gBody, gWingL, gWingR], false);
  const birds = new THREE.InstancedMesh(birdGeo, new THREE.MeshStandardMaterial({ color: '#e9e9e5', roughness: 0.55 }), 5);
  birds.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  object.add(birds);
  const placeBirds = (t) => {
    for (let i = 0; i < BIRDS.length; i++) {
      const p = BIRDS[i];
      const a = t * p.spd + p.ph;
      setInst(birds, i, Math.cos(a) * p.R, p.y + 0.14 * Math.sin(t * 0.9 + p.ph), CIT.z + Math.sin(a) * p.R, p.s, a + Math.PI / 2, 0.16 * Math.sin(t * 1.1 + p.ph));
    }
    birds.instanceMatrix.needsUpdate = true;
  };
  placeBirds(0);

  /* ----------------------------- beacon fire ---------------------------- */
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 7), new THREE.MeshStandardMaterial({ color: '#e8923c', roughness: 0.6, emissive: '#7a2f12', emissiveIntensity: 0.7 }));
  flame.position.set(0, BT + 5.37, -4.3);
  const flameGlow = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), glowMat(C.ember, 2.1, { transparent: true }));
  flameGlow.position.set(0, BT + 5.3, -4.3);
  object.add(flame, flameGlow);

  /* ------------------------------- update ------------------------------- */
  function update(t, dt) {
    for (let i = 0; i < banners.length; i++) {
      const bb = banners[i];
      bb.pivot.rotation.y = Math.sin(t * 1.25 + bb.phase) * 0.09;
      bb.pivot.rotation.x = Math.sin(t * 1.6 + bb.phase * 1.3) * 0.03;
    }
    placeBirds(t);
    flameGlow.material.opacity = 0.72 + 0.28 * Math.sin(t * 1.3);
    flameGlow.scale.setScalar(0.9 + 0.15 * Math.sin(t * 1.6));
    flame.scale.set(1 + 0.08 * Math.sin(t * 1.9), 1 + 0.1 * Math.sin(t * 1.5 + 0.7), 1);
  }

  return { object, update };
}
