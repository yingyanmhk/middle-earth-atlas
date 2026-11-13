// The Grey Havens (Mithlond) — the last shore. One strong idea: a grey harbour
// town on the edge of the sea at sunset — two white ships waiting by the quay,
// and on it a few elves who will sail west and never return. Grey stone houses,
// a tall white tower, white ships on calm deep-blue water, golden evening light.
import { THREE, Builder, M, C, terrainDisc, fbm, hash2, house, tower, tree, boat, Lines } from '../kit.js';
import { figure, setInst } from './_ab_util.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const WATER_Y = 0.30;          // the sea surface
const SEA_C = [-4.0, 0.2];     // centre of the sea basin
const SEA_R = 5.8;             // carved sea-bed radius
const WAT_R = 6.5;             // water disc (max extent 10.5, inside the plinth)
const SHIP_SCALE = 2.7;
const HULL_OFF = 1.2 * 0.04 * SHIP_SCALE; // boat hull bottom at the waterline

const shoreX = (z) => -0.8 + 1.4 * Math.cos(z * 0.4 + 0.3); // shoreline x as a curve of z
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (t) => t * t * (3 - 2 * t);

function seaT(x, z) {
  const d = Math.hypot(x - SEA_C[0], z - SEA_C[1]) - SEA_R;
  const sx = shoreX(z) - x;
  return clamp01(-d) * clamp01(sx / 1.2);
}

const h = (x, z) => {
  let land = 0.5 + 0.38 * fbm(x * 0.3 + 3.7, z * 0.3 + 9.1, { oct: 4, seed: 7 });
  // the town hill (the headland the town climbs)
  land += 1.25 * Math.exp(-(((x - 2.3) ** 2) / 3.2 + ((z + 0.3) ** 2) / 2.6));
  // the north headland, where the white tower stands
  land += 0.5 * Math.exp(-(((x - 0.4) ** 2) / 2.6 + ((z - 3.6) ** 2) / 2.2));
  // the harbour apron: low ground where the quay is
  land -= 0.55 * Math.exp(-(((x - 0.3) ** 2) / 2.2 + ((z + 1.7) ** 2) / 1.8));
  const t = seaT(x, z);
  return Math.max(0.06, land + (0.1 - land) * smooth(t));
};

function colorAt(x, z, y, up) {
  const t = seaT(x, z);
  if (t > 0.7) return '#47555d';      // sea bed, seen through the water
  if (t > 0.1) return '#b5ab92';      // wet shingle along the shore
  const grass = 0x8b9585, deep = 0x6f7a68;
  const k = Math.min(1, y / 2.0);
  const j = hash2(Math.round(x * 3), Math.round(z * 3), 5);
  let c = Math.round(grass + (deep - grass) * k + (j - 0.5) * 12);
  if (up < 0.6) c = Math.round(0x77826f + (j - 0.5) * 8);
  return '#' + c.toString(16).padStart(6, '0');
}

/* one elf ship: boat helper scaled up, plus a swan prow, decks and a tall mast */
function buildShip(sb) {
  sb.push({ y: 0, s: SHIP_SCALE });
  boat(sb, { y: 0, len: 1.2, color: '#f4efe0', mast: false });
  // deck plank, stern castle, fore deck (stretch the silhouette)
  sb.box(0.52, 0.05, 1.0, { y: 0.15, color: '#dcd5c4', mat: M.wood });
  sb.box(0.46, 0.14, 0.3, { y: 0.16, z: 0.5, color: '#dcd5c4', mat: M.wood });
  sb.box(0.42, 0.1, 0.28, { y: 0.14, z: -0.42, color: '#dcd5c4', mat: M.wood });
  // the swan prow: a small curved neck and a head
  sb.tube([[0, 0.1, -0.5], [0, 0.28, -0.72], [0, 0.5, -0.7], [0, 0.62, -0.56]], 0.018, { mat: M.smooth, color: '#f8f3e6', tseg: 12 });
  sb.sphere(0.032, { y: 0.66, z: -0.53, mat: M.smooth, color: '#f8f3e6', seg: 8 });
  sb.box(0.05, 0.012, 0.016, { y: 0.68, z: -0.48, mat: M.metal, color: C.gold });
  // bowsprit and the tall mast
  sb.rod([0, 0.1, -0.55], [0, 0.18, -0.95], 0.014, { color: '#7a6a52', mat: M.wood, seg: 5 });
  sb.cyl(0.02, 0.028, 1.32, { x: 0.04, y: 0.16, color: '#7a6a52', mat: M.wood, seg: 6 });
  sb.pop();
}

