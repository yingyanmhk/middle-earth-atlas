// The frame story: the Red Book of Westmarch — the book in which the tale of
// the Ring was written. A red-leather book on a wooden lectern, with a candle
// and a quill. Click it to read the interludes of the atlas.
import { THREE, Builder, M, C, solid, glowMat } from './kit.js';

export function makePavilion(rng) {
  const root = new THREE.Group();
  const b = new Builder();

  /* ---- octagonal base of dark wood with brass corners ---- */
  b.prism(11, 11.8, 0.9, 8, { color: '#4d3426', mat: M.wood, ry: Math.PI / 8 });
  b.prism(10.4, 10.4, 0.14, 8, { y: 0.9, color: '#8a5d3d', mat: M.wood, ry: Math.PI / 8 });
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    b.sphere(0.3, { x: Math.cos(a) * 11.2, y: 0.55, z: Math.sin(a) * 11.2, color: C.gold, mat: M.metal, seg: 8 });
  }
  // a thin red rug under the lectern
  b.box(6.4, 0.03, 4.6, { y: 1.06, color: '#8c2f35', mat: M.cloth, rx: 0.02 });

  /* ---- the lectern: a sloped wooden stand ---- */
  const LX = 0, LY = 1.1, LZ = 0;
  b.push({ x: LX, y: LY, z: LZ });
  // legs (two crossed posts)
  b.box(0.5, 1.1, 0.5, { x: -1.3, y: 0, z: -1.2, color: '#3a2a1e', mat: M.wood });
  b.box(0.5, 1.1, 0.5, { x: 1.3, y: 0, z: -1.2, color: '#3a2a1e', mat: M.wood });
  b.box(0.5, 0.9, 0.5, { x: -1.3, y: 0, z: 1.1, color: '#3a2a1e', mat: M.wood });
  b.box(0.5, 0.9, 0.5, { x: 1.3, y: 0, z: 1.1, color: '#3a2a1e', mat: M.wood });
  // cross brace
  b.box(2.6, 0.16, 0.3, { x: 0, y: 0.42, z: -0.4, color: '#4d3426', mat: M.wood });
  // the sloped reading surface
  b.box(4.2, 0.14, 2.4, { x: 0, y: 1.28, z: -0.7, rx: 0.32, color: '#6b462c', mat: M.wood });
  // front edge board
  b.box(4.2, 0.3, 0.24, { x: 0, y: 1.1, z: 0.52, rx: 0.32, color: '#5a3a24', mat: M.wood });

  /* ---- the Red Book (open) ---- */
  // red leather cover, visible behind the pages
  b.box(4.3, 0.16, 2.9, { x: 0, y: 1.75, z: -0.35, rx: 0.0, color: '#7b2430', mat: M.smooth, ry: 0 });
  // the two pages: slightly curved, parchment
  const page = (sx, sz, rot) => {
    b.push({ x: sx, y: 1.86, z: sz, ry: rot });
    b.plane(2.1, 2.7, { y: 0.1, rx: 0.3, color: '#efe3c4', mat: M.cloth });
    // ink text lines (tiny bars) on the page
    for (let i = 0; i < 9; i++) {
      const w = rng.range(1.3, 1.9);
      b.box(w, 0.03, 0.05, { x: rng.range(-0.55, 0.55), y: 0.32 + i * 0.22, z: 0.42, color: '#4a3c2a', mat: M.smooth });
    }
    // a red bookmark ribbon
    b.box(0.1, 1.1, 0.02, { x: 0.9, y: 0.9, z: 0.5, rx: 0.3, color: '#a0342f', mat: M.cloth });
    b.pop();
  };
  page(-1.15, -0.65, -0.06);
  page(1.15, -0.65, 0.06);
  // the page gutter (spine shadow): a dark strip between pages
  b.box(0.18, 2.5, 0.06, { x: 0, y: 2.0, z: -0.62, rx: 0.32, color: '#3a2a1e', mat: M.wood });

  /* ---- candle at the left, quill at the right ---- */
  // candle: wax column on a brass holder, with a flame
  b.cyl(0.07, 0.09, 0.12, { x: -2.5, y: 1.1, z: 1.3, color: C.gold, mat: M.metal, seg: 8 });
  b.cyl(0.11, 0.11, 0.6, { x: -2.5, y: 1.22, z: 1.3, color: '#e8dcc0', mat: M.smooth, seg: 10 });
  b.cyl(0.055, 0.11, 0.09, { x: -2.5, y: 1.54, z: 1.3, color: '#e8dcc0', mat: M.smooth, seg: 8 }); // melted top
  // flame: a soft glowing teardrop
  const flame = glowMat('#ffd28a', 3.2);
  b.geo(new THREE.SphereGeometry(1, 10, 8), { x: -2.5, y: 1.75, z: 1.3, sx: 0.14, sy: 0.24, sz: 0.14, mat: flame, glow: 2.2 });
  b.geo(new THREE.SphereGeometry(1, 8, 6), { x: -2.5, y: 1.7, z: 1.3, sx: 0.08, sy: 0.14, sz: 0.08, mat: flame, glow: 3.2 });
  // quill: white feather + shaft, in a brass inkpot
  b.cyl(0.16, 0.2, 0.16, { x: 2.5, y: 1.12, z: 1.3, color: C.gold, mat: M.metal, seg: 8 });
  b.cyl(0.13, 0.14, 0.1, { x: 2.5, y: 1.2, z: 1.3, color: '#1c1c22', mat: M.smooth, seg: 8 }); // ink
  b.rod([2.5, 1.24, 1.3], [2.2, 1.85, 0.9], 0.035, { color: '#e8e2d4', mat: M.smooth });
  b.geo(new THREE.PlaneGeometry(0.62, 0.42), { x: 2.12, y: 1.95, z: 0.78, ry: 0.7, rx: -0.5, color: '#efe9da', mat: M.cloth });
  b.geo(new THREE.PlaneGeometry(0.5, 0.3), { x: 2.3, y: 1.9, z: 0.62, ry: 0.9, rx: -0.3, color: '#e2dcc8', mat: M.cloth });

  b.pop(); // lectern group

  /* ---- a small roll of parchment beside the base ---- */
  b.push({ y: 1.12 });
  b.cyl(0.24, 0.24, 0.7, { x: -6.2, y: 0.3, z: 4.6, rx: Math.PI / 2, color: '#e3d7b4', mat: M.cloth, seg: 12 });
  b.cyl(0.26, 0.26, 0.06, { x: -6.2, y: 0.3, z: 4.24, rx: Math.PI / 2, color: '#8a5d3d', mat: M.wood, seg: 10 });
  b.cyl(0.26, 0.26, 0.06, { x: -6.2, y: 0.3, z: 4.96, rx: Math.PI / 2, color: '#8a5d3d', mat: M.wood, seg: 10 });
  b.pop();

  const group = b.build();
  root.add(group);

  // candle light
  const light = new THREE.PointLight('#ffcf8a', 26, 16, 2);
  light.position.set(-2.5, 2.4, 1.3);
  root.add(light);
  // a gentle warm fill so the book glows from within
  const fill = new THREE.PointLight('#ffd9a0', 8, 14, 2);
  fill.position.set(0, 2.6, 0);
  root.add(fill);

  const flameMesh = flame; // (the glow material is shared by both flame geoms)
  function update(t) {
    light.intensity = 22 + Math.sin(t * 7.1) * 4 + Math.sin(t * 13.7) * 2;
    fill.intensity = 7 + Math.sin(t * 3.2) * 1.5;
    flame.color.setRGB(1.0, 0.82, 0.54).multiplyScalar(2.8 + Math.sin(t * 9.3) * 0.5);
  }
  return { object: root, update };
}
