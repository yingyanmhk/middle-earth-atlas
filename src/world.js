// The stage: sky dome, the parchment map of Middle-earth, plinths, layouts,
// the luminous road of the Ring, and the One Ring at the heart of the Road.
import * as THREE from 'three';
import { CITIES, CATEGORIES, CAT, CHAPTER_SIZES_ARR } from './data.js';

export const SPACING = 30;
export const PLINTH_R = 11;
export const PLINTH_H = 1.1;

/* Map floor geometry (world units). The painted map covers exactly this box. */
export const MAP = { x0: -150, x1: 135, z0: -85, z1: 95, W: 285, H: 180 };

/* -------------------------------------------------------------- SKY -- */

export function makeSky() {
  const uniforms = {
    uTime: { value: 0 },
    uZenith: { value: new THREE.Color('#0b1030') },
    uMid: { value: new THREE.Color('#3d3056') },
    uHorizon: { value: new THREE.Color('#e3a06e') },
    uSunDir: { value: new THREE.Vector3(-0.6, 0.12, -0.7).normalize() },
    uSunColor: { value: new THREE.Color('#ffcf9a') },
    uStars: { value: 1.0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * p;
        gl_Position.z = gl_Position.w; // at infinity
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uStars;
      uniform vec3 uZenith, uMid, uHorizon, uSunDir, uSunColor;
      varying vec3 vDir;
      float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      float noise(vec3 x) {
        vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
      }
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = mix(uHorizon, uMid, smoothstep(-0.02, 0.22, h));
        col = mix(col, uZenith, smoothstep(0.18, 0.75, h));
        col = mix(col, uHorizon * 0.55, smoothstep(0.0, -0.25, h));
        float s = max(dot(d, uSunDir), 0.0);
        col += uSunColor * (pow(s, 6.0) * 0.35 + pow(s, 64.0) * 0.8 + pow(s, 900.0) * 6.0);
        float n = noise(d * 3.0 + vec3(uTime * 0.004, 0.0, 0.0)) * 0.6 + noise(d * 7.0) * 0.4;
        col += vec3(0.55, 0.35, 0.6) * smoothstep(0.55, 0.9, n) * 0.08 * smoothstep(0.05, 0.4, h);
        vec3 sd = d * 420.0;
        vec3 cell = floor(sd);
        float r = hash(cell);
        if (r > 0.9965) {
          vec3 c = cell + 0.5 + (vec3(hash(cell + 3.1), hash(cell + 7.7), hash(cell + 1.3)) - 0.5) * 0.6;
          float dd = length(sd - c);
          float tw = 0.65 + 0.35 * sin(uTime * (1.0 + r * 40.0) + r * 100.0);
          float star = smoothstep(0.42, 0.0, dd) * tw * (r - 0.9965) / 0.0035;
          col += vec3(1.0, 0.92, 0.85) * star * 1.6 * smoothstep(0.04, 0.35, h) * uStars;
        }
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(5000, 48, 24), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  return { mesh, uniforms };
}

/* -------------------------------------------------- THE PARCHMENT MAP -- */

// The classic Tolkien map look, painted on a canvas: parchment, sea, ink
// coast, rivers, mountain triangles, forests, region labels, compass rose.

function paintMap(cv) {
  const { x0, z0, x1, z1, W, H } = MAP;
  const S = cv.width / W; // px per world unit
  const px = (x) => (x - x0) * S;
  const pz = (z) => (z - z0) * S;
  const g = cv.getContext('2d');
  const rnd = (a, b) => a + Math.random() * (b - a);
  const INK = '#5a4a35';
  const INK2 = '#4a3c2a';

  /* ---- parchment ---- */
  g.fillStyle = '#e6dab8';
  g.fillRect(0, 0, cv.width, cv.height);
  // soft vertical shading (darker at the bottom edge, like an aged sheet)
  const grad = g.createLinearGradient(0, 0, 0, cv.height);
  grad.addColorStop(0, 'rgba(120,95,60,0.10)');
  grad.addColorStop(0.45, 'rgba(120,95,60,0)');
  grad.addColorStop(1, 'rgba(110,85,55,0.22)');
  g.fillStyle = grad;
  g.fillRect(0, 0, cv.width, cv.height);
  // mottling
  for (let i = 0; i < 1600; i++) {
    const x = Math.random() * cv.width, y = Math.random() * cv.height;
    const r = rnd(2, 26);
    g.fillStyle = Math.random() < 0.5 ? `rgba(110,90,60,${rnd(0.015, 0.05)})` : `rgba(240,225,190,${rnd(0.02, 0.06)})`;
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  // a few large stains
  for (let i = 0; i < 7; i++) {
    const x = Math.random() * cv.width, y = Math.random() * cv.height, r = rnd(60, 160);
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, 'rgba(130,105,70,0.10)');
    rg.addColorStop(1, 'rgba(130,105,70,0)');
    g.fillStyle = rg;
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }

  /* ---- sea ---- */
  const coast = [[-85, -118], [-60, -112], [-30, -108], [0, -104], [30, -100], [60, -94], [80, -90], [95, -86]];
  const seaPath = new Path2D();
  seaPath.moveTo(px(x0), pz(z0));
  seaPath.lineTo(px(coast[0][1]), pz(coast[0][0]));
  for (const [z, x] of coast) seaPath.lineTo(px(x), pz(z));
  // south bay, up to the Anduin delta
  seaPath.lineTo(px(14), pz(95));
  seaPath.lineTo(px(4), pz(88));
  seaPath.lineTo(px(2), pz(84));
  seaPath.lineTo(px(0), pz(80));
  seaPath.lineTo(px(-4), pz(84));
  seaPath.lineTo(px(-10), pz(88));
  seaPath.lineTo(px(-30), pz(92));
  seaPath.lineTo(px(-60), pz(95));
  seaPath.lineTo(px(x0), pz(z1));
  seaPath.closePath();
  g.fillStyle = '#b9c7cd';
  g.fill(seaPath);
  // sea shading toward the coast
  g.save();
  g.clip(seaPath);
  for (let i = 0; i < 300; i++) {
    const x = rnd(0, cv.width * 0.42), y = rnd(0, cv.height);
    g.strokeStyle = `rgba(120,145,155,${rnd(0.05, 0.16)})`;
    g.lineWidth = rnd(1, 2.5);
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + rnd(6, 16), y + rnd(-3, 3), x + rnd(14, 26), y);
    g.stroke();
  }
  g.restore();
  // ink coast line (double line)
  g.strokeStyle = INK;
  g.lineWidth = 3;
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(px(coast[0][1]), pz(coast[0][0]));
  for (const [z, x] of coast) g.lineTo(px(x), pz(z));
  g.stroke();
  g.strokeStyle = 'rgba(90,74,53,0.4)';
  g.lineWidth = 9;
  g.stroke();

  /* ---- rivers ---- */
  function river(pts, w = 4.5) {
    const path = new Path2D();
    path.moveTo(px(pts[0][0]), pz(pts[0][1]));
    // smooth through points with quadratic curves
    for (let i = 1; i < pts.length - 1; i++) {
      const midx = (pts[i][0] + pts[i + 1][0]) / 2, midz = (pts[i][1] + pts[i + 1][1]) / 2;
      path.quadraticCurveTo(px(pts[i][0]), pz(pts[i][1]), px(midx), pz(midz));
    }
    path.lineTo(px(pts[pts.length - 1][0]), pz(pts[pts.length - 1][1]));
    g.strokeStyle = 'rgba(150,175,185,0.85)';
    g.lineWidth = w + 3;
    g.stroke(path);
    g.strokeStyle = '#4e7a8c';
    g.lineWidth = w;
    g.stroke(path);
  }
  river([[30, -58], [20, -46], [10, -34], [4, -22], [-2, -12], [-4, -2], [-4, 10], [0, 24], [4, 40], [6, 54], [8, 66], [8, 74], [6, 84]]); // Anduin
  river([[-62, -62], [-66, -50], [-62, -38], [-58, -28], [-55, -16], [-54, -4], [-58, 8], [-64, 22], [-72, 36], [-80, 52], [-86, 68], [-88, 80], [-84, 90]]); // Brandywine
  river([[-34, 28], [-26, 36], [-14, 44], [-6, 50], [-4, 56]]); // Entwash → Anduin
  river([[-18, -62], [-26, -54], [-36, -44], [-46, -34], [-56, -24], [-66, -14], [-74, -4], [-80, 6], [-84, 14]]); // Greyflood → sea
  // a couple of tributaries for texture
  river([[8, 62], [14, 68], [12, 72]], 2.5); // tributary near Osgiliath

  /* ---- mountains (Tolkien triangles) ---- */
  function range(spine, { side = 5.5, jitter = 0.6, gap = 7, fill = '#b7ab8f' } = {}) {
    let a0 = 0;
    for (let i = 0; i < spine.length - 1; i++) {
      const p0 = spine[i], p1 = spine[i + 1];
      const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      const n = Math.max(1, Math.round(len / gap));
      for (let j = 0; j < n; j++) {
        const t = (j + 0.5) / n;
        const x = p0[0] + (p1[0] - p0[0]) * t + rnd(-jitter, jitter);
        const z = p0[1] + (p1[1] - p0[1]) * t + rnd(-jitter, jitter);
        const s = side * rnd(0.75, 1.3);
        const rot = rnd(-0.12, 0.12);
        g.save();
        g.translate(px(x), pz(z));
        g.rotate(rot);
        g.beginPath();
        g.moveTo(-s / 2, s * 0.4);
        g.lineTo(0, -s * 0.62);
        g.lineTo(s / 2, s * 0.4);
        g.closePath();
        g.fillStyle = fill;
        g.fill();
        g.strokeStyle = INK2;
        g.lineWidth = 1.4;
        g.stroke();
        g.restore();
      }
    }
  }
  range([[-18, -62], [-24, -45], [-27, -31], [-33, -15], [-36, -2], [-42, 15], [-44, 30], [-47, 45], [-48, 58]], { side: 5.2 }); // Misty Mountains
  range([[-12, 60], [4, 72], [20, 76], [30, 82]], { side: 4.6 }); // White Mountains
  range([[68, 40], [60, 55], [52, 72], [58, 84]], { side: 4.6 }); // Ephel Dúath
  range([[70, 40], [90, 48], [110, 56]], { side: 4.6 }); // Ered Lithui
  range([[24, -72], [40, -64], [56, -56]], { side: 3.8 }); // Grey Mountains (far north)
  // the Lonely Mountain: a ring of peaks
  range([[86, -14], [90, -12], [92, -15], [86, -18], [82, -15], [84, -10], [86, -14]], { side: 4.4, gap: 4 }); // hmm — a closed loop
  // a few scattered crags
  for (const [x, z, s] of [[-104, -60, 3.4], [-98, -44, 3], [-66, -52, 3.4], [-2, -18, 3.2], [-14, 8, 3], [14, 8, 3]]) {
    g.save(); g.translate(px(x), pz(z)); g.rotate(rnd(-0.2, 0.2));
    g.beginPath(); g.moveTo(-s / 2, s * 0.4); g.lineTo(0, -s * 0.62); g.lineTo(s / 2, s * 0.4); g.closePath();
    g.fillStyle = '#b7ab8f'; g.fill(); g.strokeStyle = INK2; g.lineWidth = 1.3; g.stroke();
    g.restore();
  }

  /* ---- forests ---- */
  function forest(cx, cz, rx, ry, { color = '#6d8061', edge = '#4c5c43', density = 1, dot = false } = {}) {
    const n = Math.round(26 * rx * ry * density);
    for (let i = 0; i < n; i++) {
      // uniform-ish scatter inside ellipse
      let x, z, k = 0;
      do { const t = rnd(0, Math.PI * 2), r = Math.sqrt(Math.random()) * 1.15; x = cx + Math.cos(t) * r * rx; z = cz + Math.sin(t) * r * ry; k++; } while (k < 12 && Math.hypot((x - cx) / rx, (z - cz) / ry) > 1);
      const s = rnd(2.2, 3.6);
      g.strokeStyle = edge;
      g.lineWidth = 1.3;
      g.beginPath(); g.arc(px(x), pz(z), s, 0, 7); g.stroke();
      g.fillStyle = color;
      g.fill();
      if (dot) { g.fillStyle = edge; g.beginPath(); g.arc(px(x), pz(z), s * 0.28, 0, 7); g.fill(); }
    }
  }
  forest(28, -22, 26, 17, { density: 0.85, dot: true }); // Mirkwood
  forest(-56, -23, 9.5, 6.5, { dot: true }); // Old Forest
  forest(-34, 29, 11, 7.5, { dot: true }); // Fangorn
  forest(-7, -8, 5.5, 4.5, { color: '#b5a86a', edge: '#8d814f' }); // Lothlórien (mallorn gold)
  forest(60, -6, 6, 4.5, { density: 0.6 }); // a wood north of the lake

  /* ---- Mordor: a shaded, stippled dark land ---- */
  const mordor = new Path2D();
  const M = [[58, 38], [76, 42], [102, 52], [114, 60], [110, 70], [92, 84], [72, 86], [56, 80], [48, 72], [52, 55]];
  mordor.moveTo(px(M[0][0]), pz(M[0][1]));
  for (const [x, z] of M.slice(1)) mordor.lineTo(px(x), pz(z));
  mordor.closePath();
  g.fillStyle = 'rgba(96,82,66,0.30)';
  g.fill(mordor);
  g.strokeStyle = 'rgba(90,74,53,0.5)';
  g.lineWidth = 2;
  g.stroke(mordor);
  g.save();
  g.clip(mordor);
  for (let i = 0; i < 420; i++) {
    const x = rnd(px(50), px(116)), z = rnd(pz(36), pz(88));
    g.fillStyle = `rgba(80,68,54,${rnd(0.1, 0.3)})`;
    g.beginPath(); g.arc(x, z, rnd(1, 2.4), 0, 7); g.fill();
  }
  g.restore();
  // Orodruin: a little volcano mark
  {
    const x = px(92), z = pz(81);
    g.strokeStyle = '#6d4a3a'; g.lineWidth = 2;
    g.beginPath(); g.arc(x, z, 7, 0, 7); g.stroke();
    g.fillStyle = 'rgba(160,80,50,0.5)';
    g.beginPath(); g.arc(x, z, 3.4, 0, 7); g.fill();
  }

  /* ---- labels ---- */
  function label(txt, x, z, size, { rot = 0, color = INK, italic = true, weight = 600, alpha = 0.85 } = {}) {
    g.save();
    g.translate(px(x), pz(z));
    g.rotate(rot);
    g.font = `${italic ? 'italic ' : ''}${weight} ${size}px Georgia, 'Times New Roman', serif`;
    g.fillStyle = color;
    g.globalAlpha = alpha;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(txt, 0, 0);
    g.restore();
  }
  label('The Shire', -79, -55, 52, { rot: -0.06 });
  label('Eriador', -62, -2, 40, { rot: 0.1 });
  label('Misty Mountains', -36, -26, 36, { rot: 0.28, color: INK2 });
  label('Mirkwood', 30, -38, 46, { rot: -0.16, color: '#4c5c43' });
  label('The Lonely Mountain', 88, -27, 30, { color: INK2 });
  label('Rohan', -16, 58, 54, { rot: 0.04 });
  label('Gondor', 16, 46, 50, { rot: -0.05 });
  label('Mordor', 88, 58, 54, { rot: 0.18, color: '#6d5a4a' });
  label('White Mountains', 8, 66, 28, { rot: 0.62, color: INK2 });
  label('The Anduin', 18, -26, 28, { rot: 0.16, color: '#4e7a8c', alpha: 0.7 });
  label('The Sea', -126, -64, 44, { rot: -0.08, color: '#7d96a0', alpha: 0.8 });

  /* ---- compass rose ---- */
  {
    const x = px(104), z = pz(66), r = 40;
    g.save();
    g.translate(x, z);
    g.strokeStyle = INK; g.lineWidth = 2;
    g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke();
    g.beginPath(); g.arc(0, 0, r - 7, 0, 7); g.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const big = i % 2 === 0;
      const len = big ? r - 8 : r - 14;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(Math.cos(a) * len, Math.sin(a) * len);
      g.strokeStyle = i % 4 === 0 ? INK2 : INK;
      g.lineWidth = big ? 2.6 : 1.4;
      g.stroke();
    }
    g.fillStyle = INK2;
    g.font = 'italic 700 26px Georgia, serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('N', 0, -r - 14);
    g.restore();
  }

  /* ---- cartouche ---- */
  {
    const w = 320, h = 120, x = px(92), z = pz(-72);
    g.save();
    g.translate(x, z);
    g.fillStyle = '#efe3c4';
    g.strokeStyle = INK; g.lineWidth = 3;
    g.strokeRect(-w / 2, -h / 2, w, h);
    g.strokeStyle = 'rgba(90,74,53,0.6)'; g.lineWidth = 1.4;
    g.strokeRect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 16);
    g.fillStyle = INK2;
    g.textAlign = 'center';
    g.font = '600 40px Georgia, serif';
    g.fillText('MIDDLE-EARTH', 0, -14);
    g.font = 'italic 500 24px Georgia, serif';
    g.fillText('Third Age · the War of the Ring', 0, 26);
    // corner diamonds
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      g.fillStyle = INK;
      g.save();
      g.translate(sx * (w / 2 - 8), sz * (h / 2 - 8));
      g.rotate(Math.PI / 4);
      g.fillRect(-5, -5, 10, 10);
      g.restore();
    }
    g.restore();
  }

  /* ---- border ---- */
  g.strokeStyle = INK;
  g.lineWidth = 10;
  g.strokeRect(0, 0, cv.width, cv.height);
  g.strokeStyle = 'rgba(90,74,53,0.5)';
  g.lineWidth = 2;
  g.strokeRect(26, 26, cv.width - 52, cv.height - 52);
  g.lineWidth = 5;
  g.strokeRect(38, 38, cv.width - 76, cv.height - 76);
}

