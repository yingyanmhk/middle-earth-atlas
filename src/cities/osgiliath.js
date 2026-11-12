// Osgiliath — the ruined city of kings, straddling the Anduin.
// One strong idea: the great river runs through the middle of a ruined white
// city — broken arches on both banks, and the two broken halves of the great
// bridge reaching out over the water with a gap between them. The silhouette:
// white ruins on both banks of a river, one broken bridge spanning it.
import { THREE, Builder, M, C, terrainDisc, fbm, hash2, arch, glowMat } from '../kit.js';
import { figure, setInst } from './_ab_util.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const WATER_Y = 0.5;      // the Anduin's surface
const BRIDGE_X = -1.2;    // the great bridge crosses the river at x = BRIDGE_X
// scorched ground under the two worst-burned ruins (watch-tower, south hall)
const BURN = [[-4.7, 3.6, 2.4], [0.0, -4.6, 2.0]];

const RUIN = ['#d9d3c4', '#cfc8b6', '#c6bfae', '#dcd6c7', '#c2bbaa']; // ruined white stone
const SOOT = ['#3a3635', '#2c2927', '#47413c'];                       // fire-scarred dark stone
const MARBLE = ['#e9e3d5', '#e2dcca', '#dcd5c2'];                     // smooth white marble
const DARK = '#26221e';                                               // arch voids / doorways

/* ------------------------------------------------------------------ h -- */

const h = (x, z) => {
  // rolling grey-brown banks…
  let y = 0.5 + 0.3 * fbm(x * 0.26 + 2.0, z * 0.26 + 5.2, { oct: 4, seed: 31 });
  // …with the Anduin channel carved between them (the river runs along x)
  y -= 1.05 * Math.exp(-((z / 1.18) ** 2));
  // gentle crests on both banks
  y += 0.45 * Math.exp(-(((z - 3.9) ** 2) / 5));
  y += 0.45 * Math.exp(-(((z + 3.9) ** 2) / 5));
  return Math.max(0.07, y);
};