/* the furled white sail + pennant — a separate group so its edge can stir */
function buildSails(sb, accent) {
  sb.push({ y: 0, s: SHIP_SCALE });
  sb.cyl(0.05, 0.065, 0.68, { x: 0.04, y: 0.44, mat: M.cloth, color: '#f2eee2', seg: 10 });
  sb.torus(0.058, 0.011, { x: 0.04, y: 0.62, rx: Math.PI / 2, mat: M.wood, color: '#8a7a5a', rseg: 6, tseg: 12 });
  sb.torus(0.058, 0.011, { x: 0.04, y: 0.95, rx: Math.PI / 2, mat: M.wood, color: '#8a7a5a', rseg: 6, tseg: 12 });
  sb.box(0.3, 0.1, 0.02, { x: 0.02, y: 1.3, mat: M.cloth, color: accent });
  sb.pop();
}

/* a gull resting (body + head + beak) */
function sittingGull(b, x, y, z) {
  b.push({ x, y, z });
  b.sphere(0.05, { sx: 1.25, sy: 0.8, sz: 0.9, color: '#efecea', mat: M.smooth, seg: 7 });
  b.sphere(0.028, { x: 0.045, y: 0.055, color: '#efecea', mat: M.smooth, seg: 6 });
  b.cone(0.012, 0.03, { x: 0.078, y: 0.062, rx: -Math.PI / 2.6, color: '#d8a44a', mat: M.smooth, seg: 4 });
  b.pop();
}

