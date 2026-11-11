// Weathertop (Amon Sûl) — the Hill of the Wind, and the broken watchtower of the
// North Kingdom. One strong idea: a bare windswept hilltop crowned by the broken
// ring of an ancient watchtower, with a single campfire burning in the hollow —
// and the dark closing in. The silhouette: a ruined stone ring on a bare hill
// against a cold sky. Cold, exposed, watched.
import { THREE, Builder, M, C, terrainDisc, fbm, hash2, Lines, rock, glowMat } from '../kit.js';

/* ------------------------------------------------------------ helpers -- */

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const shade = (hex, k) => new THREE.Color(hex).multiplyScalar(k);

// the wind blows toward -x / +z
const WIND = new THREE.Vector3(-0.83, 0, 0.55).normalize();

/* -------------------------------------------------------------- terrain -- */

const h = (x, z) => {
  const r = Math.hypot(x, z);
  // the hill: a broad swell with a flattened crown
  let y = 3.35 * (1 - smooth(2.6, 6.2, r));
  y += 0.45 * Math.exp(-(r * r) / 14);                        // gentle crown dome
  const n = fbm(x * 0.42 + 3.7, z * 0.42 + 9.1, { oct: 4, seed: 23 });
  y += 0.30 * n * (0.25 + 0.75 * (1 - smooth(1.2, 3.2, r))); // rough skin
  y += 0.25 * fbm(x * 0.16 + 8.8, z * 0.16 + 2.2, { oct: 3, seed: 47 }) * (1 - smooth(4.2, 6.4, r)); // broad undulation
  y += 0.30 * Math.exp(-((r - 2.4) ** 2) / 1.2);              // shoulder terrace
  y += 0.22 * Math.exp(-((r - 4.2) ** 2) / 2.0);              // lower shoulder
  y *= 1 - smooth(8.2, 10.2, r);                              // fade at the rim
  return Math.max(0.1, y);
};

const colorAt = (x, z, y, up) => {
  if (up < 0.2) return '#6f5f42';                             // the skirt: bare earth
  const r = Math.hypot(x, z);
  const j = hash2(Math.round(x * 2.5), Math.round(z * 2.5), 7);
  if (r < 2.3 && y > 2.2) {
    // the worn hilltop: bare earth flecked with pale stone
    const c = j < 0.55 ? 0x8f7d58 : j < 0.82 ? 0x9a948a : 0x7f6d4c;
    return '#' + c.toString(16).padStart(6, '0');
  }
  const dry = 0xb8a06a, dark = 0xa08a5c, pale = 0xc9b98a;
  let c = Math.round(dry + (dark - dry) * Math.min(1, y / 3.6) * 0.6 + (j - 0.5) * 18);
  if (j > 0.8) c = Math.round(c + (pale - c) * 0.55);         // pale dry patches
  return '#' + c.toString(16).padStart(6, '0');
};

/* -------------------------------------------------------------- layout -- */

const RING = 3.3;                      // the ruin ring
const SEG = 30;                        // ring wall slots
const TX = 1.15, TZ = -0.95;           // the broken tower
const FX = 0.05, FZ = 0.45;            // the campfire
const WALL_COLORS = ['#7d7268', '#8a7f74', '#6f675e', '#938a7e', '#5f5a52'];
const ROBE_COLORS = ['#2e2e36', '#3a3a44', '#26262e', '#33333d', '#2b2b33'];