export function makeFloor() {
  const S = 4096;
  const cv = document.createElement('canvas');
  cv.width = S;
  cv.height = Math.round(S * (MAP.H / MAP.W)); // 285×180 → ~2587
  paintMap(cv);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, metalness: 0.0 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(MAP.W, MAP.H), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set((MAP.x0 + MAP.x1) / 2, 0, (MAP.z0 + MAP.z1) / 2);
  mesh.receiveShadow = true;
  return mesh;
}

/* ---------------------------------------------------------- PLINTHS -- */

const plinthStone = new THREE.MeshStandardMaterial({ color: '#3b3036', roughness: 0.6, metalness: 0.15 });
const plinthTop = new THREE.MeshStandardMaterial({ color: '#cbb894', roughness: 0.9 });
const plinthGeo = (() => {
  const pts = [
    [PLINTH_R + 0.6, 0], [PLINTH_R + 0.6, 0.18], [PLINTH_R + 0.25, 0.3], [PLINTH_R + 0.25, PLINTH_H - 0.25],
    [PLINTH_R + 0.45, PLINTH_H - 0.12], [PLINTH_R + 0.45, PLINTH_H], [0, PLINTH_H],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(pts, 96);
})();

export function makePlinth(city) {
  const cat = CAT[city.cat];
  const g = new THREE.Group();
  const body = new THREE.Mesh(plinthGeo, plinthStone);
  body.receiveShadow = true;
  body.castShadow = true;
  g.add(body);
  const top = new THREE.Mesh(new THREE.CircleGeometry(PLINTH_R + 0.3, 96), plinthTop);
  top.rotation.x = -Math.PI / 2;
  top.position.y = PLINTH_H + 0.005;
  top.receiveShadow = true;
  g.add(top);
  const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(cat.color).multiplyScalar(1.6), toneMapped: false, transparent: true, opacity: 0.85 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(PLINTH_R + 0.46, 0.05, 6, 160), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = PLINTH_H - 0.06;
  g.add(ring);
  // n small studs around the rim
  for (let i = 0; i < city.n; i++) {
    const a = Math.PI / 2 + (i - (city.n - 1) / 2) * 0.05;
    const stud = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), ringMat);
    stud.position.set(Math.cos(a) * (PLINTH_R + 0.3), 0.6, Math.sin(a) * (PLINTH_R + 0.3));
    g.add(stud);
  }
  const hit = new THREE.Mesh(new THREE.CylinderGeometry(PLINTH_R + 0.6, PLINTH_R + 0.6, 14, 16), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = 7;
  hit.userData.cityId = city.id;
  g.add(hit);
  return { group: g, ringMat, hit, baseColor: new THREE.Color(cat.color) };
}