export default function build({ rng, city, accent }) {
  const b = new Builder();
  const object = new THREE.Group();

  /* ------------------------------ terrain ------------------------------- */
  terrainDisc(b, { r: 10.5, rings: 60, segs: 100, height: h, colorAt, mat: M.stone, seed: 17 });

  /* ------------------------------- the sea ------------------------------ */
  b.disc(WAT_R, { x: SEA_C[0], y: WATER_Y, z: SEA_C[1], mat: M.water, color: C.sea, seg: 72 });

  /* ------------------------- quay, pier, cargo -------------------------- */
  // the stone pier (deck 0.46) with pilings, into the sea
  b.box(3.4, 0.13, 1.2, { x: -1.5, y: 0.33, z: -1.7, color: '#9a958c', mat: M.stone });
  for (const [px, pz] of [[-2.7, -2.25], [-2.7, -1.15], [-1.5, -2.25], [-1.5, -1.15], [-0.3, -2.25], [-0.3, -1.15]]) {
    b.cyl(0.06, 0.08, 0.3, { x: px, y: 0.08, z: pz, color: '#6e6a63', mat: M.stone, seg: 6 });
  }
  // coping stones along the pier
  b.box(3.5, 0.05, 0.12, { x: -1.5, y: 0.45, z: -1.23, color: '#a8a49b', mat: M.stone });
  b.box(3.5, 0.05, 0.12, { x: -1.5, y: 0.45, z: -2.17, color: '#a8a49b', mat: M.stone });
  // a step and the quay platform on the shore
  b.box(0.5, 0.09, 1.2, { x: 0.45, y: 0.5, z: -1.7, color: '#8f8a81', mat: M.stone });
  b.box(1.9, 0.12, 1.6, { x: 1.15, y: 0.53, z: -1.7, color: '#8f8a81', mat: M.stone });
  // crates, barrels, rope coils, a bollard
  b.box(0.34, 0.28, 0.34, { x: 1.6, y: 0.65, z: -2.15, color: '#8a6a45', mat: M.wood });
  b.box(0.3, 0.24, 0.3, { x: 1.9, y: 0.65, z: -2.3, color: '#7c5e3c', mat: M.wood });
  b.cyl(0.15, 0.15, 0.32, { x: 1.35, y: 0.65, z: -1.15, color: '#7a5a3a', mat: M.wood, seg: 8 });
  b.torus(0.09, 0.028, { x: -2.5, y: 0.52, z: -1.95, rx: Math.PI / 2, color: '#b09a6a', mat: M.cloth, rseg: 6, tseg: 14 });
  b.torus(0.07, 0.024, { x: -2.5, y: 0.55, z: -1.95, rx: Math.PI / 2, color: '#a89264', mat: M.cloth, rseg: 6, tseg: 12 });
  b.cyl(0.05, 0.07, 0.22, { x: -2.95, y: 0.46, z: -1.7, color: '#6e6a63', mat: M.stone, seg: 6 });

  /* ------------------------- lantern posts ------------------------------ */
  b.cyl(0.04, 0.05, 1.1, { x: -3.1, y: 0.46, z: -1.7, color: C.darkwood, mat: M.wood, seg: 6 });
  b.box(0.1, 0.08, 0.1, { x: -3.1, y: 1.5, z: -1.7, color: '#6e6a63', mat: M.stone });
  b.cyl(0.04, 0.05, 1.0, { x: 0.9, y: 0.65, z: -1.7, color: C.darkwood, mat: M.wood, seg: 6 });
  b.box(0.1, 0.08, 0.1, { x: 0.9, y: 1.6, z: -1.7, color: '#6e6a63', mat: M.stone });

  /* ------------------------------ the town ------------------------------ */
  const HOUSES = [
    { x: 2.6, z: -2.6, w: 1.5, d: 1.2, h: 1.9, ry: 0.35, roof: 'gable' },
    { x: 1.3, z: -1.3, w: 1.3, d: 1.1, h: 1.7, ry: 0.15, roof: 'hip' },
    { x: 3.2, z: -0.1, w: 1.6, d: 1.3, h: 2.1, ry: -0.2, roof: 'gable' },
    { x: 2.1, z: 1.3, w: 1.2, d: 1.0, h: 1.6, ry: 0.4, roof: 'gable' },
    { x: 3.9, z: 1.9, w: 1.4, d: 1.2, h: 2.0, ry: 0.1, roof: 'hip' },
    { x: 4.5, z: -1.4, w: 1.3, d: 1.1, h: 1.8, ry: -0.5, roof: 'gable' },
  ];
  const smokeEm = [];
  for (let i = 0; i < HOUSES.length; i++) {
    const ho = HOUSES[i];
    const y = h(ho.x, ho.z) + 0.02;
    house(b, {
      x: ho.x, y, z: ho.z, w: ho.w, d: ho.d, h: ho.h, ry: ho.ry, roof: ho.roof,
      wall: '#9a958c', roofColor: rng.pick(['#555b63', '#4c525a', '#5c626a']),
      lit: 0.45, r: rng, mat: M.stone,
    });
    const rh = Math.min(ho.w, ho.d) * 0.55;
    const chim = [ho.x + rng.range(-0.2, 0.2), y + ho.h + rh - 0.06, ho.z + rng.range(-0.2, 0.2)];
    b.cyl(0.06, 0.08, 0.5, { x: chim[0], y: chim[1], z: chim[2], color: '#6b665f', mat: M.stone, seg: 6 });
    if (i < 3) smokeEm.push([chim[0], chim[1] + 0.5, chim[2]]);
  }

  /* ---------------------- the white tower + beacon ----------------------- */
  const T = [0.4, 3.6];
  const ty = h(T[0], T[1]);
  tower(b, { x: T[0], y: ty, z: T[1], r: 0.55, h: 8.5, cap: 'spire', wall: '#e9e4d8', capColor: '#d9d4c6', seg: 10, mat: M.smooth, lit: 0.12, rand: rng });
  b.cyl(0.62, 0.66, 0.18, { x: T[0], y: ty + 8.5 - 0.02, z: T[1], color: '#e9e4d8', mat: M.smooth, seg: 10 });

  /* ---------------------------- cypress trees ---------------------------- */
  tree(b, { x: 1.5, y: h(1.5, 3.0), z: 3.0, h: 2.4, kind: 'cypress', r: rng });
  tree(b, { x: -1.3, y: h(-1.3, 4.3), z: 4.3, h: 2.0, kind: 'cypress', r: rng });
  tree(b, { x: 4.8, y: h(4.8, -3.2), z: -3.2, h: 2.2, kind: 'cypress', r: rng });

  /* --------------------------- the elves --------------------------------- */
  const ROBES = ['#aebbc6', '#9fb0c0', '#b8c4d0', '#9fc2d4', '#a6b4c2', '#c2ccd6'];
  const qY = 0.47, pfY = 0.66;
  // the farewell pair on the pier, arms half-raised toward the sea
  figure(b, { x: -2.3, y: qY, z: -1.95, h: 0.5, color: ROBES[0], ry: 0, arms: 0.5 });
  figure(b, { x: -2.1, y: qY, z: -1.45, h: 0.5, color: ROBES[1], ry: 0, arms: 0.5 });
  // one carrying a small bundle
  figure(b, { x: -0.6, y: qY, z: -1.7, h: 0.5, color: ROBES[2] });
  b.sphere(0.07, { x: -0.45, y: qY + 0.36, z: -1.7, color: '#c9b58a', mat: M.cloth, seg: 6 });
  // a pair on the quay platform
  figure(b, { x: 0.4, y: pfY, z: -1.3, h: 0.5, color: ROBES[3] });
  figure(b, { x: 1.0, y: pfY, z: -2.15, h: 0.5, color: ROBES[4] });
  // one up the hill behind the quay
  figure(b, { x: 1.75, y: h(1.75, -1.0) + 0.03, z: -1.0, h: 0.5, color: ROBES[5] });
  // two gulls resting: on the pier and on a house roof
  sittingGull(b, -2.6, qY + 0.015, -1.5);
  sittingGull(b, 2.6, h(2.6, -2.6) + 1.9 + Math.min(1.5, 1.2) * 0.55 + 0.05, -2.6);

  /* --------------------- golden light streaks on the sea ----------------- */
  const STREAKS = [[-6.6, -1.3, 0.9], [-5.4, 0.9, 0.6], [-7.4, 0.3, 1.0], [-4.9, -2.3, 0.7], [-6.2, 1.7, 0.5], [-8.1, -0.7, 0.8]];
  for (const [sx, sz, sw] of STREAKS) {
    b.plane(sw, 0.055, { x: sx, y: WATER_Y + 0.012, z: sz, ry: 0.15, mat: M.glow, color: '#ffcf8e', glow: 1.35 });
  }

  /* --------------------------- static build ------------------------------ */
  object.add(b.build());

  /* --------------------- wavelets + mooring lines ------------------------ */
  const lines = new Lines();
  for (let i = 0; i < 8; i++) {
    const z = rng.range(-5.0, 4.8);
    const x = shoreX(z) - rng.range(0.5, 2.2);
    if (Math.hypot(x - SEA_C[0], z - SEA_C[1]) > SEA_R - 0.4) continue;
    const w = rng.range(0.6, 1.1);
    const bend = rng.range(-0.06, 0.06);
    lines.path([[x, WATER_Y + 0.005, z - w / 2], [x + bend, WATER_Y + 0.005, z], [x, WATER_Y + 0.005, z + w / 2]], '#9fc2d4', 0.75);
  }
  lines.rope([-3.2, 0.46, -2.0], [-3.55, 0.88, -1.5], 0.2, '#8a7a5a', 6);
  lines.rope([-3.2, 0.46, -1.4], [-3.55, 0.88, 0.2], 0.2, '#8a7a5a', 6);
  object.add(lines.build());

  /* ------------------------------- the ships ----------------------------- */
  const SHIPS = [];
  for (const [sx, sz, ph] of [[-4.9, -2.2, 0.6], [-4.9, 0.9, 2.9]]) {
    const sb = new Builder();
    buildShip(sb);
    const group = new THREE.Group();
    group.position.set(sx, WATER_Y + HULL_OFF, sz);
    group.rotation.y = Math.PI / 2; // length axis along x, prow west
    group.add(sb.build());
    const sailB = new Builder();
    buildSails(sailB, accent);
    const sail = new THREE.Group();
    sail.add(sailB.build());
    group.add(sail);
    object.add(group);
    SHIPS.push({ group, sail, ph });
  }

  /* -------------------------------- gulls -------------------------------- */
  const gBody = new THREE.ConeGeometry(0.03, 0.15, 5);
  gBody.rotateZ(-Math.PI / 2);
  gBody.translate(0.05, 0, 0);
  const gWing = new THREE.BoxGeometry(0.19, 0.007, 0.06);
  const gWingL = gWing.clone(); gWingL.translate(0, 0.04, 0.045);
  const gWingR = gWing.clone(); gWingR.translate(0, 0.04, -0.045);
  const gullGeo = mergeGeometries([gBody, gWingL, gWingR], false);
  const gulls = new THREE.InstancedMesh(gullGeo, new THREE.MeshStandardMaterial({ color: '#ececea', roughness: 0.55 }), 5);
  gulls.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  object.add(gulls);
  const GULLS = [
    { c: [-2.6, -1.6], R: 3.2, y: 6.2, spd: 0.16, ph: 0.0, s: 1.1 },
    { c: [-3.4, -0.4], R: 2.6, y: 5.6, spd: 0.2, ph: 2.3, s: 0.9 },
    { c: [-1.8, -2.8], R: 2.2, y: 6.8, spd: 0.24, ph: 4.1, s: 1.0 },
    { c: [-2.0, 1.2], R: 3.0, y: 5.9, spd: 0.14, ph: 1.2, s: 0.85 },
    { c: [-4.4, -2.0], R: 2.4, y: 6.5, spd: 0.18, ph: 3.4, s: 1.05 },
  ];
  const placeGulls = (t) => {
    for (let i = 0; i < GULLS.length; i++) {
      const p = GULLS[i];
      const a = t * p.spd + p.ph;
      setInst(gulls, i, p.c[0] + Math.cos(a) * p.R, p.y + 0.15 * Math.sin(t * 0.9 + p.ph), p.c[1] + Math.sin(a) * p.R, p.s, a + Math.PI / 2, 0.17 * Math.sin(t * 1.15 + p.ph));
    }
    gulls.instanceMatrix.needsUpdate = true;
  };
  placeGulls(0);

  /* --------------------------- the beacon light -------------------------- */
  const beaconY = ty + 8.5;
  const beaconFlame = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 7),
    new THREE.MeshStandardMaterial({ color: '#ffb45e', roughness: 0.5, emissive: '#c25a1e', emissiveIntensity: 1.2 }));
  beaconFlame.position.set(T[0], beaconY + 0.3, T[1]);
  const beaconGlow = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), glowMatSoft('#ffd9a0', 1.8));
  beaconGlow.position.set(T[0], beaconY + 0.25, T[1]);
  object.add(beaconFlame, beaconGlow);

  /* ----------------------------- lantern glows --------------------------- */
  const lanternGlows = [];
  for (const [lx, ly, lz, ph] of [[-3.1, 1.55, -1.7, 0.0], [0.9, 1.65, -1.7, 1.6]]) {
    const lg = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), glowMatSoft(C.lamp, 1.7));
    lg.position.set(lx, ly, lz);
    lg.userData.ph = ph;
    object.add(lg);
    lanternGlows.push(lg);
  }

  /* --------------------------- water shimmer ----------------------------- */
  const shimmerA = new THREE.Mesh(new THREE.PlaneGeometry(13, 7.5), new THREE.MeshBasicMaterial({
    color: '#9fc3d0', transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  }));
  shimmerA.rotation.x = -Math.PI / 2;
  shimmerA.position.set(-4, WATER_Y + 0.05, 0.4);
  object.add(shimmerA);
  const shimmerB = new THREE.Mesh(new THREE.PlaneGeometry(9, 5), new THREE.MeshBasicMaterial({
    color: '#a8c6d4', transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  }));
  shimmerB.rotation.x = -Math.PI / 2;
  shimmerB.rotation.z = 0.3;
  shimmerB.position.set(-4.6, WATER_Y + 0.055, 1.2);
  object.add(shimmerB);
  // the wide golden path of the sunset on the water
  const sunPath = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.3), glowMatSoft('#ffb45e', 0.9, { opacity: 0.22, blending: THREE.AdditiveBlending }));
  sunPath.rotation.x = -Math.PI / 2;
  sunPath.rotation.z = 0.12;
  sunPath.position.set(-8.1, WATER_Y + 0.045, 0.3);
  object.add(sunPath);

  /* --------------------------- chimney smoke ----------------------------- */
  const smoke = [];
  const smokeMat = new THREE.MeshBasicMaterial({ color: '#cfc8ba', transparent: true, opacity: 0.4, depthWrite: false });
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), smokeMat.clone());
    m.visible = false;
    object.add(m);
    smoke.push({ m, e: smokeEm[i % smokeEm.length], off: (i / 6) * 3.2 });
  }

  /* ------------------------------- update -------------------------------- */
  function update(t, dt) {
    // the beacon glows and flickers
    beaconGlow.material.opacity = 0.62 + 0.28 * Math.sin(t * 1.3);
    beaconGlow.scale.setScalar(0.9 + 0.18 * Math.sin(t * 1.7));
    beaconFlame.scale.set(1 + 0.09 * Math.sin(t * 2.0), 1 + 0.11 * Math.sin(t * 1.6 + 0.6), 1);
    // the lanterns breathe
    for (const lg of lanternGlows) {
      lg.material.opacity = 0.8 + 0.2 * Math.sin(t * 1.1 + lg.userData.ph);
    }
    // the ships ride and stir
    for (const s of SHIPS) {
      s.group.position.y = WATER_Y + HULL_OFF + 0.02 * Math.sin(t * 0.7 + s.ph);
      s.group.rotation.z = 0.014 * Math.sin(t * 0.55 + s.ph * 1.3);
      s.sail.rotation.z = 0.035 * Math.sin(t * 0.9 + s.ph);
      s.sail.position.y = Math.sin(t * 1.2 + s.ph) * 0.02;
    }
    // the gulls wheel slowly
    placeGulls(t);
    // the water shimmers faintly
    shimmerA.material.opacity = 0.06 + 0.035 * Math.sin(t * 1.1);
    shimmerA.position.x = SEA_C[0] + Math.sin(t * 0.16) * 0.7;
    shimmerB.material.opacity = 0.045 + 0.03 * Math.sin(t * 0.85 + 1.7);
    shimmerB.position.z = SEA_C[1] + Math.sin(t * 0.13 + 2.2) * 0.5;
    sunPath.material.opacity = 0.17 + 0.06 * Math.sin(t * 0.9);
    // chimney smoke rises
    for (const p of smoke) {
      const k = (t * 0.12 + p.off) % 1;
      const em = p.e;
      p.m.visible = true;
      p.m.position.set(em[0] + Math.sin(k * 5 + p.off * 9) * 0.18 * k, em[1] + k * 1.3, em[2] + Math.cos(k * 4) * 0.16 * k);
      const sc = 0.5 + k * 1.4;
      p.m.scale.set(sc, sc * 1.3, sc);
      p.m.material.opacity = 0.38 * Math.sin(Math.PI * Math.min(1, k * 1.3));
    }
  }

  return { object, update };
}

/* soft additive glow for the beacon and lanterns */
function glowMatSoft(color, intensity, o = {}) {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(color).multiplyScalar(intensity), toneMapped: false,
    transparent: true, depthWrite: false, ...o,
  });
}
