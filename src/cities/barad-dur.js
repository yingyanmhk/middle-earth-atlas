// Barad-dûr — the Dark Tower. One strong idea: a vast black fortress of iron
// and stone, and at its crown a burning Eye that watches over the dark land.
// The silhouette: a huge stepped black tower with sharp spiked corners, a
// great gate and a thin iron bridge over a black chasm — and at the very top
// one burning red-orange Eye, the only light in the dark. Vast, oppressive,
// burning, and always watching.
import { THREE, Builder, M, terrainDisc, fbm, hash2, bridge, rock, Lines, glowMat } from '../kit.js';
import { figure } from './_ab_util.js';

const shade = (hex, k) => new THREE.Color(hex).multiplyScalar(k);

/* the four tiers of the black tower (bottom sits at y0, top at y0+h) */
const LEVELS = [
  { w: 9.2, d: 9.2, h: 4.6, y0: 0.0,  wall: '#26262e', ledge: '#1f1f27' },
  { w: 6.9, d: 6.9, h: 3.5, y0: 4.6,  wall: '#2a2a33', ledge: '#212129' },
  { w: 4.8, d: 4.8, h: 3.0, y0: 8.1,  wall: '#2e2e38', ledge: '#23232c' },
  { w: 3.0, d: 3.0, h: 2.8, y0: 11.1, wall: '#2b2b34', ledge: '#20202a' },
];
const TOP = 13.9;      // crown of the tower (sum of the tier heights)
const EYE_Y = 15.9;    // the burning Eye hovers just above the pinnacle tip

const GATE_Z = 4.62;   // the great gate, on the +z face of the base tier
const CHASM_Z = 6.9;   // the deepest part of the black chasm
const BRIDGE = { from: 4.95, to: 9.35 }; // the iron bridge spans the chasm
const PIT = { x: -5.9, z: 2.6 };         // a forge-pit at the tower's foot

/* ------------------------------ the ash plain ----------------------------- */

const h = (x, z) => {
  let y = 0.16 * fbm(x * 0.5 + 3.7, z * 0.5 + 8.1, { oct: 4, seed: 41 }); // wind-rippled ash
  y += 0.28 * Math.exp(-(x * x + z * z) / 55);                            // gentle swell under the tower
  const ch = Math.exp(-(((z - CHASM_Z) / 1.55) ** 2)) * Math.max(0, 1 - (Math.abs(x) / 8.2) ** 2);
  y -= 1.7 * ch;                                                          // the chasm before the gate
  return Math.max(0.08, y);
};

const colorAt = (x, z, y, up) => {
  const j = hash2(Math.round(x * 3), Math.round(z * 3), 7);
  if (z > 5.0 && z < 8.4 && Math.abs(x) < 7.8) {                          // the chasm is near-black
    const c = Math.round(0x121017 + (j - 0.5) * 8);
    return '#' + c.toString(16).padStart(6, '0');
  }
  let base = Math.round(0x3a3630 + (j - 0.5) * 12);                       // #3a3630 ash
  const e = hash2(Math.round(x * 1.7), Math.round(z * 1.7), 23);
  if (e > 0.87) base = Math.round(base * 0.45 + 0x5e2a1c * 0.55);         // faint ember patches
  return '#' + base.toString(16).padStart(6, '0');
};

/* ------------------------------ small pieces ------------------------------ */

/* narrow slit windows on the four faces of a tier; only a few are dim-lit */
function slits(b, { w, d, y0, top, rng, lit = 0.16 }) {
  const n = Math.max(2, Math.floor((top - y0 - 0.8) / 0.95));
  for (let f = 0; f < 4; f++) {
    const along = f % 2 === 0 ? w : d;
    const off = (f % 2 === 0 ? d : w) / 2 + 0.016;
    const ang = f * Math.PI / 2;
    const nCols = Math.max(1, Math.floor(along / 1.6));
    for (let c = 0; c < nCols; c++) {
      const u = (c + 0.5) / nCols * along - along / 2;
      for (let j = 0; j < n; j++) {
        const v = y0 + 0.65 + j * ((top - y0 - 1.05) / Math.max(1, n));
        const lit_ = rng() < lit;
        const px = Math.sin(ang) * off + Math.cos(ang) * u;
        const pz = Math.cos(ang) * off - Math.sin(ang) * u;
        b.quad(0.09, 0.36, {
          x: px, y: v, z: pz, ry: ang,
          mat: lit_ ? M.glow : M.smooth,
          color: lit_ ? '#7a2f18' : '#0e0e14',
          glow: lit_ ? rng.range(0.3, 0.5) : 1,
        });
      }
    }
  }
}