function mixI(a, b, t) {
  const r = ((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t;
  const g = ((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t;
  const bl = (a & 255) * (1 - t) + (b & 255) * t;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl);
}

const colorAt = (x, z, y, up) => {
  // the riverbed silt (mostly hidden under the water band)
  if (Math.abs(z) < 1.05 && y < WATER_Y + 0.1) return '#45403c';
  const j = hash2(Math.round(x * 2.3), Math.round(z * 2.3), 41);
  let c;
  if (y > 0.9) c = Math.round(0x9a8f7c + (j - 0.5) * 18);        // dry upper banks
  else if (y > 0.5) c = Math.round(0x807464 + (j - 0.5) * 16);   // mid banks
  else c = Math.round(0x6e6355 + (j - 0.5) * 16);                // wet shore
  for (const [bx, bz, br] of BURN) {
    const d = Math.hypot(x - bx, z - bz);
    if (d < br) c = mixI(c, 0x33302c, 0.5 * (1 - d / br));
  }
  return '#' + c.toString(16).padStart(6, '0');
};

/* ------------------------------------------------------- ruin helpers -- */

/** A broken wall: solid lower storey + a jagged upper storey + fire scars. */
function brokenWall(b, rng, x, z, ry, w, d, H) {
  const gy = h(x, z);
  b.push({ x, y: gy, z, ry });
  b.box(w, H * 0.52, d, { color: rng.pick(RUIN), mat: M.stone });
  // ragged upper storey: irregular blocks with gaps between them
  const n = rng.int(3, 5);
  let ux = -w * 0.5 + rng.range(0.05, 0.2);
  for (let i = 0; i < n; i++) {
    const bw = rng.range(0.3, 0.58);
    const bh = H * rng.range(0.16, 0.38);
    b.box(bw, bh, d * rng.range(0.6, 1.0), {
      x: ux + bw / 2, y: H * 0.52 + rng.range(-0.05, 0.05),
      z: rng.range(-d * 0.18, d * 0.18), rz: rng.range(-0.07, 0.07),
      color: rng.chance(0.25) ? rng.pick(SOOT) : rng.pick(RUIN), mat: M.stone,
    });
    ux += bw + rng.range(0.03, 0.16);
  }
  // a fire scar on one face (soot-dark patch)
  if (rng.chance(0.7)) {
    const face = rng.int(0, 3);
    const along = face % 2 === 0 ? w : d;
    const off = (face % 2 === 0 ? d : w) / 2 + 0.02;
    const ang = face * Math.PI / 2;
    const u = rng.range(-along * 0.3, along * 0.3);
    const v = rng.range(H * 0.18, H * 0.48);
    b.quad(rng.range(0.3, 0.6), rng.range(0.35, 0.7), {
      x: Math.sin(ang) * off + Math.cos(ang) * u,
      y: v,
      z: Math.cos(ang) * off - Math.sin(ang) * u,
      ry: ang, mat: M.smooth, color: rng.pick(SOOT),
    });
  }
  b.pop();
}

/** A standing arch; `broken` gives it a shattered lintel on one side. */
function standingArch(b, rng, x, z, ry, w, ah, broken) {
  const gy = h(x, z);
  if (broken) {
    b.push({ x, y: gy, z, ry });
    const t = 0.28, depth = 0.42, span = w - t * 2;
    const R = span / 2 + t / 2;
    b.box(t, ah, depth, { x: -w / 2 + t / 2, color: rng.pick(RUIN), mat: M.stone });
    b.box(t, ah, depth, { x: w / 2 - t / 2, color: rng.pick(RUIN), mat: M.stone });
    // the lintel survives only on one side; the other side is a jagged gap
    b.geo(new THREE.TorusGeometry(R, t / 2, 6, 12, Math.PI * 0.6, 0), {
      y: ah, sz: depth / t, color: rng.pick(RUIN), mat: M.stone,
    });
    for (let i = 0; i < 3; i++) {
      b.box(rng.range(0.12, 0.28), rng.range(0.1, 0.32), depth * 0.7, {
        x: -w * 0.22 + rng.range(-0.18, 0.22), y: ah + rng.range(0.55, 1.05),
        z: rng.range(-0.08, 0.08), rz: rng.range(-0.2, 0.2),
        color: rng.chance(0.45) ? rng.pick(SOOT) : rng.pick(RUIN), mat: M.stone,
      });
    }
    // a fallen chunk at the base of the broken side
    b.box(0.5, 0.22, 0.38, { x: -w / 2 + t * 0.2, y: 0.1, z: 0.12, ry: 0.4, color: rng.pick(RUIN), mat: M.stone });
    b.pop();
  } else {
    arch(b, { x, y: gy, z, w, h: ah, t: 0.28, depth: 0.42, ry, color: rng.pick(RUIN), mat: M.stone });
  }
}

/** A toppled column lying on the ground (marble shaft + capital + fragment). */
function fallenColumn(b, rng, x, z, ry, len, r) {
  const gy = h(x, z);
  const dx = Math.cos(ry), dz = Math.sin(ry);
  const high = rng.range(0.04, 0.16);
  b.rod([x, gy + 0.05, z], [x + dx * len, gy + 0.05 + high, z + dz * len], r, {
    r2: r * 0.8, color: rng.pick(MARBLE), mat: M.smooth, seg: 8,
  });
  const ex = x + dx * len, ez = z + dz * len;
  b.box(r * 2.4, 0.12, r * 2.4, { x: ex, y: gy + 0.05 + high + 0.02, z: ez, ry, color: rng.pick(MARBLE), mat: M.smooth });
  b.box(r * 2.6, 0.1, r * 2.6, { x, y: gy + 0.03, z, ry, color: rng.pick(RUIN), mat: M.stone });
  // a broken drum fragment beside it
  const fx = x - dz * rng.range(0.5, 0.9), fz = z + dx * rng.range(0.5, 0.9);
  b.cyl(r * 0.7, r * 0.9, rng.range(0.4, 0.7), {
    x: fx, y: Math.max(0.25, h(fx, fz)) + 0.03, z: fz,
    rx: rng.range(1.2, 1.6), ry: rng.range(0, 3),
    color: rng.pick(MARBLE), mat: M.smooth, seg: 8,
  });
}

/** A standing column with its capital knocked off (jagged top). */
function brokenColumn(b, rng, x, z, ry, r, H) {
  const gy = h(x, z);
  b.push({ x, y: gy, z, ry });
  b.cyl(r, r * 1.08, H, { color: rng.pick(MARBLE), mat: M.smooth, seg: 10 });
  for (let i = 0; i < 3; i++) {
    b.box(rng.range(0.14, 0.3), rng.range(0.08, 0.2), rng.range(0.14, 0.3), {
      x: rng.range(-0.12, 0.12), y: H + rng.range(0.0, 0.22), z: rng.range(-0.12, 0.12),
      rx: rng.range(-0.2, 0.2), color: rng.chance(0.4) ? rng.pick(SOOT) : rng.pick(MARBLE), mat: M.smooth,
    });
  }
  b.pop();
}

/** A scatter of broken stone (rubble pile). */
function rubble(b, rng, x, z, n, rad) {
  const gy = h(x, z);
  for (let i = 0; i < n; i++) {
    const a = rng.range(0, Math.PI * 2), rr = rng.range(0, rad);
    const px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr;
    const s = rng.range(0.1, 0.27);
    b.geo(new THREE.IcosahedronGeometry(1, 0), {
      x: px, y: gy + s * 0.65, z: pz, sx: s, sy: s * 0.7, sz: s,
      color: rng.chance(0.35) ? rng.pick(SOOT) : rng.pick(RUIN),
      mat: M.flat, ry: rng.range(0, 6),
    });
  }
}

/** A ruined watch-tower: a broken drum with jagged stones on top. */
function brokenTower(b, rng, x, z, r, H) {
  const gy = h(x, z);
  b.cyl(r, r * 1.06, H * 0.62, { x, y: gy, z, seg: 10, color: rng.pick(RUIN), mat: M.stone });
  b.cyl(r * 0.9, r * 0.98, H * 0.18, { x: x + rng.range(-0.08, 0.08), y: gy + H * 0.62, z: z + rng.range(-0.08, 0.08), seg: 10, color: rng.pick(RUIN), mat: M.stone });
  for (let i = 0; i < 4; i++) {
    b.box(rng.range(0.3, 0.62), rng.range(0.12, 0.42), rng.range(0.3, 0.62), {
      x: x + rng.range(-0.3, 0.3), y: gy + H * 0.8 + rng.range(0, 0.22), z: z + rng.range(-0.3, 0.3),
      rx: rng.range(-0.16, 0.16), ry: rng.range(-0.2, 0.2),
      color: rng.chance(0.4) ? rng.pick(SOOT) : rng.pick(RUIN), mat: M.stone,
    });
  }
  const a = rng.range(0, Math.PI * 2);
  b.quad(0.09, 0.34, { x: x + Math.cos(a) * (r + 0.015), y: gy + H * 0.3, z: z + Math.sin(a) * (r + 0.015), ry: Math.PI / 2 - a, mat: M.smooth, color: rng.pick(SOOT) });
}

/** Reeds at the water's edge. */
function reeds(b, rng, x, z, n) {
  const gy = h(x, z);
  for (let i = 0; i < n; i++) {
    const a = rng.range(0, Math.PI * 2), rr = rng.range(0, 0.22);
    const px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr;
    const py = Math.max(0.12, h(px, pz));
    const rh = rng.range(0.3, 0.58);
    b.cyl(0.012, 0.016, rh, { x: px, y: py - 0.02, z: pz, rx: rng.range(-0.12, 0.12), ry: rng.range(0, 3), seg: 5, color: rng.pick(['#4c5a3a', '#56663f', '#45522f']), mat: M.flat });
    if (rng.chance(0.5)) b.sphere(0.02, { x: px, y: py + rh - 0.03, z: pz, seg: 5, color: rng.pick(['#6b7a4e', '#5a6a40']), mat: M.flat });
  }
}

/** A broken boat, listing and half-sunk at the bank. */
function brokenBoat(b, rng, x, z) {
  const gy = Math.max(0.4, h(x, z));
  b.push({ x, y: gy, z, ry: 0.6, rx: 0.42 });
  const g = new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  b.geo(g, { y: 0.14, sx: 1.35, sy: 0.5, sz: 0.6, color: '#5c4a32', mat: M.wood });
  b.pop();
  // broken mast stub with a jagged end
  b.cyl(0.03, 0.045, 1.0, { x: x + 0.42, y: gy + 0.12, z: z + 0.18, rx: 0.45, ry: 0.8, color: '#3c2d1e', mat: M.wood, seg: 5 });
  b.box(0.09, 0.3, 0.09, { x: x + 0.62, y: gy + 0.85, z: z + 0.3, rx: 0.35, color: '#2e2216', mat: M.wood });
  // a snapped plank drifting at the waterline
  b.box(0.55, 0.05, 0.2, { x: x - 0.9, y: WATER_Y + 0.03, z: z - 0.5, ry: 0.5, color: '#5c4a32', mat: M.wood });
}

/** A street of broken paving stones. */
function rubblePath(b, rng, pts) {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], c = pts[i + 1];
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2;
    b.box(len + 0.1, 0.06, 0.5, {
      x: mx, y: h(mx, mz) + 0.03, z: mz,
      ry: Math.atan2(c[1] - a[1], c[0] - a[0]),
      color: rng.pick(['#7d7468', '#8a8175', '#71695e']), mat: M.stone,
    });
  }
}

/* ------------------------------------------------------ the bridge -- */

/** One half of the great bridge: rises from its bank and breaks over the river. */
function bridgeHalf(b, rng, side) {
  const z0 = side * 2.9, z1 = side * 0.5;   // bank end → broken end over the water
  const w = 1.15;
  const gy0 = h(BRIDGE_X, z0) + 0.34;       // deck height at the bank
  const rise = 1.35;                        // the old arch's rise
  const N = 7;
  // foundation block where the deck meets the bank
  b.box(w + 0.35, 0.34, 1.0, { x: BRIDGE_X, y: gy0 - 0.34, z: z0, color: rng.pick(RUIN), mat: M.stone });
  // deck segments rising in a quarter arc toward the broken end
  for (let i = 0; i < N; i++) {
    const t = i / N, t2 = (i + 1) / N;
    const zA = z0 + (z1 - z0) * t, zB = z0 + (z1 - z0) * t2;
    const yA = gy0 + rise * Math.sin((Math.PI / 2) * t);
    const len = Math.abs(zB - zA) + 0.02;
    const col = rng.pick(RUIN);
    b.box(w, 0.16, len, { x: BRIDGE_X, y: yA, z: (zA + zB) / 2, color: col, mat: M.stone });
    b.box(w * 0.72, 0.06, len, { x: BRIDGE_X, y: yA + 0.16, z: (zA + zB) / 2, color: '#8a8175', mat: M.stone }); // worn road surface
    for (const s of [-1, 1]) {
      b.box(0.09, 0.3, len, { x: BRIDGE_X + s * (w / 2 + 0.035), y: yA + 0.16, z: (zA + zB) / 2, color: col, mat: M.stone });
    }
  }
  // stone piers under the deck (grounded on the bank)
  for (const zp of [2.35, 1.45]) {
    const zpz = side * zp;
    const t = (z0 - zpz) / (z0 - z1);
    const dy = gy0 + rise * Math.sin((Math.PI / 2) * t);
    const gy = h(BRIDGE_X, zpz);
    if (dy > gy + 0.12) b.box(0.62, dy - gy, 0.62, { x: BRIDGE_X, y: gy, z: zpz, color: rng.pick(RUIN), mat: M.stone });
  }
  // blind arcades on both side faces — the memory of the great arches
  for (const k of [0.32, 0.62]) {
    const zk = z0 + (z1 - z0) * k;
    const yk = gy0 + rise * Math.sin((Math.PI / 2) * k);
    for (const s of [-1, 1]) {
      const xf = BRIDGE_X + s * (w / 2 + 0.03);
      b.quad(0.5, 0.55, { x: xf, y: yk - 0.04, z: zk, ry: s * Math.PI / 2, mat: M.smooth, color: DARK });
      b.geo(new THREE.TorusGeometry(0.25, 0.08, 5, 10, Math.PI), { x: xf + s * 0.01, y: yk + 0.24, z: zk, ry: s * Math.PI / 2, mat: M.smooth, color: DARK });
    }
  }
  // the jagged broken edge at the gap
  const endY = gy0 + rise;
  for (let i = 0; i < 6; i++) {
    b.box(rng.range(0.2, 0.55), rng.range(0.12, 0.6), rng.range(0.16, 0.45), {
      x: BRIDGE_X + rng.range(-0.5, 0.5), y: endY + rng.range(-0.05, 0.42), z: z1 - side * rng.range(0.0, 0.5),
      ry: rng.range(-0.3, 0.3), rx: rng.range(-0.12, 0.12),
      color: rng.chance(0.3) ? rng.pick(SOOT) : rng.pick(RUIN), mat: M.stone,
    });
  }
  // a stone fragment hanging from the broken lip
  b.box(0.5, 0.5, 0.3, { x: BRIDGE_X + rng.range(-0.3, 0.3), y: endY - 0.55, z: z1 + side * 0.12, rx: rng.range(0.3, 0.7), color: rng.pick(RUIN), mat: M.stone });
}

/* ------------------------------------------------------------- build -- */

export default function build({ rng, city, accent }) {
  const b = new Builder();
  const object = new THREE.Group();

  /* ------------------------------ terrain ------------------------------ */
  terrainDisc(b, { r: 10.5, rings: 56, segs: 96, height: h, colorAt, mat: M.stone, seed: 31 });

  /* --------------------------- the Anduin ------------------------------ */
  // the great river: a dark water band running along x, inside the carved channel
  b.box(20.2, 0.06, 2.0, { x: 0, y: WATER_Y - 0.03, z: 0, color: '#2f4a52', mat: M.water });

  /* --------------------------- the bridge ------------------------------ */
  bridgeHalf(b, rng, 1);
  bridgeHalf(b, rng, -1);
  // stones fallen into the water beneath the gap
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      b.box(rng.range(0.14, 0.32), rng.range(0.1, 0.22), rng.range(0.14, 0.3), {
        x: BRIDGE_X + rng.range(-0.6, 0.6), y: WATER_Y + rng.range(-0.1, 0.16), z: side * rng.range(0.4, 0.85),
        ry: rng.range(0, 3), color: rng.chance(0.35) ? rng.pick(SOOT) : rng.pick(RUIN), mat: M.stone,
      });
    }
  }
  // the broken pier that once stood mid-river — a stub in the gap
  b.box(0.7, 0.62, 0.7, { x: BRIDGE_X, y: 0.28, z: 0, color: rng.pick(RUIN), mat: M.stone });
  b.box(0.34, 0.3, 0.34, { x: BRIDGE_X + 0.14, y: 0.86, z: 0.06, rx: 0.3, color: rng.pick(SOOT), mat: M.stone });
  b.box(0.3, 0.24, 0.3, { x: BRIDGE_X - 0.12, y: 0.82, z: -0.08, rx: -0.2, color: rng.pick(RUIN), mat: M.stone });

  /* ---------------------- north bank (near side) ----------------------- */
  brokenTower(b, rng, -4.7, 3.6, 0.55, 6.2);            // the watch-tower (fire on top)
  brokenWall(b, rng, -2.3, 3.0, -0.35, 2.6, 1.15, 2.7); // ruined hall
  standingArch(b, rng, -1.5, 3.15, -0.5, 1.7, 2.3, true);   // broken lintel
  brokenColumn(b, rng, -0.6, 3.0, 0.3, 0.16, 1.6);
  standingArch(b, rng, 0.3, 3.4, 0.6, 2.2, 2.4, false);     // the great standing arch
  fallenColumn(b, rng, 1.0, 3.6, 1.0, 1.7, 0.14);
  fallenColumn(b, rng, 1.5, 3.3, -0.5, 1.4, 0.12);
  rubble(b, rng, 0.7, 4.1, 8, 0.7);
  brokenWall(b, rng, 3.6, 4.2, 0.6, 2.0, 1.0, 2.3);
  brokenWall(b, rng, 5.0, 3.9, -0.2, 1.5, 0.9, 1.9);
  fallenColumn(b, rng, 4.4, 4.4, 0.2, 1.3, 0.12);
  rubble(b, rng, 4.9, 4.7, 7, 0.6);
  brokenWall(b, rng, 6.3, 3.9, 0.15, 1.5, 0.9, 1.8);
  rubble(b, rng, 6.5, 4.5, 6, 0.5);
  // far ruins for depth
  brokenWall(b, rng, -0.8, 6.7, 0.3, 1.6, 0.8, 1.7);
  rubble(b, rng, 0.6, 6.9, 5, 0.5);
  brokenWall(b, rng, 2.2, 6.5, -0.2, 1.3, 0.8, 1.5);
  // the rubble street from the bridge into the ruins
  rubblePath(b, rng, [[BRIDGE_X, 2.9], [0.2, 3.3], [1.7, 3.6], [3.2, 3.7]]);

  /* ---------------------- south bank (far side) ------------------------ */
  // the Dome of the Stars: one surviving great dome, a little damaged
  const DX = 2.6, DZ = -3.3;
  const dgy = h(DX, DZ);
  b.cyl(1.62, 1.72, 1.15, { x: DX, y: dgy, z: DZ, seg: 28, color: rng.pick(MARBLE), mat: M.smooth });
  b.dome(1.7, { x: DX, y: dgy + 1.15, z: DZ, seg: 26, hseg: 12, color: rng.pick(MARBLE), mat: M.smooth });
  // accent ring around the drum (a subtle Gondor touch)
  b.torus(1.66, 0.05, { x: DX, y: dgy + 0.62, z: DZ, ry: Math.PI / 2, color: accent, mat: M.smooth, rseg: 6, tseg: 24 });
  // scorch scar on the drum facing the river + a darkened doorway
  b.quad(0.5, 0.8, { x: DX, y: dgy + 0.95, z: DZ + 1.64, mat: M.smooth, color: '#2e2a28' });
  b.quad(0.55, 0.95, { x: DX, y: dgy + 0.45, z: DZ + 1.63, mat: M.smooth, color: DARK });
  // a damaged patch on the dome itself
  {
    const a = 0.9, e = 0.55;
    const px = DX + Math.cos(a) * Math.cos(e) * 1.7, py = dgy + 1.15 + Math.sin(e) * 1.7, pz = DZ + Math.sin(a) * Math.cos(e) * 1.7;
    b.box(0.3, 0.24, 0.3, { x: px + Math.cos(a) * Math.cos(e) * 0.12, y: py + Math.sin(e) * 0.12, z: pz + Math.sin(a) * Math.cos(e) * 0.12, rx: 0.3, ry: 0.5, color: rng.pick(SOOT), mat: M.smooth });
  }
  // fallen tiles at the drum's foot
  for (let i = 0; i < 4; i++) {
    const aa = rng.range(0, Math.PI * 2), rr = rng.range(1.6, 2.3);
    const tx = DX + Math.cos(aa) * rr, tz = DZ + Math.sin(aa) * rr;
    b.box(rng.range(0.18, 0.34), rng.range(0.06, 0.12), rng.range(0.18, 0.34), {
      x: tx, y: h(tx, tz) + 0.03, z: tz, ry: rng.range(0, 3), color: rng.pick(MARBLE), mat: M.smooth,
    });
  }
  // the palantír glint at the apex of the Dome of the Stars
  b.geo(new THREE.SphereGeometry(0.07, 10, 8), { x: DX, y: dgy + 1.15 + 1.7 + 0.08, z: DZ, mat: M.glow, color: '#e8f2ff', glow: 1.25 });
  // south-bank ruins
  brokenWall(b, rng, -4.6, -3.6, 0.2, 2.2, 1.0, 2.4);
  standingArch(b, rng, -5.2, -3.75, 0.15, 2.0, 2.3, false);
  brokenColumn(b, rng, -3.7, -3.9, -0.4, 0.15, 1.8);
  fallenColumn(b, rng, -4.0, -3.1, 1.3, 1.6, 0.14);
  rubble(b, rng, -5.1, -3.2, 8, 0.7);
  brokenTower(b, rng, -2.2, -4.3, 0.5, 5.4);
  brokenWall(b, rng, 0.0, -4.6, -0.3, 2.4, 1.1, 2.6);
  standingArch(b, rng, 0.9, -4.65, 0.4, 1.6, 2.1, true);
  fallenColumn(b, rng, -0.7, -5.1, 0.6, 1.5, 0.13);
  rubble(b, rng, -0.2, -5.2, 6, 0.6);
  brokenWall(b, rng, 5.4, -3.9, -0.2, 1.8, 0.95, 2.2);
  standingArch(b, rng, 4.6, -4.2, -0.3, 1.7, 2.2, true);
  brokenColumn(b, rng, 6.3, -4.4, 0.5, 0.14, 1.5);
  rubble(b, rng, 5.6, -4.6, 7, 0.6);
  // far ruins
  brokenWall(b, rng, -1.5, -6.8, 0.25, 1.4, 0.8, 1.6);
  rubble(b, rng, -0.5, -7.0, 5, 0.5);
  brokenWall(b, rng, 3.8, -6.6, -0.15, 1.5, 0.8, 1.7);
  rubble(b, rng, 4.6, -6.8, 5, 0.5);
  // the rubble street from the bridge toward the dome
  rubblePath(b, rng, [[BRIDGE_X, -2.9], [0.5, -3.1], [1.8, -3.2], [2.6, -3.35]]);

  /* --------------------- water's edge details -------------------------- */
  for (const [rx, rz, n] of [[-3.9, 1.18, 4], [-2.1, -1.22, 3], [0.5, 1.15, 4], [3.1, -1.18, 3],
    [5.2, 1.2, 3], [7.05, -1.05, 4], [1.3, -1.25, 3], [4.4, 1.1, 3]]) {
    reeds(b, rng, rx, rz, n);
  }
  brokenBoat(b, rng, 6.9, -1.3);

  /* ------------------------ banners (animated) ------------------------- */
  const banners = [];
  const addBanner = (x, z, poleH, w, hh, phase) => {
    b.cyl(0.022, 0.028, poleH, { x, y: h(x, z), z, color: '#4a4238', mat: M.stone, seg: 5 });
    b.sphere(0.035, { x, y: h(x, z) + poleH + 0.03, z, mat: M.metal, color: C.gold, seg: 6 });
    const pivot = new THREE.Group();
    pivot.position.set(x, h(x, z) + poleH - 0.08, z);
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(w, hh),
      new THREE.MeshStandardMaterial({ color: accent, roughness: 0.95, metalness: 0, side: THREE.DoubleSide }));
    cloth.position.set(0.14, -hh / 2, 0);
    pivot.add(cloth);
    object.add(pivot);
    banners.push({ pivot, phase });
  };
  addBanner(-0.35, 3.0, 3.3, 0.5, 0.4, 0.0);   // north bank, by the bridge
  addBanner(0.9, -2.6, 3.2, 0.5, 0.4, 1.7);    // south bank, by the dome road

  /* ------------------------- soldiers (patrol) ------------------------- */
  // 4 standing guards (merged into the static build)
  figure(b, { x: -2.9, y: h(-2.9, 2.5) + 0.02, z: 2.5, h: 0.36, color: rng.pick(['#8f939b', '#7a7f88', '#a3a7ae']), ry: 1.0 });
  figure(b, { x: -1.6, y: h(-1.6, 3.35) + 0.02, z: 3.35, h: 0.36, color: rng.pick(['#8f939b', '#7a7f88', '#a3a7ae']), ry: -1.4 });
  figure(b, { x: 1.5, y: h(1.5, -2.7) + 0.02, z: -2.7, h: 0.36, color: rng.pick(['#8f939b', '#7a7f88', '#a3a7ae']), ry: 0.8 });
  figure(b, { x: 3.5, y: h(3.5, -2.6) + 0.02, z: -2.6, h: 0.36, color: rng.pick(['#8f939b', '#7a7f88', '#a3a7ae']), ry: -0.6 });
  // 2 patrolling guards (instanced, animated)
  const patrolGeo = mergeGeometries([
    new THREE.CylinderGeometry(0.026, 0.058, 0.225, 7).translate(0, 0.112, 0),
    new THREE.SphereGeometry(0.043, 8, 6).translate(0, 0.272, 0),
  ], false);
  const patrols = new THREE.InstancedMesh(patrolGeo, new THREE.MeshStandardMaterial({ color: '#8f939b', roughness: 0.85 }), 2);
  patrols.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  patrols.setColorAt(0, new THREE.Color('#8f939b'));
  patrols.setColorAt(1, new THREE.Color('#7a7f88'));
  object.add(patrols);
  const PATHS = [
    { x: -2.3, z0: 2.35, z1: 3.45, ph: 0.0, spd: 0.30 },   // north bank patrol
    { x: 2.6, z0: -1.9, z1: -3.15, ph: 2.1, spd: 0.26 },   // south bank patrol
  ];
  const placePatrols = (t) => {
    for (let i = 0; i < 2; i++) {
      const p = PATHS[i];
      const k = (Math.sin(t * p.spd + p.ph) + 1) / 2;
      const z = p.z0 + (p.z1 - p.z0) * k;
      setInst(patrols, i, p.x, h(p.x, z) + 0.02, z, 1, 0);
    }
    patrols.instanceMatrix.needsUpdate = true;
  };

  /* ------------------------------- birds ------------------------------- */
  const gBody = new THREE.ConeGeometry(0.035, 0.18, 5);
  gBody.rotateZ(-Math.PI / 2);
  gBody.translate(0.06, 0, 0);
  const gWing = new THREE.BoxGeometry(0.22, 0.008, 0.07);
  const gWingL = gWing.clone(); gWingL.translate(0, 0.045, 0.05);
  const gWingR = gWing.clone(); gWingR.translate(0, 0.045, -0.05);
  const birdGeo = mergeGeometries([gBody, gWingL, gWingR], false);
  const birds = new THREE.InstancedMesh(birdGeo, new THREE.MeshStandardMaterial({ color: '#e7e7e2', roughness: 0.55 }), 3);
  birds.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  object.add(birds);
  const BIRDS = [
    { R: 3.6, y: 7.6, spd: 0.18, ph: 0.0, s: 1.1 },
    { R: 4.3, y: 8.1, spd: 0.14, ph: 2.4, s: 0.9 },
    { R: 3.1, y: 7.9, spd: 0.22, ph: 4.4, s: 1.0 },
  ];
  const BC = [0.5, 0, 0];
  const placeBirds = (t) => {
    for (let i = 0; i < 3; i++) {
      const p = BIRDS[i];
      const a = t * p.spd + p.ph;
      setInst(birds, i, BC[0] + Math.cos(a) * p.R, p.y + 0.16 * Math.sin(t * 0.9 + p.ph), BC[2] + Math.sin(a) * p.R, p.s, a + Math.PI / 2, 0.18 * Math.sin(t * 1.15 + p.ph));
    }
    birds.instanceMatrix.needsUpdate = true;
  };

  /* ---------------------------- static build --------------------------- */
  object.add(b.build());
  placePatrols(0);
  placeBirds(0);

  /* ------------------------ the watch-fire ----------------------------- */
  const FT = [-4.7, 3.6];
  const fireY = h(FT[0], FT[1]) + 6.2 * 0.9;
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.3, 7),
    new THREE.MeshStandardMaterial({ color: '#ffb45e', roughness: 0.5, emissive: '#c25a1e', emissiveIntensity: 1.1 }));
  flame.position.set(FT[0], fireY + 0.18, FT[1]);
  const flameGlow = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), glowMat('#ff9a3c', 2.0, { transparent: true }));
  flameGlow.position.set(FT[0], fireY + 0.15, FT[1]);
  object.add(flame, flameGlow);

  /* --------------------------- river shimmer --------------------------- */
  const shimmer = new THREE.Mesh(new THREE.PlaneGeometry(20.0, 1.9), new THREE.MeshBasicMaterial({
    color: '#9fc3d0', transparent: true, opacity: 0.13, blending: THREE.AdditiveBlending,
    depthWrite: false, toneMapped: false,
  }));
  shimmer.rotation.x = -Math.PI / 2;
  shimmer.position.set(0, WATER_Y + 0.07, 0);
  object.add(shimmer);

  /* ------------------------------ update ------------------------------- */
  function update(t, dt) {
    // the banners sway on their poles
    for (const bb of banners) {
      bb.pivot.rotation.y = Math.sin(t * 1.15 + bb.phase) * 0.13;
      bb.pivot.rotation.x = Math.sin(t * 1.45 + bb.phase * 1.3) * 0.03;
    }
    // the watch-fire flickers
    flame.scale.set(1 + 0.1 * Math.sin(t * 2.1), 1 + 0.14 * Math.sin(t * 1.6 + 0.8), 1);
    flameGlow.material.opacity = 0.7 + 0.3 * Math.sin(t * 1.5);
    flameGlow.scale.setScalar(0.85 + 0.2 * Math.sin(t * 1.9));
    // the river shimmers
    shimmer.material.opacity = 0.09 + 0.05 * Math.sin(t * 1.25);
    shimmer.position.x = Math.sin(t * 0.22) * 0.6;
    // the guards patrol, the birds wheel over the river
    placePatrols(t);
    placeBirds(t);
  }

  return { object, update };
}