/* ---------------------------------------------------------- LAYOUTS -- */

function spiralPositions() {
  const out = [];
  const gapR = SPACING * 1.05;
  const b = gapR / (2 * Math.PI);
  let theta = (SPACING * 2.2) / b;
  for (let i = 0; i < CITIES.length; i++) {
    const r = b * theta;
    out.push(new THREE.Vector3(Math.cos(theta) * r, 0, Math.sin(theta) * r));
    theta += (SPACING * 1.08) / r;
  }
  return out;
}

export const LAYOUTS = {
  map: {
    label: 'Map',
    hint: 'the lands of Middle-earth',
    positions: CITIES.map((c) => new THREE.Vector3(c.mapPos[0], 0, c.mapPos[1])),
    overview: { pos: [-40, 260, 330], target: [0, 0, 10] },
  },
  road: {
    label: 'The Road',
    hint: 'the road of the Ring, in order',
    positions: spiralPositions(),
    overview: { pos: [0, 260, 300], target: [0, 0, 0] },
  },
  chapters: {
    label: 'Chapters',
    hint: 'six books, and one old tale',
    positions: CITIES.map((c) => {
      const size = CHAPTER_SIZES_ARR[c.chapter];
      return new THREE.Vector3((c.inChapter - (size - 1) / 2) * SPACING, 0, (c.chapter - 3) * SPACING);
    }),
    overview: { pos: [0, 240, 250], target: [0, 0, 10] },
  },
  realms: {
    label: 'Realms',
    hint: 'by people and powers',
    positions: CITIES.map((c) => new THREE.Vector3((CAT[c.cat].index - 3.5) * SPACING, 0, (c.n - 2.5) * SPACING)),
    overview: { pos: [0, 240, 250], target: [0, 0, 10] },
  },
};