/* small dark spikes at the tier corners — an evil Minas Tirith */
function cornerSpikes(b, { w, d, y, off = 0.28, rng, h = [0.5, 0.7] }) {
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    b.cone(rng.range(0.07, 0.11), rng.range(h[0], h[1]), {
      x: sx * (w / 2 + off), y, z: sz * (d / 2 + off),
      color: '#15151b', mat: M.smooth, seg: 5,
    });
  }
}

/* one tier: the block, its projecting ledge, and corner spikes */
function tier(b, lvl, rng) {
  const top = lvl.y0 + lvl.h;
  b.box(lvl.w, lvl.h, lvl.d, { x: 0, y: lvl.y0, z: 0, color: lvl.wall, mat: M.stone });
  b.box(lvl.w + 0.55, 0.24, lvl.d + 0.55, { x: 0, y: top - 0.12, z: 0, color: lvl.ledge, mat: M.stone });
  slits(b, { w: lvl.w, d: lvl.d, y0: lvl.y0, top, rng });
  cornerSpikes(b, { w: lvl.w, d: lvl.d, y: top, rng });
}

export default function build({ rng, city, accent }) {
  const b = new Builder();
  const object = new THREE.Group();

  /* ------------------------------ terrain ------------------------------ */
  terrainDisc(b, { r: 10.5, rings: 56, segs: 72, height: h, colorAt, mat: M.stone, seed: 41 });

  /* ------------------------ the black chasm bridge ---------------------- */
  // a thin iron bridge over the black pit, from the near plain to the gate
  const deckA = h(0, BRIDGE.from) + 0.05;
  const deckB = h(0, BRIDGE.to) + 0.05;
  bridge(b, {
    from: [0, deckA, BRIDGE.from], to: [0, deckB, BRIDGE.to],
    w: 0.75, rise: 0.3, color: '#1c1c24', mat: M.rough_metal, rails: true, segments: 12,
  });
  // a low abutment where the bridge meets the far bank
  b.box(1.0, 0.35, 0.5, { x: 0, y: h(0, 9.5) + 0.02, z: 9.5, color: '#1b1b22', mat: M.stone });
  // iron spikes along the chasm lip, beside the bridge
  for (const sx of [-2.6, -1.3, 0, 1.3, 2.6]) {
    b.cone(0.05, rng.range(0.55, 0.8), { x: sx, y: h(sx, 8.8), z: 8.8, color: '#15151b', mat: M.rough_metal, seg: 5 });
  }

  /* ------------------- the black tower: four stacked tiers ----------------- */
  for (const lvl of LEVELS) tier(b, lvl, rng);
  // the central pinnacle that holds the Eye
  b.cone(0.16, 1.5, { x: 0, y: TOP, z: 0, color: '#18181f', mat: M.smooth, seg: 6 });
  // four squat towers at the base tier's corners — an evil Minas Tirith
  const CT = { off: 4.15, r: 0.42, h: 3.5, y: LEVELS[0].h };
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const tx = sx * CT.off, tz = sz * CT.off;
    b.cyl(CT.r * 0.86, CT.r * 1.06, CT.h, { x: tx, y: CT.y, z: tz, color: '#26262e', mat: M.stone, seg: 8 });
    b.cone(CT.r * 0.34, 0.7, { x: tx, y: CT.y + CT.h, z: tz, color: '#17171d', mat: M.smooth, seg: 6 });
    for (const vy of [CT.y + 0.9, CT.y + 2.2]) {
      for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 3 / 2]) {
        b.quad(0.08, 0.3, {
          x: tx + Math.cos(a) * (CT.r + 0.014), y: vy, z: tz + Math.sin(a) * (CT.r + 0.014),
          ry: Math.PI / 2 - a, mat: M.smooth, color: '#0e0e14',
        });
      }
    }
  }

  /* ------------------- the great gate and its iron portcullis --------------- */
  {
    const gz = GATE_Z;
    // heavy jambs and lintel
    b.box(0.4, 3.1, 0.32, { x: -1.05, y: 0.15, z: gz, color: '#1d1d25', mat: M.stone });
    b.box(0.4, 3.1, 0.32, { x: 1.05, y: 0.15, z: gz, color: '#1d1d25', mat: M.stone });
    b.box(2.5, 0.5, 0.4, { x: 0, y: 3.15, z: gz, color: '#1d1d25', mat: M.stone });
    // the closed gate itself, black as a void
    b.quad(1.7, 2.7, { x: 0, y: 1.45, z: gz + 0.02, mat: M.smooth, color: '#0b0b10' });
    // iron studs
    for (const [sx, sy] of [[-0.6, 0.9], [0.6, 0.9], [-0.6, 2.0], [0.6, 2.0]]) {
      b.sphere(0.05, { x: sx, y: sy, z: gz + 0.04, color: '#33333c', mat: M.rough_metal, seg: 6 });
    }
    // the massive portcullis over the gate: vertical bars
    for (let i = 0; i < 7; i++) {
      b.box(0.06, 2.9, 0.05, { x: -0.9 + i * 0.3, y: 0.45, z: gz + 0.05, color: '#2a2a34', mat: M.rough_metal });
    }
    b.box(1.9, 0.09, 0.05, { x: 0, y: 2.35, z: gz + 0.05, color: '#2a2a34', mat: M.rough_metal });
    b.box(1.9, 0.09, 0.05, { x: 0, y: 0.45, z: gz + 0.05, color: '#2a2a34', mat: M.rough_metal });
    // banners of the Shadow (the accent), flanking the gate
    for (const s of [-1, 1]) {
      const bx = s * 2.3;
      b.cyl(0.03, 0.035, 2.3, { x: bx, y: 0.2, z: gz + 0.1, color: '#17171d', mat: M.rough_metal, seg: 5 });
      b.box(0.55, 0.34, 0.012, { x: bx + s * 0.28, y: 2.05, z: gz + 0.1, color: shade(accent, 0.95), mat: M.cloth, rz: s * 0.08 });
    }
  }

  /* ------------------------------ chains ------------------------------ */
  const L = new Lines();
  // chains hanging at the gate
  L.rope([-1.05, 3.3, GATE_Z + 0.2], [-1.35, 0.9, GATE_Z + 0.28], 0.16, '#3a3a42', 6);
  L.rope([1.05, 3.3, GATE_Z + 0.2], [1.35, 0.9, GATE_Z + 0.28], 0.16, '#3a3a42', 6);
  // long chains from the base tier's front corners down to the ground
  L.rope([4.9, 4.75, 4.9], [4.9, 0.6, 4.9], 0.1, '#3a3a42', 6);
  L.rope([-4.9, 4.75, 4.9], [-4.9, 0.6, 4.9], 0.1, '#3a3a42', 6);
  object.add(L.build(M.line));

  /* ------------------------- orcs at the gate ------------------------- */
  const orc = (x, z, ry, spear = false) => {
    const y = h(x, z) + 0.02;
    figure(b, { x, y, z, h: 0.3, color: '#1c1c22', skin: '#3d3a2e', ry, mat: M.cloth });
    if (spear) b.rod([x + 0.1, y, z], [x + 0.14, y + 0.75, z], 0.016, { color: '#2a2a32', mat: M.rough_metal, seg: 5 });
  };
  orc(0.85, 5.15, Math.PI);
  orc(-0.95, 5.2, Math.PI);
  orc(1.75, 4.98, Math.PI * 0.8, true);
  orc(-1.7, 5.0, Math.PI * 1.2, true);
  // a pair on the far bank, approaching the bridge
  orc(0.55, 9.75, Math.PI * 0.25);
  orc(-0.5, 9.8, Math.PI * 0.75, true);
  // one on the bridge itself
  const tOrc = (7.0 - BRIDGE.from) / (BRIDGE.to - BRIDGE.from);
  const deckOrc = deckA + (deckB - deckA) * tOrc + 0.3 * Math.sin(Math.PI * tOrc);
  figure(b, { x: 0.25, y: deckOrc + 0.02, z: 7.0, h: 0.3, color: '#1c1c22', skin: '#3d3a2e', ry: Math.PI * 0.55, mat: M.cloth });

  /* ------------------------- the forge-pit ------------------------- */
  const pitY = h(PIT.x, PIT.z);
  b.cyl(0.55, 0.65, 0.45, { x: PIT.x, y: pitY, z: PIT.z, color: '#1b1b22', mat: M.stone, seg: 10 });
  b.cyl(0.3, 0.34, 0.35, { x: PIT.x, y: pitY + 0.45, z: PIT.z, color: '#0c0c11', mat: M.stone, seg: 8 });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + rng.range(-0.3, 0.3);
    b.box(0.24, rng.range(0.12, 0.22), 0.24, {
      x: PIT.x + Math.cos(a) * 0.62, y: pitY + 0.3, z: PIT.z + Math.sin(a) * 0.62, ry: a,
      color: rng.pick(['#2c2c34', '#24242c']), mat: M.stone,
    });
  }

  /* ------------------------- rocks and iron spikes ------------------------- */
  for (let i = 0; i < 9; i++) {
    const [rx, rz] = rng.inDisc(9.2, 5.2);
    if (Math.abs(rz - CHASM_Z) < 2.6 && Math.abs(rx) < 7.6) continue; // keep the chasm clear
    if (Math.abs(rx) < 1.4 && rz > 4.4 && rz < 9.6) continue;         // keep the bridge clear
    if (Math.abs(rx - PIT.x) < 1.4 && Math.abs(rz - PIT.z) < 1.4) continue;
    const s = rng.range(0.5, 1.0);
    // rock() centres the stone at y + h*0.35 with half-height 0.75h, so the
    // bottom sits at y - 0.4h: raise y so the base rests on the ground (≥ y=0)
    const rh = s * rng.range(0.5, 1.1);
    rock(b, {
      x: rx, y: h(rx, rz) + 0.02 + 0.4 * rh, z: rz,
      r: s * rng.range(0.3, 0.55), h: rh,
      color: rng.pick(['#2e2e36', '#34343c', '#28282f']), rand: rng,
    });
  }
  for (let i = 0; i < 7; i++) {
    const a = rng.range(0, Math.PI * 2);
    const rr = rng.range(5.2, 8.6);
    const sx = Math.cos(a) * rr, sz = Math.sin(a) * rr;
    if (Math.abs(sz - CHASM_Z) < 2.4 && Math.abs(sx) < 7) continue;
    if (Math.abs(sx - PIT.x) < 1.3 && Math.abs(sz - PIT.z) < 1.3) continue;
    b.cone(rng.range(0.04, 0.06), rng.range(0.45, 0.8), {
      x: sx, y: h(sx, sz), z: sz, color: '#15151b', mat: M.rough_metal, seg: 5,
    });
  }

  /* ------------------------------ static ------------------------------ */
  const staticGroup = b.build();
  object.add(staticGroup);

  /* ------------------ the burning Eye (the one light) ------------------ */
  const eye = new THREE.Group();
  eye.position.set(0, EYE_Y, 0);
  const coreBase = new THREE.Color('#ff6a2a').multiplyScalar(2.0);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 14), glowMat('#ff6a2a', 2.0));
  eye.add(core);
  const hot = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), glowMat('#ffb04a', 2.4));
  eye.add(hot);
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(1.05, 18, 12),
    glowMat('#ff6a2a', 0.55, { transparent: true, opacity: 0.32, depthWrite: false }),
  );
  eye.add(halo);
  // thin radiating lines around the Eye
  const rays = new Lines();
  for (let i = 0; i < 24; i++) {
    const az = (i / 24) * Math.PI * 2;
    const el = ((i % 3) - 1) * 0.32;
    const dx = Math.cos(az) * Math.cos(el), dy = Math.sin(el), dz = Math.sin(az) * Math.cos(el);
    rays.seg([dx * 0.55, dy * 0.55, dz * 0.55], [dx * 1.9, dy * 1.9, dz * 1.9], '#ff6a2a', 1.25);
  }
  const rayMat = new THREE.LineBasicMaterial({ vertexColors: true, toneMapped: false, transparent: true, opacity: 0.8, depthWrite: false });
  const raysMesh = rays.build(rayMat);
  eye.add(raysMesh);
  object.add(eye);

  /* ------------------- embers rising from the chasm and pit ----------------- */
  const EMBERS = 20;
  const embPos = new Float32Array(EMBERS * 3);
  const embCol = new Float32Array(EMBERS * 3);
  const embSrc = new Float32Array(EMBERS * 3);
  const embRise = new Float32Array(EMBERS);
  const embPh = new Float32Array(EMBERS);
  for (let i = 0; i < EMBERS; i++) {
    const fromChasm = i < 12;
    const sx = fromChasm ? rng.range(-1.4, 1.4) : PIT.x + rng.range(-0.14, 0.14);
    const sz = fromChasm ? rng.range(5.6, 7.6) : PIT.z + rng.range(-0.14, 0.14);
    const sy = fromChasm ? 0.12 : pitY + 0.62;
    embSrc[i * 3] = sx; embSrc[i * 3 + 1] = sy; embSrc[i * 3 + 2] = sz;
    embRise[i] = fromChasm ? rng.range(2.6, 4.2) : rng.range(1.4, 2.4);
    embPh[i] = rng.range(0, 1);
    const c = new THREE.Color(rng.pick(['#ff8a3a', '#ff6a2a', '#e8541c', '#c23a10']));
    embCol[i * 3] = c.r * rng.range(0.55, 0.9);
    embCol[i * 3 + 1] = c.g * rng.range(0.5, 0.85);
    embCol[i * 3 + 2] = c.b * rng.range(0.4, 0.7);
  }
  const embGeo = new THREE.BufferGeometry();
  embGeo.setAttribute('position', new THREE.BufferAttribute(embPos, 3));
  embGeo.setAttribute('color', new THREE.BufferAttribute(embCol, 3));
  const embers = new THREE.Points(embGeo, new THREE.PointsMaterial({
    vertexColors: true, size: 0.055, transparent: true, opacity: 0.9,
    depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  }));
  embers.frustumCulled = false;
  object.add(embers);

  /* ------------------------- wind-blown ash ------------------------- */
  const ASH = 26;
  const ashPos = new Float32Array(ASH * 3);
  const ashCol = new Float32Array(ASH * 3);
  const ashBase = new Float32Array(ASH * 3);
  const ashPh = new Float32Array(ASH);
  for (let i = 0; i < ASH; i++) {
    const a = rng.range(0, Math.PI * 2);
    const rr = rng.range(1.5, 8.6);
    const ax = Math.cos(a) * rr, az = Math.sin(a) * rr;
    ashBase[i * 3] = ax; ashBase[i * 3 + 1] = rng.range(0.25, 2.4); ashBase[i * 3 + 2] = az;
    ashPos[i * 3] = ax; ashPos[i * 3 + 1] = ashBase[i * 3 + 1]; ashPos[i * 3 + 2] = az;
    ashPh[i] = rng.range(0, 6.3);
    const g = rng.range(0.42, 0.68);
    ashCol[i * 3] = g; ashCol[i * 3 + 1] = g; ashCol[i * 3 + 2] = g * 0.94;
  }
  const ashGeo = new THREE.BufferGeometry();
  ashGeo.setAttribute('position', new THREE.BufferAttribute(ashPos, 3));
  ashGeo.setAttribute('color', new THREE.BufferAttribute(ashCol, 3));
  const ash = new THREE.Points(ashGeo, new THREE.PointsMaterial({
    vertexColors: true, size: 0.05, transparent: true, opacity: 0.5, depthWrite: false,
  }));
  ash.frustumCulled = false;
  object.add(ash);

  /* ------------------------------ update ------------------------------ */
  function update(t, dt) {
    // the Eye pulses slowly — the only light in the dark land
    const k = 0.5 + 0.5 * Math.sin(t * 1.15);
    core.scale.setScalar(1 + 0.06 * Math.sin(t * 1.15 + 0.5));
    core.material.color.copy(coreBase).multiplyScalar(1 + 0.12 * Math.sin(t * 1.15));
    halo.material.opacity = 0.22 + 0.11 * k;
    halo.scale.setScalar(1 + 0.1 * k);
    rayMat.opacity = 0.6 + 0.26 * k;
    raysMesh.rotation.y = t * 0.05;
    // embers rise from the chasm and the forge-pit
    for (let i = 0; i < EMBERS; i++) {
      const kk = (t * 0.32 + embPh[i]) % 1;
      embPos[i * 3] = embSrc[i * 3] + Math.sin(kk * 5 + embPh[i] * 9) * 0.3 * kk;
      embPos[i * 3 + 1] = embSrc[i * 3 + 1] + kk * embRise[i];
      embPos[i * 3 + 2] = embSrc[i * 3 + 2] + Math.cos(kk * 4 + embPh[i] * 7) * 0.24 * kk;
    }
    embGeo.attributes.position.needsUpdate = true;
    // wind-blown ash drifts across the plain
    for (let i = 0; i < ASH; i++) {
      ashPos[i * 3] = ashBase[i * 3] + Math.sin(t * 0.06 + ashPh[i] * 2) * 1.9;
      ashPos[i * 3 + 1] = ashBase[i * 3 + 1] + 0.1 * Math.sin(t * 0.3 + ashPh[i] * 5);
      ashPos[i * 3 + 2] = ashBase[i * 3 + 2] + Math.cos(t * 0.045 + ashPh[i] * 3) * 1.2;
    }
    ashGeo.attributes.position.needsUpdate = true;
  }

  return { object, update };
}
