// Lake-town (Esgaroth) — a town on stilts in a cold dark lake, under the
// shadow of the Lonely Mountain. One strong idea: warm timber houses on tall
// thin piles above black water, a long wooden bridge from the rocky shore,
// amber windows reflected in the lake, a watch-tower with a brazier, boats.
import { THREE, Builder, M, C, terrainDisc, fbm, hash2, bridge, house, tower, boat, flag, glowMat, Lines } from '../kit.js';
import { figure } from './_ab_util.js';

const WATER_Y = 0.35;   // the dark lake surface
const LAKE_R = 8.6;     // the lake covers most of the plinth

/* ------------------------------ terrain ------------------------------ */
// a cold lakebed, with a narrow rocky shore rising on the east bank
const h = (x, z) => {
  let y = 0.05 + 0.05 * fbm(x * 0.55 + 1.7, z * 0.55 + 3.3, { oct: 3, seed: 31 });
  const sx = Math.min(1, Math.max(0, (x - 5.0) / 2.0));
  if (sx > 0) {
    const rock = 0.5 + 0.5 * fbm(x * 0.9 + 5.0, z * 0.9 + 9.0, { oct: 3, seed: 17 });
    y += sx * sx * (0.3 + 0.85 * rock);
  }
  return Math.max(0.02, y);
};

const colorAt = (x, z, y, up) => {
  const sx = Math.min(1, Math.max(0, (x - 5.0) / 2.0));
  const j = hash2(Math.round(x * 4), Math.round(z * 4), 3);
  if (sx > 0.02) {
    const dark = 0x333d49, base = 0x4a5662;
    const c = up < 0.62 ? dark : Math.round(base + (dark - base) * Math.min(1, y / 1.2) + (j - 0.5) * 14);
    return '#' + c.toString(16).padStart(6, '0');
  }
  const base = 0x49535e, light = 0x5a6570;
  const c = Math.round(base + (light - base) * j);
  return '#' + c.toString(16).padStart(6, '0');
};

/* ---------------------------- small helpers --------------------------- */
// a plank deck, bottom at deckY - 0.13 so its top sits at deckY
function deck(b, { x, z, w, d, deckY }) {
  b.box(w, 0.13, d, { x, y: deckY - 0.13, z, color: '#6e4a2c', mat: M.wood });
}

// tall thin stilts from the lakebed (y=0.05) up to the deck
function stilts(b, { x, z, w, d, deckY }) {
  const ox = Math.max(0.26, w / 2 - 0.22), oz = Math.max(0.26, d / 2 - 0.22);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    b.cyl(0.05, 0.06, deckY - 0.05, { x: x + sx * ox, y: 0.05, z: z + sz * oz, color: '#4d3426', mat: M.wood, seg: 6 });
  }
}

// diagonal cross-braces between the stilts, above the water line
function braces(b, { x, z, w, d, deckY }) {
  const ox = Math.max(0.26, w / 2 - 0.22), oz = Math.max(0.26, d / 2 - 0.22);
  b.rod([x - ox, 0.6, z - oz], [x + ox, deckY - 0.25, z + oz], 0.022, { color: '#4d3426', mat: M.wood, seg: 4 });
  b.rod([x - ox, 0.75, z + oz], [x + ox, deckY - 0.25, z - oz], 0.022, { color: '#4d3426', mat: M.wood, seg: 4 });
}

// distance from a deck centre to its edge along the (dx,dz) direction
function deckEdge(A, dx, dz) {
  const hw = A.w ? A.w / 2 : 0.6, hd = A.d ? A.d / 2 : 0.6;
  const len = Math.hypot(dx, dz) || 1e-6;
  const c = Math.abs(dx) / len, s = Math.abs(dz) / len;
  return c > s ? hw / Math.max(c, 1e-6) : hd / Math.max(s, 1e-6);
}

