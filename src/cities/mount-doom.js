// Mount Doom — Orodruin. One strong idea: a great cone of black ash with
// glowing red cracks winding down its slopes, a plume of smoke and embers
// rising from its crater, and at its base the door of fire — the Sammath Naur,
// the Cracks of Doom. A tiny dark figure stands at the door, looking in.
import { THREE, Builder, M, terrainDisc, fbm, noise2, hash2, rock, glowMat } from '../kit.js';
import { figure, setInst } from './_ab_util.js';

const H = 13.2;         // cone height (crater rim top)
const BASE_R = 6.7;     // cone base radius
const CRATER_Y = 12.05; // crater floor height

// the Sammath Naur — a rock arch doorway low on the +x flank, facing +z
const DOOR = { x: 6.04, y: 1.18, z: 0.35, ry: 0.3 };

/* ------------------------------------------------------- the mountain -- */

// outer profile radius at height fraction t (0 = base, 1 = rim top)
function profileR(t) {
  const r = BASE_R * Math.pow(1 - t, 1.18) + 0.9 * Math.pow(t, 1.7);
  const lip = 0.1 * Math.exp(-Math.pow((t - 0.965) / 0.035, 2)); // rim lip
  return r + lip;
}

// surface radius at height t and azimuth a (matches the cone geometry)
function surfR(t, a) {
  const r = profileR(t);
  const w = 0.05 * (noise2(a * 1.5, t * 5.5, 91) - 0.5) * 2
          + 0.028 * (noise2(a * 3.7 + 9.2, t * 9.1, 92) - 0.5) * 2;
  return r * (1 + w);
}

// surface height at t and a
function surfY(t, a) {
  return t * H + 0.5 * Math.sin(Math.PI * t) * (noise2(a * 2.1, t * 4.3, 93) - 0.5) * 2;
}

const _cc = new THREE.Color();
function coneColor(t, a) {
  const j = hash2(Math.round(a * 5), Math.round(t * 26), 71) - 0.5;
  if (t > 0.76) _cc.set('#4c4338').lerp(new THREE.Color('#5b5144'), (t - 0.76) / 0.24); // lighter ash rim
  else if (t < 0.16) _cc.set('#3b352e').lerp(new THREE.Color('#2e2a25'), t / 0.16);
  else _cc.set('#2e2a25');
  _cc.offsetHSL(0, 0, j * 0.06);
  return _cc.clone();
}

