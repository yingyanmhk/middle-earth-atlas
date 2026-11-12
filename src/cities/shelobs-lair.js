// Shelob's Lair — the tunnel of Cirith Ungol, at the top of the pass.
// One strong idea: a dark rock face with a gaping black tunnel mouth, thick grey
// webs strung across it, and in the blackness a huge spider — one glint of eye.
// The dark itself has teeth.
import { THREE, Builder, M, C, terrainDisc, fbm, hash2, rock, arch, tree, Lines, glowMat } from '../kit.js';
import { figure, setInst } from './_ab_util.js';

const ARCH_Z = -5.4;        // the tunnel mouth plane (the front of the scene faces +z)
const ARCH_W = 3.2;         // arch width
const ARCH_H = 4.15;        // arch rectangle height (the round cap adds 1.35)
const ARCH_T = 0.5;         // arch frame thickness
const ARC_R = 1.38;         // radius of the black cap disc covering the arch's round top
const WEB_COLOR = '#b8b8b8';// pale grey web
const BONE = '#c6bcaa';
const DUST_N = 22;

/* ------------------------------ terrain ------------------------------ */
const h = (x, z) => {
  let y = 0.24 + 0.34 * fbm(x * 0.42 + 5.1, z * 0.42 + 2.3, { oct: 4, seed: 23 });
  // the high pass rises toward -z: the cliff the tunnel is cut into
  const ramp = THREE.MathUtils.smoothstep(-z, 3.1, 7.9);
  y += ramp * (5.2 + 2.4 * fbm(x * 0.22 + 1.7, z * 0.3 + 8.1, { oct: 3, seed: 41 }));
  // a level terrace before the mouth
  const ter = Math.exp(-(((z + 3.8) / 2.6) ** 2)) * Math.exp(-((x / 3.3) ** 2));
  y = y * (1 - 0.92 * ter) + 1.0 * 0.92 * ter;
  return Math.max(0.08, y);
};

const colorAt = (x, z, y, up) => {
  const j = hash2(Math.round(x * 3), Math.round(z * 3), 23);
  if (y > 4.2) {                                    // high cliff — catches a little cool fill
    const c = Math.round(0x373442 + (j - 0.5) * 14);
    return '#' + c.toString(16).padStart(6, '0');
  }
  if (up > 0.6) {                                   // steep rock — darkest
    const c = Math.round(0x232130 + (j - 0.5) * 10);
    return '#' + c.toString(16).padStart(6, '0');
  }
  const c = Math.round(0x2c2938 + (j - 0.5) * 12);  // grey-purple pass floor
  return '#' + c.toString(16).padStart(6, '0');
};