// a thin plank walkway between two decks (A and B have x, z, deck)
function walkway(b, A, B, { rail = true } = {}) {
  const dx = B.x - A.x, dz = B.z - A.z;
  const len = Math.hypot(dx, dz) || 0.001;
  const nx = -dz / len, nz = dx / len;
  const t1 = Math.min(0.85, Math.max(0.15, deckEdge(A, dx, dz) / len));
  const t2 = Math.min(0.85, Math.max(0.15, deckEdge(B, -dx, -dz) / len));
  const p1 = [A.x + dx * t1, A.deck + 0.03, A.z + dz * t1];
  const p2 = [B.x - dx * t2, B.deck + 0.03, B.z - dz * t2];
  b.beam(p1, p2, 0.09, { color: '#6e4a2c', mat: M.wood });
  b.beam([p1[0] + nx * 0.09, p1[1], p1[2] + nz * 0.09], [p2[0] + nx * 0.09, p2[1], p2[2] + nz * 0.09], 0.09, { color: '#7a5233', mat: M.wood });
  if (rail) {
    b.rod([p1[0] - nx * 0.2, p1[1] + 0.24, p1[2] - nz * 0.2], [p2[0] - nx * 0.2, p2[1] + 0.24, p2[2] - nz * 0.2], 0.02, { color: '#4d3426', mat: M.wood, seg: 4 });
  }
}