// indexed lathe-ish cone with a jittered surface; rings run top → bottom so
// the winding (a,d,c / a,b,d) yields outward normals like terrainDisc
function buildCone() {
  const RINGS = 20, SEGS = 46;
  const positions = new Float32Array((RINGS + 1) * SEGS * 3);
  const colors = new Float32Array((RINGS + 1) * SEGS * 3);
  const uvs = new Float32Array((RINGS + 1) * SEGS * 2);
  const idx = [];
  for (let i = 0; i <= RINGS; i++) {
    const t = 1 - i / RINGS; // i=0 → top (small r), i=RINGS → base
    for (let j = 0; j < SEGS; j++) {
      const a = (j / SEGS) * Math.PI * 2;
      const r = surfR(t, a), y = surfY(t, a);
      const k = i * SEGS + j;
      positions[k * 3] = Math.cos(a) * r;
      positions[k * 3 + 1] = y;
      positions[k * 3 + 2] = Math.sin(a) * r;
      const c = coneColor(t, a);
      colors[k * 3] = c.r; colors[k * 3 + 1] = c.g; colors[k * 3 + 2] = c.b;
      uvs[k * 2] = j / SEGS; uvs[k * 2 + 1] = t;
    }
  }
  for (let i = 0; i < RINGS; i++) {
    for (let j = 0; j < SEGS; j++) {
      const a = i * SEGS + j, b = i * SEGS + (j + 1) % SEGS;
      const c = (i + 1) * SEGS + j, d = (i + 1) * SEGS + (j + 1) % SEGS;
      idx.push(a, d, c, a, b, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** a rock sitting on the cone's surface at height t, azimuth a */
function coneRock(b, rng, az, t, { r, h, color }) {
  const rad = surfR(t, az);
  rock(b, { x: Math.cos(az) * rad, y: surfY(t, az) + 0.5 * h, z: Math.sin(az) * rad, r, h, color, rand: rng, detail: 1 });
}

/* ------------------------------------------------------- the ashfield -- */

const h = (x, z) => {
  let y = 0.1 + 0.32 * fbm(x * 0.42 + 3.7, z * 0.42 + 9.1, { oct: 4, seed: 13 });
  y += 0.45 * Math.exp(-((x * x + z * z) / 64)); // broad apron under the mountain
  return Math.max(0.06, y);
};

const ASH = ['#2b2623', '#312c27', '#282320', '#2e2924'];
const ASH_D = ['#241f1c', '#271f1b'];
const colorAt = (x, z, y, up) => {
  const rr = Math.hypot(x, z);
  const j = hash2(Math.round(x * 3.3), Math.round(z * 3.3), 61);
  const p = hash2(Math.round(x * 0.9), Math.round(z * 0.9), 62);
  let c = rr < 7.4 ? ASH_D[Math.floor(j * ASH_D.length) % ASH_D.length]
                   : ASH[Math.floor(j * ASH.length) % ASH.length];
  if (p < 0.24) c = '#231d18';   // darker ash drifts
  if (j > 0.955) c = '#5c2b1a';  // a faint ember glint in the ash
  return c;
};

/* --------------------------------------------------------------- build -- */

export default function build({ rng, city, accent }) {
  const b = new Builder();
  const object = new THREE.Group();

  /* ------------------------------- terrain ------------------------------ */
  terrainDisc(b, { r: 10.5, rings: 60, segs: 96, height: h, colorAt, mat: M.stone, seed: 17 });

  /* --------------------------- the mountain ----------------------------- */
  const coneMat = M.stone.clone();
  if (!b.parts.has(coneMat)) b.parts.set(coneMat, []);
  b.parts.get(coneMat).push(buildCone());

  // the crater: a dark inner bowl and floor (double-sided so the hollow reads
  // from the top view)
  const dbl = M.stone.clone();
  dbl.side = THREE.DoubleSide;
  b.lathe(
    [[0.001, CRATER_Y - 0.02], [0.3, CRATER_Y], [0.5, CRATER_Y + 0.09], [0.68, CRATER_Y + 0.25],
     [0.84, CRATER_Y + 0.44], [0.97, CRATER_Y + 0.6], [1.05, CRATER_Y + 0.69]],
    { seg: 24, mat: dbl, color: '#1f1a16' },
  );
  b.disc(0.55, { x: 0, y: CRATER_Y - 0.01, z: 0, color: '#231d18', mat: M.stone, seg: 20 });

  /* ------------------------- fire in the crater ------------------------- */
  b.disc(0.4, { x: 0, y: CRATER_Y + 0.02, z: 0, mat: M.glow, color: '#ff5a1a', glow: 0.85, seg: 20 });
  b.ring(0.62, 0.85, { x: 0, y: CRATER_Y + 0.06, z: 0, mat: M.glow, color: '#ff6a1a', glow: 1.1, seg: 24 });
  // NB: three r186 builds TorusGeometry in the XY plane, so rotate it flat
  b.geo(new THREE.TorusGeometry(1.05, 0.04, 5, 26).rotateX(Math.PI / 2), { x: 0, y: 12.85, z: 0, mat: M.glow, color: '#ff4a1a', glow: 1.0 });

  /* --------------------- the door of fire (Sammath Naur) ----------------- */
  b.push(DOOR);
  b.box(3.0, 1.0, 1.5, { y: -1.0, z: 0.35, color: '#2a251f', mat: M.stone });   // rocky porch terrace
  b.box(0.5, 1.7, 0.6, { x: -0.68, y: 0, z: 0.28, color: '#3b352e', mat: M.flat }); // jamb
  b.box(0.5, 1.7, 0.6, { x: 0.68, y: 0, z: 0.28, color: '#3b352e', mat: M.flat });  // jamb
  b.box(1.9, 0.5, 0.65, { x: 0, y: 1.7, z: 0.3, color: '#4a4136', mat: M.flat });    // lintel
  b.box(2.2, 0.34, 0.8, { x: 0, y: 2.2, z: 0.28, color: '#4d2f2b', mat: M.flat });   // cap (accent-tinted)
  b.box(1.9, 0.07, 0.06, { x: 0, y: 1.96, z: 0.63, color: accent, mat: M.flat });    // red trim band
  b.box(1.5, 0.12, 0.7, { x: 0, y: 0.02, z: 0.42, color: '#3b352e', mat: M.stone }); // threshold step
  b.box(1.15, 1.45, 0.3, { x: 0, y: 0.16, z: -0.2, color: '#0f0c0a', mat: M.smooth }); // the dark mouth
  b.quad(1.02, 1.26, { x: 0, y: 0.85, z: -0.02, mat: M.glow, color: '#ff7a2a', glow: 1.5 }); // fire within
  b.pop();

  // framing rocks and the tiny hobbit at the door, looking in
  coneRock(b, rng, 0.2, 0.16, { r: 0.9, h: 1.25, color: '#3b352e' });
  coneRock(b, rng, -0.08, 0.05, { r: 0.75, h: 1.05, color: '#423c33' });
  figure(b, { x: 6.24, y: 1.2, z: 1.0, h: 0.28, color: '#241e1a', skin: '#3a342f', ry: DOOR.ry + Math.PI, arms: 0 });

  /* ------------------- scattered rocks + ember glints -------------------- */
  for (let i = 0; i < 11; i++) {
    const [bx, bz] = rng.inDisc(9.5, 7.6);
    if (bx > 4.4 && bz < 1.6 && bz > -1.2) continue; // keep the door's apron clear
    rock(b, {
      x: bx, y: h(bx, bz) + 0.5 * rng.range(0.25, 0.6), z: bz,
      r: rng.range(0.24, 0.5), h: rng.range(0.3, 0.65),
      color: rng.pick(['#3d382f', '#423d33', '#372f29']), rand: rng, detail: 0,
    });
  }
  for (let i = 0; i < 14; i++) {
    const [ex, ez] = rng.inDisc(9.4, 7.7);
    if (ex > 4.4 && ez < 1.6 && ez > -1.2) continue;
    b.sphere(rng.range(0.03, 0.06), { x: ex, y: h(ex, ez) + 0.02, z: ez, mat: M.glow, color: '#7a2a14', glow: rng.range(0.5, 0.85), seg: 6 });
  }
  // a few embers clinging to the lower slopes
  for (const [az, t] of [[2.35, 0.05], [3.8, 0.07], [5.15, 0.055], [1.5, 0.075]]) {
    const rad = surfR(t, az) + 0.04;
    b.sphere(rng.range(0.04, 0.06), { x: Math.cos(az) * rad, y: surfY(t, az) + 0.03, z: Math.sin(az) * rad, mat: M.glow, color: '#8a3018', glow: rng.range(0.7, 1.0), seg: 6 });
  }

  object.add(b.build());

  /* ------------------------- glowing red cracks ------------------------- */
  const CRACKS = [
    { a0: 0.85, sweep: 0.28, wave: 0.4, ph: 1.2, spd: 0.8, col: '#ff4a1a' },
    { a0: 2.15, sweep: -0.22, wave: 0.5, ph: 2.7, spd: 0.62, col: '#ff521f' },
    { a0: 3.5, sweep: 0.34, wave: 0.45, ph: 4.1, spd: 0.94, col: '#ff4515' },
    { a0: 4.9, sweep: -0.3, wave: 0.42, ph: 5.6, spd: 0.7, col: '#ff4a1a' },
    { a0: 5.95, sweep: 0.2, wave: 0.34, ph: 0.4, spd: 0.85, col: '#ff5a24' },
  ];
  const cracks = [];
  for (const c of CRACKS) {
    const pts = [];
    for (let s = 0; s <= 22; s++) {
      const u = s / 22;
      const t = 0.06 + 0.84 * u;                       // base → near the rim
      const a = c.a0 + u * c.sweep + Math.sin(u * 2.6 + c.ph) * c.wave;
      const r = surfR(t, a) + 0.045;                   // just off the surface
      pts.push(new THREE.Vector3(Math.cos(a) * r, surfY(t, a), Math.sin(a) * r));
    }
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 30, 0.05, 5, false), glowMat(c.col, 1.15));
    m.castShadow = m.receiveShadow = false;
    object.add(m);
    cracks.push({ m, base: new THREE.Color(c.col), spd: c.spd, ph: c.ph });
  }

  /* --------------------- smoke rising from the crater -------------------- */
  const smoke = [];
  const smokeMat = new THREE.MeshBasicMaterial({ color: '#261f1b', transparent: true, opacity: 0.5, depthWrite: false });
  for (let i = 0; i < 12; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), smokeMat.clone());
    m.visible = false;
    m.castShadow = m.receiveShadow = false;
    object.add(m);
    smoke.push({ m, off: i / 12, sp: rng.range(0.05, 0.085), ph: rng.range(0, 6), drift: rng.range(0.12, 0.35), wf: rng.int(1, 3), wa: rng.range(0.15, 0.4) });
  }

  /* --------------------- embers drifting up from it ---------------------- */
  const EMBERS = 90;
  const emberMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.05, 0), glowMat('#ff7a2a', 1.25), EMBERS);
  emberMesh.frustumCulled = false;
  emberMesh.castShadow = emberMesh.receiveShadow = false;
  const EM = [];
  for (let i = 0; i < EMBERS; i++) {
    EM.push({ sp: rng.range(0.07, 0.16), ph: rng.range(0, 1), a0: rng.range(0, Math.PI * 2), rr: rng.range(0, 0.5), wa: rng.range(0.06, 0.22), wf: rng.int(1, 3), sc: rng.range(0.7, 1.6) });
    setInst(emberMesh, i, 0, 12.35, 0, 0.001);
  }
  object.add(emberMesh);

  /* ------------------------- ash drifting below -------------------------- */
  const ashDrift = [];
  const ashMat = new THREE.MeshBasicMaterial({ color: '#3a332a', transparent: true, opacity: 0.14, depthWrite: false });
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(rng.range(0.8, 1.3), 10, 8), ashMat.clone());
    m.scale.y = 0.24;
    m.castShadow = m.receiveShadow = false;
    const az0 = rng.range(0, Math.PI * 2), rr = rng.range(7.6, 9.4);
    m.position.set(Math.cos(az0) * rr, 0.3, Math.sin(az0) * rr);
    object.add(m);
    ashDrift.push({ m, az0, rr, sp: rng.range(0.015, 0.03), ph: rng.range(0, 6) });
  }

  /* --------------------------- the live fires ---------------------------- */
  const doorFire = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), glowMat('#ff8a2a', 1.7, { transparent: true, opacity: 0.95 }));
  doorFire.position.set(DOOR.x + Math.sin(DOOR.ry) * 0.06, DOOR.y + 0.8, DOOR.z + Math.cos(DOOR.ry) * 0.06);
  doorFire.castShadow = doorFire.receiveShadow = false;
  object.add(doorFire);

  const craterFire = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), glowMat('#ff5a1a', 1.35, { transparent: true, opacity: 0.9 }));
  craterFire.position.set(0, 13.15, 0); // leaping just above the rim
  craterFire.castShadow = craterFire.receiveShadow = false;
  object.add(craterFire);

  const craterInner = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), glowMat('#ff4a1a', 1.2, { transparent: true, opacity: 0.85 }));
  craterInner.position.set(0, 12.5, 0); // deep in the bowl
  craterInner.castShadow = craterInner.receiveShadow = false;
  object.add(craterInner);

  const DF_BASE = new THREE.Color('#ff8a2a').multiplyScalar(1.7);
  const CF_BASE = new THREE.Color('#ff5a1a').multiplyScalar(1.35);
  const CI_BASE = new THREE.Color('#ff4a1a').multiplyScalar(1.2);

  /* ------------------------- light from the fires ------------------------ */
  const craterLight = new THREE.PointLight('#ff6a2a', 7, 16, 2);
  craterLight.position.set(0, 12.9, 0);
  object.add(craterLight);
  const doorLight = new THREE.PointLight('#ff7a2f', 5, 8, 2);
  doorLight.position.set(6.1, 2.0, 0.5);
  object.add(doorLight);

  /* ------------------------------- update -------------------------------- */
  function update(t, dt) {
    // the fire cracks breathe
    for (let i = 0; i < cracks.length; i++) {
      const c = cracks[i];
      const I = 0.8 + 0.2 * Math.sin(t * c.spd + c.ph * 1.7);
      c.m.material.color.copy(c.base).multiplyScalar(I);
    }
    // the door's fire flickers
    const df = 0.85 + 0.15 * Math.sin(t * 7.3 + Math.sin(t * 2.9) * 1.2);
    doorFire.material.color.copy(DF_BASE).multiplyScalar(df);
    doorFire.scale.set(0.8 + 0.1 * Math.sin(t * 6.2), 1.25 + 0.2 * Math.sin(t * 7.7 + 1.1), 0.8 + 0.1 * Math.sin(t * 6.2 + 0.6));
    // fire in the crater
    const cf = 0.8 + 0.2 * Math.sin(t * 5.4 + Math.sin(t * 2.2) * 1.3);
    craterFire.material.color.copy(CF_BASE).multiplyScalar(cf);
    craterFire.scale.setScalar(1 + 0.22 * Math.sin(t * 6.6 + 0.4));
    craterInner.material.color.copy(CI_BASE).multiplyScalar(0.75 + 0.25 * Math.sin(t * 8.1 + 2.2));
    craterInner.scale.setScalar(1 + 0.3 * Math.sin(t * 7.3 + 1.7));
    // smoke rises out of the crater
    for (const p of smoke) {
      const k = (t * p.sp + p.off) % 1;
      const rise = k * 2.9;
      p.m.visible = true;
      p.m.position.set(0.1 + p.drift * k + Math.sin(k * p.wf * 5 + p.ph) * p.wa * k, 12.4 + rise, Math.cos(k * 3.1 + p.ph * 2) * p.wa * 0.55 * k);
      const sc = 0.7 + k * 1.9;
      p.m.scale.set(sc, sc * 1.35, sc);
      p.m.material.opacity = 0.5 * Math.sin(Math.PI * Math.min(1, k * 1.3));
    }
    // embers drift up and out of the crater
    for (let i = 0; i < EMBERS; i++) {
      const p = EM[i];
      const k = (t * p.sp + p.ph) % 1;
      const a = p.a0 + k * 0.8;
      const r = p.rr + Math.sin(k * p.wf * 6 + p.ph * 9) * p.wa * k;
      const y = 12.35 + k * 2.6;
      const fl = 0.6 + 0.5 * Math.sin(t * (5 + p.wf) + p.ph * 11);
      const s = 0.05 * p.sc * fl;
      setInst(emberMesh, i, Math.cos(a) * r, y, Math.sin(a) * r, s, 0, k * 3 + p.ph * 5, 0, s);
    }
    emberMesh.instanceMatrix.needsUpdate = true;
    // ash drifts slowly across the dark field
    for (const p of ashDrift) {
      const a = p.az0 + t * p.sp;
      p.m.position.set(Math.cos(a) * p.rr, 0.3 + Math.sin(t * 0.4 + p.ph) * 0.08, Math.sin(a) * p.rr);
    }
  }

  return { object, update };
}