/* ------------------------------------------------------ THE ONE RING -- */

export function makeRing() {
  const g = new THREE.Group();
  // small stone disc
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(4.6, 5.2, 0.9, 32),
    new THREE.MeshStandardMaterial({ color: '#4a3d30', roughness: 0.7, metalness: 0.1 }),
  );
  disc.position.y = 0.45;
  disc.receiveShadow = true;
  g.add(disc);
  const topDisc = new THREE.Mesh(
    new THREE.CircleGeometry(4.4, 32),
    new THREE.MeshStandardMaterial({ color: '#8a7a5e', roughness: 0.85 }),
  );
  topDisc.rotation.x = -Math.PI / 2;
  topDisc.position.y = 0.91;
  g.add(topDisc);
  // the Ring: a gold torus lying flat, with an inner glow
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.1, 0.5, 16, 48),
    new THREE.MeshStandardMaterial({ color: '#d9a441', roughness: 0.25, metalness: 1.0, emissive: '#8a5a1a', emissiveIntensity: 0.55 }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 1.42;
  ring.castShadow = true;
  g.add(ring);
  const glowRing = new THREE.Mesh(
    new THREE.TorusGeometry(4.9, 0.06, 6, 64),
    new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc96b').multiplyScalar(2.2), toneMapped: false, transparent: true, opacity: 0.8 }),
  );
  glowRing.rotation.x = Math.PI / 2;
  glowRing.position.y = 0.6;
  g.add(glowRing);
  const hit = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 12, 16), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = 6;
  hit.userData.cityId = 'ring';
  g.add(hit);
  const light = new THREE.PointLight('#ffcf8a', 14, 30, 2);
  light.position.set(0, 5, 0);
  g.add(light);
  function update(t) {
    glowRing.material.opacity = 0.6 + 0.25 * Math.sin(t * 1.4);
    ring.material.emissiveIntensity = 0.45 + 0.25 * Math.sin(t * 1.1);
    light.intensity = 12 + 4 * Math.sin(t * 1.3);
  }
  return { group: g, hit, update };
}

