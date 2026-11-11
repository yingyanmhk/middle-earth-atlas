// Quick audit of the rivendell build: budgets, bounds, y>=0, animation sanity.
import { THREE, rng, M } from '../src/kit.js';
import build from '../src/cities/rivendell.js';

const city = { id: 'rivendell', name: 'Rivendell', cat: 'elves' };
const res = build({ rng: rng('rivendell'), city, accent: '#9fc2d4' });
const { object, update } = res;

let tris = 0, draws = 0, meshes = 0, instTotal = 0;
let minY = Infinity, maxY = -Infinity, maxR = 0;
const box = new THREE.Box3();

object.updateMatrixWorld(true);
object.traverse((o) => {
  if (o.isMesh) {
    meshes++;
    draws++;
    if (o.isInstancedMesh) { draws += 0; instTotal += o.count; }
    const g = o.geometry;
    if (g.index) tris += g.index.count / 3;
    else tris += g.attributes.position.count / 3;
    g.computeBoundingBox();
    const b = g.boundingBox.clone().applyMatrix4(o.matrixWorld);
    box.union(b);
    minY = Math.min(minY, b.min.y);
    maxY = Math.max(maxY, b.max.y);
    const label = o.isInstancedMesh ? `inst[${o.count}]` : 'mesh';
    const mat = o.material === M.stone ? 'stone' : o.material === M.smooth ? 'smooth' : o.material === M.flat ? 'flat'
      : o.material === M.wood ? 'wood' : o.material === M.cloth ? 'cloth' : o.material === M.glow ? 'glow'
      : o.material === M.water ? 'water' : 'other';
    if (mat === 'flat' || mat === 'stone') {
      console.log(`  ${label.padEnd(10)} ${mat.padEnd(7)} bbox min=[${b.min.x.toFixed(2)},${b.min.y.toFixed(2)},${b.min.z.toFixed(2)}] max=[${b.max.x.toFixed(2)},${b.max.y.toFixed(2)},${b.max.z.toFixed(2)}]`);
      if (mat === 'flat') {
        // find extreme vertices to locate the mystery part
        const pos = o.geometry.attributes.position;
        let low = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
          if (y < low[1]) low = [x, y, z];
          if (x > hi[0]) hi = [x, y, z];
          if (z > hi[2]) hi = [x, y, z];
        }
        console.log(`    lowestY vertex: [${low.map(v => v.toFixed(2)).join(',')}]`);
        console.log(`    maxX vertex:    [${hi.map(v => v.toFixed(2)).join(',')}]`);
        console.log(`    maxZ vertex:    [${hi.map(v => v.toFixed(2)).join(',')}]`);
      }
    } else {
      console.log(`  ${label.padEnd(10)} ${mat.padEnd(7)} minY=${b.min.y.toFixed(3)} maxY=${b.max.y.toFixed(3)}`);
    }
    for (const c of [b.min, b.max]) {
      const r = Math.hypot(c.x, c.z);
      maxR = Math.max(maxR, r);
    }
  }
});

console.log('meshes(drawCalls):', draws, '| instanced items:', instTotal);
console.log('triangles:', Math.round(tris));
console.log('bbox minY:', minY.toFixed(3), 'maxY:', maxY.toFixed(3));
console.log('max radial extent (x,z):', maxR.toFixed(3));
console.log('object bounding box:', JSON.stringify({ min: box.min.toArray().map(v => +v.toFixed(2)), max: box.max.toArray().map(v => +v.toFixed(2)) }));

// animation sanity: run update for a few seconds, verify finite matrices
let bad = 0;
for (let t = 0; t < 12; t += 0.1) update(t, 0.1);
object.traverse((o) => {
  if (o.isInstancedMesh) {
    const m = new THREE.Matrix4();
    for (let i = 0; i < o.count; i++) {
      o.getMatrixAt(i, m);
      const e = m.elements;
      for (let k = 0; k < 16; k++) if (!Number.isFinite(e[k])) bad++;
    }
  }
});
console.log('non-finite instanced matrix elements after animation:', bad);
console.log(update ? 'update present: yes' : 'update present: NO');