export default function build({ rng, city, accent }) {
  const b = new Builder();
  const object = new THREE.Group();
  const archY = h(0, ARCH_Z);
  const FX = 0.62, FZ = 4.55;   // the hobbit, far outside the web

  /* ------------------------------- terrain ------------------------------- */
  terrainDisc(b, { r: 10.5, rings: 52, segs: 80, height: h, colorAt, mat: M.stone, seed: 23 });

  /* ------------------- the cliff mass behind the mouth ------------------- */
  const CLIFF = [
    { x: 0.9, z: -6.9, r: 1.9, h: 4.8, c: '#2b2935' },
    { x: -3.6, z: -7.0, r: 1.8, h: 4.5, c: '#282630' },
    { x: 4.1, z: -7.2, r: 1.7, h: 4.3, c: '#2b2935' },
    { x: -6.6, z: -7.4, r: 1.6, h: 3.9, c: '#26242e' },
    { x: 6.9, z: -7.3, r: 1.5, h: 3.8, c: '#2b2935' },
    { x: -1.7, z: -8.2, r: 1.4, h: 3.4, c: '#23212b' },
    { x: 2.9, z: -8.3, r: 1.3, h: 3.2, c: '#282630' },
    { x: -9.0, z: -5.8, r: 1.15, h: 2.6, c: '#2b2935' },
    { x: 9.0, z: -5.6, r: 1.15, h: 2.5, c: '#2b2935' },
    { x: -7.3, z: -3.3, r: 0.9, h: 1.0, c: '#27252f' },
    { x: 7.5, z: -3.1, r: 0.9, h: 1.0, c: '#27252f' },
  ];
  for (const rk of CLIFF) {
    rock(b, { x: rk.x, y: h(rk.x, rk.z) + 0.05, z: rk.z, r: rk.r, h: rk.h, color: rk.c, rand: rng });
  }

  /* ------------------------- the tunnel mouth ------------------------- */
  // the great dark arch
  arch(b, { x: 0, y: archY, z: ARCH_Z, w: ARCH_W, h: ARCH_H, t: ARCH_T, depth: 0.6, color: '#24222d', mat: M.stone });
  // the blackness inside: a rectangular throat + the round cap
  b.box(2.28, ARCH_H + 0.05, 1.75, { x: 0, y: archY - 0.02, z: ARCH_Z - 0.855, color: '#050509', mat: M.stone });
  b.geo(new THREE.CircleGeometry(ARC_R, 26), { x: 0, y: archY + 4.17, z: ARCH_Z + 0.03, color: '#050509', mat: M.stone });
  // jagged rock edges around the rim
  const RIM = [
    { x: 1.62, y: archY + 2.1, z: -5.45, r: 0.42, h: 0.9 },
    { x: -1.66, y: archY + 3.2, z: -5.48, r: 0.5, h: 1.0 },
    { x: 1.35, y: archY + 4.35, z: -5.5, r: 0.48, h: 0.85 },
    { x: -1.4, y: archY + 4.6, z: -5.5, r: 0.44, h: 0.8 },
    { x: 0.8, y: archY + 5.6, z: -5.52, r: 0.5, h: 0.95 },
    { x: -0.5, y: archY + 5.75, z: -5.52, r: 0.42, h: 0.85 },
    { x: 0.0, y: archY + 6.15, z: -5.55, r: 0.35, h: 0.7 },
  ];
  for (const rk of RIM) {
    rock(b, { x: rk.x, y: rk.y, z: rk.z, r: rk.r, h: rk.h, color: rng.pick(['#22202c', '#27252f', '#1e1c26']), rand: rng });
  }
  // two rocks on the flanks beside the mouth
  for (const [rx, rz] of [[-2.4, -5.6], [2.5, -5.6]]) {
    rock(b, { x: rx, y: h(rx, rz) + 0.05, z: rz, r: 0.42, h: 1.0, color: '#22202c', rand: rng });
  }

  /* ------------ Shelob: a huge dark spider at the mouth, half in shadow ------------ */
  const bodyY = archY + 0.92, bodyZ = ARCH_Z + 1.05;
  // the abdomen: a great black bulb, its back lost in the tunnel
  b.sphere(1.2, { x: 0, y: archY + 1.65, z: ARCH_Z - 0.5, sx: 1.22, sy: 1.1, sz: 1.02, color: '#191922', mat: M.smooth, seg: 20 });
  // the cephalothorax
  b.sphere(0.72, { x: 0, y: bodyY, z: bodyZ, sx: 1.05, sy: 0.8, sz: 1.25, color: '#111117', mat: M.smooth, seg: 14 });
  // eight thick jointed legs, feet planted on the rock
  const LEGS = [
    { sh: [0.55, bodyY + 0.1, bodyZ + 0.5], foot: [1.35, -3.3] },   // front
    { sh: [0.68, bodyY + 0.08, bodyZ + 0.16], foot: [2.1, -3.6] },
    { sh: [0.7, bodyY + 0.05, bodyZ - 0.2], foot: [2.75, -4.4] },
    { sh: [0.55, bodyY + 0.02, bodyZ - 0.5], foot: [2.45, -5.35] }, // rear, onto the rock
  ];
  for (const L of LEGS) {
    for (const s of [-1, 1]) {
      const S = [s * L.sh[0], L.sh[1], L.sh[2]];
      const fx = s * L.foot[0], fz = L.foot[1];
      const fy = h(fx, fz) + 0.04;
      const mid = [(S[0] + fx) / 2 + s * 0.1, (S[1] + fy) / 2 + 0.3, (S[2] + fz) / 2];
      b.rod(S, mid, 0.11, { r2: 0.075, color: '#0d0d14', mat: M.stone, seg: 6 });
      b.rod(mid, [fx, fy, fz], 0.07, { r2: 0.04, color: '#0d0d14', mat: M.stone, seg: 6 });
    }
  }

  /* ------------------------------ the webs ------------------------------ */
  const webMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  const webB = new Builder();
  const webLines = new Lines();
  const hub = [0, archY + 1.62, ARCH_Z + 0.9];
  const anchors = [];
  for (const s of [-1, 1]) {
    anchors.push([s * 1.12, archY + 1.0, -5.32]);
    anchors.push([s * 1.12, archY + 2.2, -5.32]);
    anchors.push([s * 1.12, archY + 3.4, -5.32]);
  }
  for (const th of [0.2, 0.45, 0.5, 0.55, 0.8]) {
    const a = th * Math.PI;
    anchors.push([Math.cos(a) * 1.42, archY + 4.15 + Math.sin(a) * 1.42, -5.34]);
  }
  // radial strands: from the arch edges to the hub, sagging and bowing forward
  for (const A of anchors) {
    const pts = [];
    for (let i = 0; i <= 7; i++) {
      const t = i / 7;
      pts.push([
        A[0] + (hub[0] - A[0]) * t,
        A[1] + (hub[1] - A[1]) * t - 0.2 * 4 * t * (1 - t),
        A[2] + (hub[2] - A[2]) * t + 0.08 * 4 * t * (1 - t),
      ]);
    }
    webB.tube(pts, 0.02, { mat: webMat, color: WEB_COLOR, tseg: 8, rseg: 4 });
  }
  // concentric rings between the radials
  for (const f of [0.55, 0.75, 0.9]) {
    const pts = [];
    for (let i = 0; i < anchors.length; i++) {
      const A = anchors[i];
      const d = Math.hypot(A[0] - hub[0], A[1] - hub[1]);
      const px = hub[0] + ((A[0] - hub[0]) / d) * f * 1.9;
      const py = hub[1] + ((A[1] - hub[1]) / d) * f * 1.9 - 0.05 * (1 - Math.abs(px) / 2.0);
      pts.push([px, py, hub[2] + 0.03]);
    }
    for (let i = 0; i < anchors.length; i++) {
      webLines.seg(pts[i], pts[(i + 1) % anchors.length], WEB_COLOR);
    }
  }
  // frayed wisps at the edges of the web
  webLines.path([[1.12, archY + 1.0, -5.32], [1.24, archY + 0.55, -5.14], [1.34, archY + 0.3, -5.0]], WEB_COLOR);
  webLines.path([[-1.12, archY + 2.2, -5.32], [-1.3, archY + 1.6, -5.2], [-1.44, archY + 1.25, -5.06]], WEB_COLOR);
  webLines.path([[0.9, archY + 4.25, -5.24], [1.28, archY + 3.95, -5.06], [1.55, archY + 3.75, -4.94]], WEB_COLOR);

  // dangling strands with wrapped bundles (cocoons)
  const thread = (a, c, sag, r) => {
    const pts = [];
    for (let i = 0; i <= 5; i++) {
      const t = i / 5;
      pts.push([a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t - sag * 4 * t * (1 - t), a[2] + (c[2] - a[2]) * t]);
    }
    webB.tube(pts, r, { mat: webMat, color: WEB_COLOR, tseg: 6, rseg: 4 });
  };
  const cocoon = (x, y, z, s) => {
    webB.sphere(0.09 * s, { x, y, z, sx: 0.8, sy: 1.5, sz: 0.8, color: '#d9d2c2', mat: M.smooth, seg: 10 });
  };
  const DT = [
    { a: [0.95, archY + 1.6, -5.05], end: [0.9, -4.55] },
    { a: [-1.05, archY + 1.9, -5.08], end: [-1.15, -4.6] },
    { a: [0.5, archY + 2.5, -5.02], end: [0.55, -4.85] },
  ];
  for (const d of DT) {
    const ey = h(d.end[0], d.end[1]) + 0.05;
    thread(d.a, [d.end[0], ey, d.end[1]], 0.12, 0.013);
    cocoon(d.end[0] + 0.02, ey + 0.45, d.end[1] + 0.04, 1);
  }
  // a couple of bundles caught directly in the web
  cocoon(0.78, archY + 2.0, -4.98, 0.85);
  cocoon(-0.9, archY + 2.6, -5.06, 0.8);

  const webGroup = new THREE.Group();
  webGroup.add(webB.build());
  webGroup.add(webLines.build());
  object.add(webGroup);

  /* ------------------ the lantern at the tunnel's edge ------------------ */
  const LAN = { x: -2.18, y: archY + 1.05, z: -4.5 };
  b.rod([-1.72, archY + 2.3, -5.22], [-2.16, archY + 1.6, -4.58], 0.035, { color: '#1c1a22', mat: M.stone, seg: 5 });
  b.rod([-2.16, archY + 1.6, -4.58], [-2.16, archY + 1.2, -4.5], 0.018, { color: '#1c1a22', mat: M.stone, seg: 5 });
  b.box(0.16, 0.18, 0.16, { x: LAN.x, y: LAN.y + 0.02, z: LAN.z, color: '#181620', mat: M.rough_metal });
  b.box(0.1, 0.05, 0.1, { x: LAN.x, y: LAN.y + 0.19, z: LAN.z, color: '#1c1a22', mat: M.rough_metal });
  const lanternGlow = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), glowMat(C.lamp, 2.1, { transparent: true, opacity: 0.85, depthWrite: false }));
  lanternGlow.position.set(LAN.x, LAN.y + 0.04, LAN.z);
  object.add(lanternGlow);

  /* ------------- a broken old door frame, half eaten, at the side ------------- */
  const DF = { x: 2.14, z: -3.05 };
  const dfy = h(DF.x, DF.z);
  b.push({ x: DF.x, y: dfy, z: DF.z });
  b.box(0.2, 2.0, 0.12, { x: -0.62, y: 0, z: 0, rz: -0.18, color: '#1d1a22', mat: M.stone });
  b.box(0.18, 1.25, 0.12, { x: 0.62, y: 0, z: 0, rz: 0.24, color: '#1d1a22', mat: M.stone });
  b.box(1.5, 0.14, 0.12, { x: 0.05, y: 1.9, z: 0, rx: 0.32, color: '#1a1720', mat: M.stone });
  b.box(0.72, 0.07, 0.1, { x: 0.35, y: 0.05, z: 0.18, ry: 0.5, rz: -0.08, color: '#1d1a22', mat: M.stone });
  b.torus(0.09, 0.022, { x: -0.6, y: 1.15, z: 0.07, color: '#3a3d45', mat: M.rough_metal, rseg: 6, tseg: 14 });
  b.quad(0.3, 0.5, { x: 0.08, y: 1.72, z: 0.07, rx: 0.12, color: accent, mat: M.cloth });
  b.pop();

  /* ------------------------- a dead tree near the mouth ------------------------- */
  tree(b, { x: -4.9, y: h(-4.9, -3.35) + 0.01, z: -3.35, h: 2.7, kind: 'bare', trunk: '#221e27', r: rng });

  /* ------------------------------- the bones ------------------------------- */
  const bones = [];
  for (let i = 0; i < 18; i++) {
    const [bx, bz] = rng.inDisc(5.6, 0.8);
    if (bz > 3.6 || bz < -4.1) continue;
    if (h(bx, bz) > 1.6) continue;                          // stay off the cliff
    if (Math.abs(bx) < 0.5 && bz > -1.2) continue;           // keep the path clear
    if (Math.hypot(bx - FX, bz - FZ) < 1.3) continue;        // the hobbit's spot
    if (Math.hypot(bx - DF.x, bz - DF.z) < 0.9) continue;    // the doorframe
    bones.push([bx, bz]);
  }
  for (const [bx, bz] of bones) {
    b.cyl(0.024, 0.031, rng.range(0.1, 0.24), { x: bx, y: h(bx, bz) + 0.02, z: bz, rx: rng.range(0.3, 1.5), rz: rng.range(0, 3.1), color: BONE, mat: M.stone, seg: 6 });
  }
  // skulls and a small heap by the eaten door
  for (const [bx, bz] of [[1.62, -2.15], [-1.95, -2.35], [0.95, -2.85], [-0.85, -1.6]]) {
    b.sphere(0.05, { x: bx, y: h(bx, bz) + 0.035, z: bz, sx: 0.85, sy: 0.8, color: BONE, mat: M.smooth, seg: 8 });
  }
  for (const [bx, bz] of [[1.8, -2.1], [2.0, -2.3], [2.25, -2.12]]) {
    b.cyl(0.026, 0.033, rng.range(0.12, 0.2), { x: bx, y: h(bx, bz) + 0.02, z: bz, rx: rng.range(0.4, 1.4), rz: rng.range(0, 3.1), color: BONE, mat: M.stone, seg: 6 });
  }

  /* --------------------------- the worn path --------------------------- */
  for (let i = 0; i < 6; i++) {
    const pz = -1.85 - i * 0.44;
    const px = 0.12 + (i % 2) * 0.08;
    b.box(0.6 + (i % 2) * 0.1, 0.05, 0.36, { x: px, y: h(px, pz) + 0.015, z: pz, ry: (i % 2) * 0.3, color: '#312e3a', mat: M.stone });
  }

  /* --------------- a tiny figure far outside the web (the star-glass) --------------- */
  const fy = h(FX, FZ);
  figure(b, { x: FX, y: fy + 0.01, z: FZ, h: 0.33, color: '#3b3f49', skin: '#c9b39a', ry: Math.PI * 0.95 });
  const starGlow = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), glowMat('#d9e6ff', 1.7, { transparent: true, opacity: 0.9, depthWrite: false }));
  starGlow.position.set(FX + 0.02, fy + 0.3, FZ - 0.14);
  object.add(starGlow);
  const starPool = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.95), glowMat('#8fa8e0', 0.8, { transparent: true, opacity: 0.1, depthWrite: false }));
  starPool.rotation.x = -Math.PI / 2;
  starPool.position.set(FX, fy + 0.015, FZ);
  object.add(starPool);

  /* ------------------------- dust motes in the lamplight ------------------------- */
  const dust = new THREE.InstancedMesh(new THREE.SphereGeometry(0.022, 6, 5), new THREE.MeshBasicMaterial({ color: '#9aa0b4', transparent: true, opacity: 0.32, depthWrite: false }), DUST_N);
  dust.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  dust.castShadow = false;
  const dustMeta = [];
  for (let i = 0; i < DUST_N; i++) {
    dustMeta.push({ x: rng.range(-3.4, 3.4), y: rng.range(1.3, 6.0), z: rng.range(-7.0, 1.2), spd: rng.range(0.08, 0.2), ph: rng.range(0, 6.3), s: rng.range(0.6, 1.4) });
  }
  object.add(dust);

  /* --------------------- the one glinting eye (animated) --------------------- */
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), glowMat('#e2a8a8', 1.35, { transparent: true, opacity: 0.8, depthWrite: false }));
  eye.position.set(0, bodyY + 0.14, bodyZ + 0.93);
  object.add(eye);

  /* ------------------------------ static build ------------------------------ */
  const staticGroup = b.build();
  object.add(staticGroup);

  /* ------------------------------- update -------------------------------- */
  function update(t, dt) {
    // the webs sway very slowly
    webGroup.rotation.z = Math.sin(t * 0.2) * 0.006;
    webGroup.rotation.x = Math.sin(t * 0.16 + 1.1) * 0.004;
    webGroup.position.x = Math.sin(t * 0.1) * 0.012;
    webGroup.position.y = Math.sin(t * 0.13 + 0.7) * 0.01;
    // the lantern flickers — the only warmth
    const fl = 0.72 + 0.28 * Math.sin(t * 6.3) * Math.sin(t * 3.1 + 1.2);
    lanternGlow.scale.setScalar(0.8 + 0.32 * fl);
    lanternGlow.material.opacity = 0.6 + 0.35 * fl;
    lanternGlow.position.x = LAN.x + Math.sin(t * 0.85) * 0.015;
    lanternGlow.position.z = LAN.z + Math.cos(t * 0.8) * 0.012;
    // the eye glints, very faintly
    const ek = 0.5 + 0.5 * Math.sin(t * 0.9 + 1.4);
    eye.material.opacity = 0.5 + 0.3 * ek;
    eye.scale.setScalar(0.9 + 0.12 * ek);
    // the star-glass burns small and steady
    const sk = 0.5 + 0.5 * Math.sin(t * 0.85 + 2.1);
    starGlow.material.opacity = 0.6 + 0.3 * sk;
    starGlow.scale.setScalar(0.95 + 0.1 * sk);
    starPool.material.opacity = 0.06 + 0.05 * sk;
    // dust drifts
    for (let i = 0; i < DUST_N; i++) {
      const m = dustMeta[i];
      setInst(dust, i,
        m.x + Math.sin(t * m.spd + m.ph) * 0.5,
        m.y + Math.sin(t * m.spd * 0.7 + m.ph * 1.3) * 0.3,
        m.z + Math.cos(t * m.spd * 0.8 + m.ph) * 0.5,
        m.s);
    }
    dust.instanceMatrix.needsUpdate = true;
  }

  return { object, update };
}