export default function build({ rng, city, accent }) {
  const b = new Builder();
  const object = new THREE.Group();

  /* ------------------------------ terrain ------------------------------ */
  terrainDisc(b, { r: 10.5, rings: 60, segs: 96, height: h, colorAt, mat: M.stone, seed: 23 });

  /* --------------------------- the ruin ring --------------------------- */
  for (let i = 0; i < SEG; i++) {
    const a0 = (i / SEG) * Math.PI * 2, a1 = ((i + 1) / SEG) * Math.PI * 2;
    const am = (a0 + a1) / 2;
    const inGate = am > 0.7 && am < 1.15;                     // the broken gate, facing the viewer
    const forced = am > 3.25 && am < 3.55;                    // one tall far section (the royal trim)
    if (inGate || (!forced && rng.chance(0.3))) continue;     // gaps: the gate + random falls
    const tall = forced || rng.chance(0.22);
    const hgt = tall ? rng.range(1.7, 2.7) : rng.range(0.5, 1.2);
    const px = Math.cos(am) * RING, pz = Math.sin(am) * RING;
    const gy = h(px, pz);
    const len = 2 * RING * Math.sin(Math.PI / SEG) + 0.03;
    b.box(len, hgt, 0.45, { x: px, y: gy, z: pz, ry: -am + Math.PI / 2, color: rng.pick(WALL_COLORS), mat: M.stone });
    // ragged stumps on the taller sections
    if (tall) {
      const nst = rng.int(1, 2);
      for (let j = 0; j < nst; j++) {
        const off = rng.range(-len * 0.3, len * 0.3);
        b.box(0.32, rng.range(0.3, 0.62), 0.4, {
          x: px + Math.sin(am) * off, y: gy + hgt - 0.05, z: pz + Math.cos(am) * off,
          ry: -am + Math.PI / 2, rx: rng.range(-0.2, 0.2), color: rng.pick(WALL_COLORS), mat: M.stone,
        });
      }
    }
    // the faded gold band of the North Kingdom on the tall far wall
    if (forced) {
      b.box(0.34, 0.13, 0.05, {
        x: px - Math.cos(am) * 0.24, y: gy + hgt - 0.42, z: pz - Math.sin(am) * 0.24,
        ry: -am + Math.PI / 2, color: shade(accent, 0.95), mat: M.stone,
      });
    }
  }

  /* --------------------------- the broken tower ------------------------ */
  {
    const gy = h(TX, TZ);
    const TH = 6.0;
    b.cyl(1.0, 1.08, TH, { x: TX, y: gy, z: TZ, seg: 12, color: rng.pick(WALL_COLORS), mat: M.stone });
    // dark hollow shaft where the cap used to be
    b.cyl(0.78, 0.78, 0.1, { x: TX, y: gy + TH - 0.06, z: TZ, seg: 12, color: '#26262c', mat: M.stone });
    // the ragged crown: jagged teeth of broken stone
    for (let i = 0; i < 13; i++) {
      const a = (i / 13) * Math.PI * 2 + rng.range(-0.09, 0.09);
      b.box(0.32, rng.range(0.28, 1.1), 0.32, {
        x: TX + Math.cos(a) * rng.range(0.95, 1.28), y: gy + TH - 0.08, z: TZ + Math.sin(a) * rng.range(0.95, 1.28),
        ry: -a, rx: rng.range(-0.3, 0.3), rz: rng.range(-0.15, 0.15), color: rng.pick(WALL_COLORS), mat: M.stone,
      });
    }
    // the door, black against the firelight
    const dirF = new THREE.Vector2(FX - TX, FZ - TZ).normalize();
    b.quad(0.55, 1.3, { x: TX + dirF.x * 1.01, y: gy + 0.68, z: TZ + dirF.y * 1.01, ry: Math.atan2(dirF.x, dirF.y), mat: M.smooth, color: '#15151a' });
    // slit windows
    for (let i = 0; i < 3; i++) {
      const a = rng.range(0, Math.PI * 2);
      b.quad(0.1, 0.3, { x: TX + Math.cos(a) * 1.01, y: gy + 1.6 + i * 1.5, z: TZ + Math.sin(a) * 1.01, ry: Math.PI / 2 - a, mat: M.smooth, color: '#1c1c22' });
    }
    // two tattered banners of the North Kingdom, torn and faded (the accent)
    for (let i = 0; i < 2; i++) {
      const a = i === 0 ? 0.9 : 2.3;
      b.box(0.26, 1.0, 0.02, {
        x: TX + Math.cos(a) * 1.04, y: gy + TH - 0.92, z: TZ + Math.sin(a) * 1.04,
        ry: -a, rz: i === 0 ? 0.12 : -0.09, color: shade(accent, 0.85), mat: M.cloth,
      });
    }
    // rubble piled at the foot
    for (let i = 0; i < 7; i++) {
      const a = rng.range(0, Math.PI * 2);
      const rr = rng.range(1.15, 1.55);
      const ox = TX + Math.cos(a) * rr, oz = TZ + Math.sin(a) * rr;
      b.box(rng.range(0.22, 0.5), rng.range(0.12, 0.4), rng.range(0.2, 0.45), {
        x: ox, y: h(ox, oz) + rng.range(0.05, 0.3), z: oz,
        rx: rng.range(0.1, 1.4), ry: rng.range(0, Math.PI * 2), color: rng.pick(WALL_COLORS), mat: M.stone,
      });
    }
  }

  /* --------------------- the collapsed gateway arch --------------------- */
  {
    const a1 = 0.78, a2 = 1.05, AR = 3.55;
    const p1 = [Math.cos(a1) * AR, Math.sin(a1) * AR];
    const p2 = [Math.cos(a2) * AR, Math.sin(a2) * AR];
    const g1 = h(p1[0], p1[1]), g2 = h(p2[0], p2[1]);
    const h1 = rng.range(2.1, 2.5), h2 = rng.range(1.5, 1.9);
    b.box(0.42, h1, 0.42, { x: p1[0], y: g1, z: p1[1], ry: a1 - Math.PI / 2, color: rng.pick(WALL_COLORS), mat: M.stone });
    b.box(0.42, h2, 0.42, { x: p2[0], y: g2, z: p2[1], ry: a2 - Math.PI / 2, color: rng.pick(WALL_COLORS), mat: M.stone });
    // the broken lintel, fallen from the taller pillar
    const bx = (p1[0] + p2[0]) / 2 + 0.35, bz = (p1[1] + p2[1]) / 2 + 0.2;
    b.beam([p1[0], g1 + h1, p1[1]], [bx, g2 + 0.4, bz], 0.3, { color: rng.pick(WALL_COLORS), mat: M.stone });
    // fallen voussoirs at the base
    for (let i = 0; i < 3; i++) {
      const [vx, vz] = rng.inDisc(0.8, 0.3);
      const vpx = bx + vx, vpz = bz + vz;
      b.box(rng.range(0.22, 0.4), rng.range(0.18, 0.3), rng.range(0.2, 0.36), {
        x: vpx, y: h(vpx, vpz), z: vpz, rx: rng.range(0.2, 1.3), ry: rng.range(0, Math.PI * 2), color: rng.pick(WALL_COLORS), mat: M.stone,
      });
    }
  }

  /* ----------------------- the camp: fire ring, logs -------------------- */
  const gyF = h(FX, FZ);
  b.cyl(0.8, 0.9, 0.05, { x: FX, y: gyF + 0.004, z: FZ, color: '#3a322a', mat: M.stone, seg: 14 }); // charred ground
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + rng.range(-0.35, 0.35);
    const rr = rng.range(0.3, 0.48);
    const len = rng.range(0.7, 1.0);
    b.cyl(rng.range(0.075, 0.095), rng.range(0.085, 0.11), len, {
      x: FX + Math.cos(a) * rr, y: gyF + 0.1 + (i === 0 ? 0.09 : 0), z: FZ + Math.sin(a) * rr,
      rz: Math.PI / 2, ry: a, color: rng.pick(['#4d3a28', '#5a4430', '#3f2f20']), mat: M.wood, seg: 8,
    });
  }
  // bedroll and pack, set down hastily
  {
    const bedX = 1.55, bedZ = 1.3;
    b.cyl(0.15, 0.17, 1.0, { x: bedX, y: h(bedX, bedZ) + 0.16, z: bedZ, rz: Math.PI / 2, ry: 0.55, color: '#6e5642', mat: M.cloth, seg: 10 });
    const pkX = 1.2, pkZ = 1.0, pkY = h(pkX, pkZ);
    b.box(0.4, 0.48, 0.25, { x: pkX, y: pkY, z: pkZ, ry: 0.45, color: '#5a4636', mat: M.cloth });
    b.box(0.28, 0.12, 0.2, { x: pkX, y: pkY + 0.44, z: pkZ, ry: 0.45, color: '#46382c', mat: M.cloth });
    b.rod([pkX - 0.2, pkY + 0.08, pkZ - 0.02], [pkX + 0.2, pkY + 0.4, pkZ + 0.1], 0.028, { color: '#3a2c20', mat: M.cloth, seg: 5 });
  }
  // a sword stuck blade-down in the earth, hilt gold
  {
    const SX = -1.2, SZ = 0.55, sY = h(SX, SZ);
    b.box(0.09, 1.3, 0.03, { x: SX, y: sY + 0.05, z: SZ, rx: 0.05, color: C.silver, mat: M.metal });
    b.box(0.24, 0.05, 0.07, { x: SX, y: sY + 0.68, z: SZ, rx: 0.05, color: '#3f3a34', mat: M.rough_metal });
    b.sphere(0.045, { x: SX, y: sY + 0.75, z: SZ, rx: 0.05, color: accent, mat: M.metal, seg: 8 });
  }

  /* ---------------------- the hooded, watching figures ------------------ */
  const hoodedFigure = (x, z, hgt, color, ry, lean) => {
    const gy = h(x, z);
    b.push({ x, y: gy, z, ry, rx: lean });
    b.cyl(hgt * 0.09, hgt * 0.28, hgt * 0.62, { color, seg: 8, mat: M.cloth });            // robe
    b.cone(hgt * 0.15, hgt * 0.28, { y: hgt * 0.5, rx: 0.15, color: shade(color, 0.8), seg: 8, mat: M.cloth }); // hood
    b.sphere(hgt * 0.055, { y: hgt * 0.56, z: hgt * 0.055, color: '#0e0e12', mat: M.smooth, seg: 8 });          // face in shadow
    b.pop();
  };
  const FIG = [
    [0.35, 0.52, '#2e2e36', 0.16],
    [1.05, 0.5, '#3a3a44', 0.12],
    [1.75, 0.55, '#26262e', 0.14],
    [2.6, 0.49, '#33333d', 0.11],
    [-2.25, 0.53, '#2b2b33', 0.15],
  ];
  for (const [a, hgt, col, lean] of FIG) {
    const x = Math.cos(a) * 2.55, z = Math.sin(a) * 2.55;
    hoodedFigure(x, z, hgt, col, Math.atan2(-x, -z), lean);   // faces inward, heads lowered
  }

  /* --------------------- fallen blocks, rocks, grass -------------------- */
  {
    let placed = 0, tries = 0;
    while (placed < 26 && tries < 500) {
      tries++;
      const [x, z] = rng.inDisc(4.7, 0.3);
      const r = Math.hypot(x, z);
      if (r < 0.9) continue;                                  // keep the fire clear
      if (Math.hypot(x - FX, z - FZ) < 1.15) continue;        // camp clear
      if (Math.hypot(x - 1.35, z - 1.05) < 0.75) continue;    // bedroll/pack clear
      if (Math.hypot(x - TX, z - TZ) < 1.6) continue;         // tower foot clear
      const gy = h(x, z);
      const lying = rng.chance(0.62);
      const w = rng.range(0.26, 0.8), d = rng.range(0.22, 0.62), hgt = rng.range(0.16, 0.55);
      b.box(w, lying ? w * 0.32 : hgt, d, {
        x, y: gy, z,
        rx: lying ? rng.range(1.15, 1.6) : rng.range(0, 0.3),
        ry: rng.range(0, Math.PI * 2), rz: rng.range(-0.25, 0.25),
        color: rng.pick(WALL_COLORS), mat: M.stone,
      });
      placed++;
    }
  }
  for (let i = 0; i < 11; i++) {
    const [x, z] = rng.inDisc(8.6, 5.0);
    rock(b, { x, z, y: h(x, z), r: rng.range(0.3, 0.65), h: rng.range(0.5, 1.1), color: rng.pick(['#8b857a', '#7c766b', '#9a948a']), rand: rng, detail: 1 });
  }
  for (let i = 0; i < 15; i++) {
    const [x, z] = rng.inDisc(8.7, 4.5);
    b.cone(rng.range(0.05, 0.09), rng.range(0.3, 0.55), {
      x, y: h(x, z), z, rx: 0.3, ry: Math.atan2(WIND.x, WIND.z),
      color: rng.pick(['#a48f5e', '#b8a06a', '#8f7d52']), mat: M.flat, seg: 6,
    });
  }

  /* ---------------------- the road below, and the trail ----------------- */
  {
    let rx = -8.6;
    const last = [];
    while (rx <= 8.6) {
      last.push([rx, 7.7 + Math.sin(rx * 0.22) * 0.5]);
      rx += 1.9;
    }
    for (let i = 0; i < last.length - 1; i++) {
      const a = last[i], c = last[i + 1];
      const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
      const mid = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
      b.box(len, 0.07, 0.75, { x: mid[0], y: h(mid[0], mid[1]) + 0.03, z: mid[1], ry: -Math.atan2(c[1] - a[1], c[0] - a[0]), color: '#9a8558', mat: M.stone });
    }
    const TRAIL = [[3.4, 4.6], [2.9, 3.4], [2.55, 2.9], [2.35, 2.35]];
    for (let i = 0; i < TRAIL.length - 1; i++) {
      const a = TRAIL[i], c = TRAIL[i + 1];
      const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
      const mid = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
      b.box(len, 0.06, 0.5, { x: mid[0], y: h(mid[0], mid[1]) + 0.025, z: mid[1], ry: -Math.atan2(c[1] - a[1], c[0] - a[0]), color: '#8a7650', mat: M.stone });
    }
  }

  /* --------------------- cold pale light on the horizon ----------------- */
  {
    const N = 18, R = 9.55, a0 = 2.75, a1 = 4.55;
    const pos = new Float32Array((N + 1) * 2 * 3);
    const col = new Float32Array((N + 1) * 2 * 3);
    const idx = [];
    const cBase = new THREE.Color('#aabdd9');
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const a = a0 + (a1 - a0) * u;
      const taper = Math.sin(Math.PI * u);
      const x = Math.cos(a) * R, z = Math.sin(a) * R;
      const gy = Math.max(0.12, h(x, z)) + 0.02;
      const top = gy + 1.7 + 0.6 * taper;
      const k = 1.15 * taper;
      const p = i * 6, q = p + 3;
      pos[p] = x; pos[p + 1] = gy; pos[p + 2] = z;
      pos[q] = x; pos[q + 1] = top; pos[q + 2] = z;
      col[p] = cBase.r * k; col[p + 1] = cBase.g * k; col[p + 2] = cBase.b * k;
      col[q] = cBase.r * k * 0.45; col[q + 1] = cBase.g * k * 0.45; col[q + 2] = cBase.b * k * 0.45;
      if (i < N) idx.push(i * 2, i * 2 + 1, (i + 1) * 2, (i + 1) * 2, i * 2 + 1, (i + 1) * 2 + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setIndex(idx);
    const band = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: THREE.DoubleSide }));
    band.frustumCulled = false;
    object.add(band);
  }

  /* ----------------------- wind-blown grass streaks --------------------- */
  {
    const L = new Lines();
    const cols = ['#cdbb8c', '#b8a06a', '#a08a5c'];
    let n = 0, tries = 0;
    while (n < 40 && tries < 300) {
      tries++;
      const [x, z] = rng.inDisc(8.9, 1.8);
      if (Math.hypot(x, z) < 4.3) continue;
      const gy = h(x, z) + 0.03;
      const len = rng.range(0.55, 1.3);
      const bend = rng.range(0.05, 0.18);
      const p0 = [x + WIND.x * len, gy + rng.range(-0.02, 0.03), z + WIND.z * len];
      const p1 = [x + WIND.x * len * 0.5, gy + 0.015 + bend, z + WIND.z * len * 0.5];
      const p2 = [x, gy + 0.005, z];
      L.path([p0, p1, p2], rng.pick(cols), 0.5);
      n++;
    }
    object.add(L.build(M.line));
  }

  /* ------------------------------ static ------------------------------- */
  const staticGroup = b.build();
  object.add(staticGroup);

  /* ------------------------- the fire, animated ------------------------ */
  const flame = [];
  const mk = (r, col, int, opts = {}) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), glowMat(col, int, opts));
    object.add(m);
    return m;
  };
  const core = mk(0.14, '#ff8a3a', 2.5);
  core.position.set(FX, gyF + 0.24, FZ);
  const mid = mk(0.22, '#ffb066', 1.7);
  mid.position.set(FX, gyF + 0.16, FZ);
  const halo = mk(0.5, '#ff9a45', 1.05, { transparent: true, opacity: 0.22, depthWrite: false });
  halo.position.set(FX, gyF + 0.2, FZ);
  flame.push({ m: core, ph: 0.0 }, { m: mid, ph: 2.1 }, { m: halo, ph: 4.3 });

  const fireLight = new THREE.PointLight('#ff7a2f', 7, 10, 2);
  fireLight.position.set(FX, gyF + 0.5, FZ);
  object.add(fireLight);

  // embers
  const EMB = 30;
  const ePos = new Float32Array(EMB * 3);
  const eCol = new Float32Array(EMB * 3);
  const ePh = new Float32Array(EMB);
  for (let i = 0; i < EMB; i++) ePh[i] = rng.range(0, 1);
  const eGeo = new THREE.BufferGeometry();
  eGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3));
  eGeo.setAttribute('color', new THREE.BufferAttribute(eCol, 3));
  const eMat = new THREE.PointsMaterial({ size: 0.1, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, toneMapped: false });
  const embers = new THREE.Points(eGeo, eMat);
  embers.frustumCulled = false;
  object.add(embers);

  // slow smoke, drifting with the wind
  const smoke = [];
  const smokeMat = new THREE.MeshBasicMaterial({ color: '#8a8176', transparent: true, opacity: 0.3, depthWrite: false });
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), smokeMat.clone());
    m.visible = false;
    object.add(m);
    smoke.push({ m, off: i / 7 });
  }

  function update(t, dt) {
    // the fire breathes
    for (const f of flame) {
      const s = 1 + 0.11 * Math.sin(t * 8.5 + f.ph) + 0.06 * Math.sin(t * 16.7 + f.ph * 3.1);
      f.m.scale.set(s, s * (1 + 0.07 * Math.sin(t * 5.3 + f.ph)), s);
    }
    halo.material.opacity = 0.18 + 0.09 * Math.sin(t * 6.9 + 1.7);
    fireLight.intensity = 6.2 + 1.6 * Math.sin(t * 7.3) + 0.9 * Math.sin(t * 12.1 + 1.4);
    // embers rise
    for (let i = 0; i < EMB; i++) {
      const k = (t * 0.5 + ePh[i]) % 1;
      const w = Math.sin(k * 9 + ePh[i] * 17) * 0.16 * k + Math.sin(k * 23 + ePh[i] * 7) * 0.05 * k;
      ePos[i * 3] = FX - 0.12 * k + w;
      ePos[i * 3 + 1] = gyF + 0.16 + k * 1.85;
      ePos[i * 3 + 2] = FZ + Math.cos(k * 7 + ePh[i] * 13) * 0.12 * k;
      const fade = Math.pow(Math.sin(Math.PI * Math.min(1, k * 1.15)), 0.85);
      const fl = 0.55 + 0.45 * Math.sin(k * 42 + ePh[i] * 91);
      eCol[i * 3] = 0.9 * fade * fl;
      eCol[i * 3 + 1] = 0.55 * fade * fl;
      eCol[i * 3 + 2] = 0.16 * fade * fl;
    }
    eGeo.attributes.position.needsUpdate = true;
    eGeo.attributes.color.needsUpdate = true;
    // smoke drifts with the wind
    for (const p of smoke) {
      const k = (t * 0.13 + p.off) % 1;
      p.m.visible = true;
      p.m.position.set(
        FX - 0.6 * k + Math.sin(k * 4 + p.off * 9) * 0.2 * k,
        gyF + 0.2 + k * 2.6,
        FZ + 0.4 * k + Math.cos(k * 3.2 + p.off * 6) * 0.16 * k,
      );
      const sc = 0.6 + k * 2.0;
      p.m.scale.set(sc, sc * 1.25, sc);
      p.m.material.opacity = 0.3 * Math.sin(Math.PI * Math.min(1, k * 1.35));
    }
  }

  return { object, update };
}