/* ------------------------------- the city ------------------------------ */
export default function build({ rng, city, accent }) {
  const b = new Builder();
  const object = new THREE.Group();

  /* ------------------------------ terrain ------------------------------ */
  terrainDisc(b, { r: 10.5, rings: 52, segs: 96, height: h, colorAt, mat: M.stone, seed: 31 });

  /* ------------------------------- the lake ---------------------------- */
  const waterMat = M.water.clone();
  waterMat.side = THREE.DoubleSide;
  waterMat.userData.noShadow = true;
  b.disc(LAKE_R, { x: 0, y: WATER_Y, z: 0, color: '#1e3a44', mat: waterMat, seg: 56 });

  /* ----------- faint amber reflections on the water (static) ------------ */
  const reflectMat = M.glow.clone();
  reflectMat.transparent = true;
  reflectMat.opacity = 0.5;
  reflectMat.userData.noShadow = true;
  b.disc(2.4, { x: 0.15, y: WATER_Y + 0.012, z: 0.15, color: C.lamp, glow: 0.11, mat: reflectMat, seg: 30 });

  /* --------------------------- the stilt town -------------------------- */
  const QUAY = { x: 0.7, z: 0.35, w: 2.6, d: 1.5, deck: 1.72 };
  const HOUSES = [
    { x: 0.35, z: 1.8, w: 1.05, d: 1.1, deck: 1.76, ry: 0.25 },
    { x: -1.15, z: 1.8, w: 1.15, d: 1.0, deck: 1.7, ry: -0.5 },
    { x: -1.75, z: 0.3, w: 1.2, d: 1.05, deck: 1.75, ry: 0.7 },
    { x: -0.65, z: -1.15, w: 1.0, d: 1.15, deck: 1.8, ry: 1.55 },
    { x: 1.15, z: -1.25, w: 1.1, d: 1.2, deck: 1.68, ry: 2.05 },
  ];
  const TOWER = { x: -1.95, z: -1.6, deck: 1.9 };
  const smokeEmitters = [];

  for (const H of HOUSES) {
    H.h = 1.3 + rng.range(0, 0.25);
    deck(b, { x: H.x, z: H.z, w: H.w + 0.3, d: H.d + 0.3, deckY: H.deck });
    stilts(b, { x: H.x, z: H.z, w: H.w + 0.3, d: H.d + 0.3, deckY: H.deck });
    braces(b, { x: H.x, z: H.z, w: H.w + 0.3, d: H.d + 0.3, deckY: H.deck });
    house(b, {
      x: H.x, y: H.deck, z: H.z, w: H.w, d: H.d, h: H.h, ry: H.ry, roof: 'gable',
      wall: rng.pick(['#8a5d3d', '#7d5436', '#96684a', '#8a5233']),
      roofColor: rng.pick(['#4d3426', '#3f2c1c', '#55402c']),
      win: true, lit: 0.72, r: rng, mat: M.wood,
    });
    // a faint glow patch on the water under the lit windows
    b.disc(0.42 + rng.range(0, 0.2), { x: H.x, y: WATER_Y + 0.012, z: H.z, color: C.lamp, glow: 0.5, mat: reflectMat, seg: 16 });
  }
  // doors on two houses, facing the walkways
  b.box(0.3, 0.48, 0.05, { x: HOUSES[0].x, y: HOUSES[0].deck + 0.02, z: HOUSES[0].z - HOUSES[0].d / 2 - 0.03, color: '#3f2c1c', mat: M.wood });
  b.box(0.05, 0.48, 0.3, { x: HOUSES[2].x + HOUSES[2].w / 2 + 0.03, y: HOUSES[2].deck + 0.02, z: HOUSES[2].z, color: '#3f2c1c', mat: M.wood });
  // chimneys with smoke on two houses
  for (const H of [HOUSES[0], HOUSES[4]]) {
    const chX = H.x + Math.cos(H.ry) * 0.32, chZ = H.z + Math.sin(H.ry) * 0.32;
    b.cyl(0.07, 0.085, 0.62, { x: chX, y: H.deck + H.h + 0.3, z: chZ, color: '#5a4636', mat: M.wood, seg: 7 });
    smokeEmitters.push([chX, H.deck + H.h + 0.95, chZ, 0.5, 1.2]);
  }

  /* ------------------------------ the quay ------------------------------ */
  deck(b, { x: QUAY.x, z: QUAY.z, w: QUAY.w, d: QUAY.d, deckY: QUAY.deck });
  stilts(b, { x: QUAY.x, z: QUAY.z, w: QUAY.w, d: QUAY.d, deckY: QUAY.deck });
  b.cyl(0.05, 0.06, QUAY.deck - 0.05, { x: QUAY.x, y: 0.05, z: QUAY.z - 0.55, color: '#4d3426', mat: M.wood, seg: 6 });
  b.cyl(0.05, 0.06, QUAY.deck - 0.05, { x: QUAY.x, y: 0.05, z: QUAY.z + 0.55, color: '#4d3426', mat: M.wood, seg: 6 });
  braces(b, { x: QUAY.x, z: QUAY.z, w: QUAY.w, d: QUAY.d, deckY: QUAY.deck });
  b.disc(1.3, { x: QUAY.x, y: WATER_Y + 0.012, z: QUAY.z, color: C.lamp, glow: 0.32, mat: reflectMat, seg: 22 });

  // a crane on the quay's south edge, boom over the water
  const craneX = QUAY.x + 0.85, craneZ = QUAY.z - 0.45;
  const craneTop = QUAY.deck + 1.48;
  b.cyl(0.06, 0.085, 1.5, { x: craneX, y: QUAY.deck, z: craneZ, color: '#4d3426', mat: M.wood, seg: 8 });
  const boomTip = [craneX + 0.25, QUAY.deck + 1.42, craneZ - 1.7];
  b.rod([craneX, craneTop, craneZ], boomTip, 0.04, { color: '#4d3426', mat: M.wood, seg: 5 });
  const ropes = new Lines();
  ropes.seg([craneX - 0.1, QUAY.deck + 0.1, craneZ + 0.15], [craneX, craneTop - 0.08, craneZ], '#9a8f7a', 0.9);
  ropes.seg(boomTip, [boomTip[0], QUAY.deck + 0.78, boomTip[2]], '#9a8f7a', 0.9);
  b.cyl(0.13, 0.15, 0.28, { x: boomTip[0], y: QUAY.deck + 0.44, z: boomTip[2], color: '#7a5233', mat: M.wood, seg: 8 });

  // barrels, crates, a lantern and a mooring post on the quay
  for (let i = 0; i < 3; i++) {
    b.cyl(0.15, 0.17, 0.34, { x: QUAY.x - 0.5 + i * 0.36, y: QUAY.deck, z: QUAY.z + 0.5, color: rng.pick(['#7a5233', '#6e4428', '#8a5d3d']), mat: M.wood, seg: 9 });
  }
  b.box(0.34, 0.3, 0.34, { x: QUAY.x - 0.4, y: QUAY.deck, z: QUAY.z - 0.1, color: '#6e4a2c', mat: M.wood });
  b.box(0.34, 0.3, 0.34, { x: QUAY.x - 0.05, y: QUAY.deck, z: QUAY.z - 0.05, color: '#7a5233', mat: M.wood });
  b.box(0.3, 0.26, 0.3, { x: QUAY.x - 0.05, y: QUAY.deck + 0.3, z: QUAY.z - 0.05, color: '#6e4a2c', mat: M.wood });
  b.cyl(0.035, 0.045, 0.85, { x: QUAY.x - 0.9, y: QUAY.deck, z: QUAY.z + 0.3, color: '#4d3426', mat: M.wood, seg: 6 });
  b.sphere(0.09, { x: QUAY.x - 0.9, y: QUAY.deck + 0.92, z: QUAY.z + 0.3, mat: M.glow, color: C.lamp, glow: 2.0, seg: 8 });
  b.cyl(0.04, 0.05, 0.3, { x: QUAY.x + 0.55, y: QUAY.deck, z: QUAY.z - 0.45, color: '#4d3426', mat: M.wood, seg: 6 });
  figure(b, { x: QUAY.x - 0.35, y: QUAY.deck, z: QUAY.z + 0.6, h: 0.34, color: accent, ry: 2.6 });
  figure(b, { x: QUAY.x + 0.3, y: QUAY.deck, z: QUAY.z + 0.7, h: 0.33, color: '#8a5d3d', ry: 1.8 });

  /* --------------------------- the watch-tower --------------------------- */
  deck(b, { x: TOWER.x, z: TOWER.z, w: 1.2, d: 1.2, deckY: TOWER.deck });
  stilts(b, { x: TOWER.x, z: TOWER.z, w: 1.2, d: 1.2, deckY: TOWER.deck });
  braces(b, { x: TOWER.x, z: TOWER.z, w: 1.2, d: 1.2, deckY: TOWER.deck });
  tower(b, { x: TOWER.x, y: TOWER.deck, z: TOWER.z, r: 0.42, h: 2.5, cap: 'cone', wall: '#7d5436', capColor: '#4d3426', seg: 10, mat: M.wood, lit: 0.35, rand: rng });
  const topY = TOWER.deck + 2.5 + 0.42 * 2.2; // cone apex
  // a small fire-platform, the brazier and a pennant (the accent)
  b.box(0.7, 0.08, 0.7, { x: TOWER.x, y: topY - 0.04, z: TOWER.z, color: '#6e4a2c', mat: M.wood });
  b.sphere(0.16, { x: TOWER.x, y: topY + 0.02, z: TOWER.z, sx: 1.25, sy: 0.5, color: '#3a3a40', mat: M.rough_metal, seg: 10 });
  b.sphere(0.085, { x: TOWER.x, y: topY + 0.09, z: TOWER.z, mat: M.glow, color: '#ff8a3c', glow: 1.7, seg: 8 });
  flag(b, { x: TOWER.x + 0.3, y: topY - 0.15, z: TOWER.z, h: 0.55, color: accent, ry: 0.6 });
  b.disc(0.5, { x: TOWER.x, y: WATER_Y + 0.012, z: TOWER.z, color: C.lamp, glow: 0.5, mat: reflectMat, seg: 16 });

  /* ---------------------- the walkways (plank bridges) -------------------- */
  walkway(b, QUAY, HOUSES[0]);
  walkway(b, QUAY, HOUSES[4]);
  walkway(b, QUAY, HOUSES[2]);
  walkway(b, HOUSES[0], HOUSES[1]);
  walkway(b, HOUSES[1], HOUSES[2]);
  walkway(b, HOUSES[2], HOUSES[3]);
  walkway(b, HOUSES[3], TOWER);
  walkway(b, HOUSES[3], HOUSES[4]);
  // a mid-span pile under the long quay → west-house walkway
  b.cyl(0.05, 0.06, 1.68, { x: -0.525, y: 0.05, z: 0.325, color: '#4d3426', mat: M.wood, seg: 6 });

  /* ------------------- the long wooden bridge to the shore ---------------- */
  const shoreX = 6.55, shoreZ = 0.4;
  const jettyY = Math.max(h(shoreX, shoreZ), WATER_Y - 0.03);
  b.box(1.35, 0.16, 0.95, { x: shoreX, y: jettyY, z: shoreZ, color: '#6e4a2c', mat: M.wood });
  for (const jx of [-0.35, 0.35]) {
    b.cyl(0.06, 0.07, Math.max(0.12, jettyY - 0.08), { x: shoreX + jx, y: 0.05, z: shoreZ, color: '#4d3426', mat: M.wood, seg: 6 });
  }
  const bFrom = [shoreX, jettyY + 0.19, shoreZ];
  const bTo = [QUAY.x + QUAY.w / 2 - 0.15, QUAY.deck + 0.03, QUAY.z];
  const BRISE = 0.42;
  bridge(b, { from: bFrom, to: bTo, w: 0.6, rise: BRISE, color: '#6e4a2c', mat: M.wood, rails: true, segments: 18 });
  const bX = (t) => bFrom[0] + (bTo[0] - bFrom[0]) * t;
  const bY = (t) => bFrom[1] + (bTo[1] - bFrom[1]) * t + Math.sin(Math.PI * t) * BRISE;
  const bZ = (t) => bFrom[2] + (bTo[2] - bFrom[2]) * t;
  // piles under the bridge
  for (const tt of [0.3, 0.58]) {
    b.cyl(0.055, 0.065, Math.max(0.15, bY(tt) - 0.14), { x: bX(tt), y: 0.05, z: bZ(tt), color: '#4d3426', mat: M.wood, seg: 6 });
  }
  // lanterns along the bridge
  for (const tt of [0.22, 0.46, 0.7]) {
    b.cyl(0.024, 0.03, 0.4, { x: bX(tt), y: bY(tt) + 0.04, z: bZ(tt), color: '#4d3426', mat: M.wood, seg: 5 });
    b.sphere(0.075, { x: bX(tt), y: bY(tt) + 0.46, z: bZ(tt), mat: M.glow, color: C.lamp, glow: 1.85, seg: 8 });
  }

  /* ------------------------------- the shore ------------------------------ */
  // a beached boat with a lantern
  const bch = [6.2, -1.7];
  const bchY = Math.max(h(bch[0], bch[1]), WATER_Y - 0.05);
  boat(b, { x: bch[0], y: bchY, z: bch[1], len: 1.05, ry: -0.5, color: '#6e4428', mast: false });
  b.sphere(0.06, { x: bch[0] + 0.15, y: bchY + 0.2, z: bch[1], mat: M.glow, color: C.lamp, glow: 1.6, seg: 8 });
  // reeds in the shallows
  for (let i = 0; i < 9; i++) {
    const rx = 5.6 + rng.range(0, 0.9), rz = rng.range(-2.3, 2.3);
    const ry = Math.max(h(rx, rz), 0.08) + 0.01;
    b.rod([rx, ry, rz], [rx + rng.range(-0.05, 0.05), ry + rng.range(0.45, 0.7), rz], 0.014, { color: '#5a6a4a', mat: M.flat, seg: 4 });
  }
  // scattered rocks along the bank
  for (let i = 0; i < 5; i++) {
    const rxp = 6.0 + rng.range(0.3, 2.2), rzp = rng.range(-4.5, 3.0);
    if (Math.abs(rxp - shoreX) < 0.8 && Math.abs(rzp - shoreZ) < 0.9) continue;
    const ryp = h(rxp, rzp);
    b.sphere(rng.range(0.12, 0.3), { x: rxp, y: ryp - 0.03, z: rzp, sx: 1.3, sy: 0.6, color: rng.pick(['#3d4854', '#45525f', '#38424e']), mat: M.flat, seg: 8 });
  }
  // a small shore fire by the bridge
  const sf = { x: 6.75, z: -0.9 };
  const sfY = h(sf.x, sf.z) + 0.01;
  b.cyl(0.05, 0.06, 0.5, { x: sf.x - 0.18, y: sfY, z: sf.z, rx: 0.5, color: '#4d3426', mat: M.wood, seg: 6 });
  b.cyl(0.05, 0.06, 0.5, { x: sf.x + 0.18, y: sfY, z: sf.z, rx: -0.5, color: '#4d3426', mat: M.wood, seg: 6 });
  b.sphere(0.07, { x: sf.x, y: sfY + 0.1, z: sf.z, mat: M.glow, color: '#ff8a3c', glow: 1.4, seg: 8 });

  // men of the lake
  figure(b, { x: 6.9, y: h(6.9, 0.9) + 0.01, z: 0.9, h: 0.34, color: '#4a7aa0', ry: 2.9 });
  figure(b, { x: bX(0.45), y: bY(0.45) + 0.04, z: bZ(0.45), h: 0.33, color: '#c26a43', ry: Math.PI });
  figure(b, { x: (HOUSES[0].x + HOUSES[1].x) / 2, y: 1.76, z: HOUSES[0].z, h: 0.32, color: '#7aa04a', ry: 3.1 });
  figure(b, { x: HOUSES[0].x, y: HOUSES[0].deck, z: HOUSES[0].z - 0.2, h: 0.33, color: '#8a5d3d', ry: 2.2 });
  figure(b, { x: HOUSES[4].x + 0.3, y: HOUSES[4].deck, z: HOUSES[4].z + 0.25, h: 0.34, color: '#5d6474', ry: -0.6 });
  figure(b, { x: HOUSES[3].x + 0.35, y: HOUSES[3].deck, z: HOUSES[3].z, h: 0.33, color: '#7aa04a', ry: 0.4 });

  /* ----------- the Lonely Mountain, a dark silhouette far away ------------- */
  const MT = { x: 0.0, z: -8.15 };
  b.cyl(2.0, 2.2, 0.5, { x: MT.x, y: 0.05, z: MT.z, color: '#2a3340', mat: M.flat, seg: 12 });
  b.cone(2.1, 6.4, { x: MT.x + 0.1, y: 0.05, z: MT.z, seg: 9, color: '#232b36', mat: M.flat });
  b.cone(1.45, 4.0, { x: MT.x - 1.75, y: 0.05, z: MT.z + 0.35, seg: 8, color: '#2a3340', mat: M.flat });
  b.cone(1.35, 3.5, { x: MT.x + 1.8, y: 0.05, z: MT.z + 0.25, seg: 8, color: '#2a3340', mat: M.flat });
  b.sphere(0.8, { x: MT.x - 2.6, y: 0.05, z: MT.z - 0.4, sx: 1, sy: 0.55, color: '#333d4a', mat: M.flat, seg: 10 });
  b.sphere(0.7, { x: MT.x + 2.4, y: 0.05, z: MT.z - 0.5, sx: 1, sy: 0.5, color: '#333d4a', mat: M.flat, seg: 10 });

  /* -------------------------------- boats --------------------------------- */
  const boats = [];
  const makeBoat = (x, z, ry, len, color, lantern) => {
    const bb = new Builder();
    boat(bb, { len, color, mast: false });
    const g = new THREE.Group();
    g.add(bb.build());
    if (lantern) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), glowMat(C.lamp, 1.6, { transparent: true, opacity: 0.9, depthWrite: false }));
      lamp.position.set(0.1, 0.3, 0);
      g.add(lamp);
    }
    g.position.set(x, WATER_Y + 0.05, z);
    g.rotation.y = ry;
    object.add(g);
    boats.push({ g, baseY: WATER_Y + 0.05, phase: rng.range(0, 6.28) });
  };
  makeBoat(2.15, -0.35, -0.5, 1.15, '#7a5233', true); // tied by the quay
  makeBoat(1.3, -1.75, 0.4, 1.0, '#8a5d3d', true);    // under H5's stilts

  // mooring ropes
  ropes.rope([QUAY.x + 0.55, QUAY.deck, QUAY.z - 0.45], [2.15, WATER_Y + 0.12, -0.35], 0.1, '#8a7a5f', 6, 0.9);
  ropes.rope([1.48, WATER_Y + 0.3, -1.63], [1.3, WATER_Y + 0.12, -1.75], 0.07, '#8a7a5f', 6, 0.9);
  object.add(ropes.build());

  /* --------------------------- animated light ----------------------------- */
  // the lake shimmers faintly
  const shimmer = new THREE.Mesh(new THREE.PlaneGeometry(15, 15), new THREE.MeshBasicMaterial({
    color: '#8fb3c2', transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  }));
  shimmer.rotation.x = -Math.PI / 2;
  shimmer.position.set(-0.3, WATER_Y + 0.06, -0.2);
  object.add(shimmer);

  // the window reflections pulse subtly
  const refl = [];
  const reflSpots = [
    [0.35, 1.8], [-1.15, 1.8], [-1.75, 0.3], [-0.65, -1.15], [1.15, -1.25], [0.7, 0.35],
  ];
  for (const [rx, rz] of reflSpots) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.3 + rng.range(0, 0.15), 18), glowMat(C.lamp, 0.5, { transparent: true, opacity: 0.42, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(rx, WATER_Y + 0.02, rz);
    object.add(m);
    refl.push({ m, phase: rng.range(0, 6.28) });
  }

  // the brazier on the watch-tower
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.24, 8), glowMat('#ff9a3c', 1.7, { transparent: true, opacity: 0.95, depthWrite: false }));
  flame.position.set(TOWER.x, topY + 0.16, TOWER.z);
  const fireGlow = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), glowMat('#ff8a3c', 1.25, { transparent: true, opacity: 0.55, depthWrite: false }));
  fireGlow.position.set(TOWER.x, topY + 0.1, TOWER.z);
  object.add(flame, fireGlow);

  // the shore fire
  const sfFlame = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 8), glowMat('#ff9a3c', 1.6, { transparent: true, opacity: 0.9, depthWrite: false }));
  sfFlame.position.set(sf.x, sfY + 0.14, sf.z);
  const sfGlow = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), glowMat('#ff8a3c', 1.2, { transparent: true, opacity: 0.5, depthWrite: false }));
  sfGlow.position.set(sf.x, sfY + 0.1, sf.z);
  object.add(sfFlame, sfGlow);

  // chimney smoke
  const smoke = [];
  const smokeMat = new THREE.MeshBasicMaterial({ color: '#b9b4a8', transparent: true, opacity: 0.5, depthWrite: false });
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), smokeMat.clone());
    m.visible = false;
    object.add(m);
    smoke.push({ m, e: smokeEmitters[i % smokeEmitters.length], off: (i / 6) * 3.2 });
  }

  /* ------------------------------ static build ---------------------------- */
  const staticGroup = b.build();
  object.add(staticGroup);

  function update(t, dt) {
    // the boats bob very slightly on the cold water
    for (const bt of boats) {
      bt.g.position.y = bt.baseY + Math.sin(t * 0.9 + bt.phase) * 0.015;
      bt.g.rotation.z = Math.sin(t * 0.7 + bt.phase) * 0.012;
    }
    // the lake shimmers faintly
    shimmer.material.opacity = 0.045 + 0.03 * Math.sin(t * 1.05);
    shimmer.position.x = -0.3 + Math.sin(t * 0.19) * 0.6;
    shimmer.position.z = -0.2 + Math.cos(t * 0.15) * 0.45;
    // the reflections of the windows pulse subtly
    for (const r of refl) {
      r.m.material.opacity = 0.3 + 0.13 * Math.sin(t * 1.15 + r.phase);
      r.m.scale.setScalar(0.9 + 0.08 * Math.sin(t * 0.8 + r.phase * 1.3));
    }
    // the brazier fire flickers
    flame.scale.set(1 + 0.12 * Math.sin(t * 2.1), 1 + 0.16 * Math.sin(t * 1.6 + 0.8), 1);
    fireGlow.material.opacity = 0.45 + 0.25 * Math.sin(t * 1.7);
    fireGlow.scale.setScalar(0.85 + 0.18 * Math.sin(t * 1.9));
    sfFlame.scale.set(1 + 0.1 * Math.sin(t * 2.4 + 1.2), 1 + 0.14 * Math.sin(t * 1.8 + 0.3), 1);
    sfGlow.material.opacity = 0.4 + 0.2 * Math.sin(t * 1.5 + 0.7);
    sfGlow.scale.setScalar(0.9 + 0.15 * Math.sin(t * 2.0 + 1.1));
    // the chimney smoke drifts up
    for (const p of smoke) {
      const k = (t * 0.13 + p.off) % 1;
      const em = p.e;
      p.m.visible = true;
      p.m.position.set(em[0] + Math.sin(k * 5 + p.off * 9) * 0.18 * k, em[1] + k * 1.35, em[2] + Math.cos(k * 4) * 0.15 * k);
      const sc = 0.5 + k * 1.6;
      p.m.scale.set(sc, sc * 1.25, sc);
      p.m.material.opacity = 0.4 * Math.sin(Math.PI * Math.min(1, k * 1.35));
    }
  }

  return { object, update };
}