/* ------------------------------------------------------ JOURNEY LINE -- */

export function makeThread() {
  const uniforms = {
    uTime: { value: 0 },
    uOpacity: { value: 1 },
    uColor: { value: new THREE.Color('#ffd28a') },
    uLen: { value: 1 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uOpacity, uLen;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        float across = 1.0 - abs(vUv.y - 0.5) * 2.0;
        float core = smoothstep(0.0, 0.6, across);
        float s = vUv.x * uLen;
        float pulse = pow(fract(s / 60.0 - uTime * 0.12), 12.0);
        float dash = 0.55 + 0.45 * smoothstep(0.3, 0.5, abs(fract(s / 2.0) - 0.5) * 2.0);
        float a = core * (0.28 * dash + pulse * 1.4) * uOpacity;
        gl_FragColor = vec4(uColor * (0.9 + pulse * 2.5), a);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;

  function update(points) {
    const pts = points.map((p) => new THREE.Vector3(p.x, 0.06, p.z));
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
    const N = pts.length * 24;
    const width = 0.9;
    const pos = new Float32Array((N + 1) * 2 * 3);
    const uv = new Float32Array((N + 1) * 2 * 2);
    const idx = [];
    const len = curve.getLength();
    const tmp = new THREE.Vector3(), tan = new THREE.Vector3(), side = new THREE.Vector3();
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      curve.getPointAt(t, tmp);
      curve.getTangentAt(t, tan);
      side.set(-tan.z, 0, tan.x).normalize().multiplyScalar(width / 2);
      pos.set([tmp.x + side.x, tmp.y, tmp.z + side.z, tmp.x - side.x, tmp.y, tmp.z - side.z], i * 6);
      uv.set([t, 0, t, 1], i * 4);
      if (i < N) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    mesh.geometry.dispose();
    mesh.geometry = g;
    uniforms.uLen.value = len;
  }
  return { mesh, uniforms, update };
}

/* ------------------------------------------------------------- DUST -- */

export function makeDust(count = 1400) {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 500;
    pos[i * 3 + 1] = Math.random() * 70;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 400;
    seed[i] = Math.random();
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const uniforms = { uTime: { value: 0 }, uCenter: { value: new THREE.Vector3() }, uPx: { value: 1 } };
  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float seed;
      uniform float uTime, uPx;
      uniform vec3 uCenter;
      varying float vA;
      void main() {
        vec3 p = position;
        p.x += sin(uTime * 0.05 + seed * 30.0) * 6.0 + uTime * 0.6;
        p.z += cos(uTime * 0.04 + seed * 20.0) * 6.0;
        p.y += sin(uTime * 0.3 + seed * 10.0) * 0.8;
        p.xz = uCenter.xz + mod(p.xz - uCenter.xz + 250.0, 500.0) - 250.0;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uPx * (1.0 + seed * 2.0) * (60.0 / -mv.z);
        vA = (0.35 + 0.65 * sin(uTime * (0.5 + seed) + seed * 40.0) * 0.5 + 0.5) * smoothstep(500.0, 40.0, -mv.z);
      }`,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vA * 0.5;
        gl_FragColor = vec4(1.0, 0.85, 0.6, a);
      }`,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  return { mesh: pts, uniforms };
}

export { CATEGORIES };
