# Brief for place builders — Middle-earth atlas

You are building procedural 3D dioramas for a three.js atlas of the places of J.R.R. Tolkien's
*The Lord of the Rings*. Project: `/Users/yin/Projects/llm/dsh/middle-earth-atlas` (Vite + three r186, pnpm).

## Ground rules
- The dev server is ALREADY running at http://127.0.0.1:5199 (hot reload). Do not start another, do not install packages.
- Only create/edit your own file: `src/cities/<id>.js` (and optional private helpers named `src/cities/_<yourprefix>_*.js`).
  Other agents work in parallel on other places and on the main app. Never edit `src/kit.js`, `src/main.js`, `src/world.js`, `src/data.js`.
  If kit.js has a bug or lacks something, work around it locally in your file and mention it in your report.
- Read first: `src/kit.js` (shared builder kit, incl. `terrainDisc`, `fbm`, `noise2`, `hash2` terrain helpers),
  `src/cities/_ab_util.js` (swayify, figure, setInst), `src/cities/_fallback.js` (minimal example),
  `src/data.js` (the text of your place — it is what the viewer reads next to your diorama).

## Contract
`src/cities/<id>.js`:
```js
import { THREE, Builder, M, C, terrainDisc, fbm, noise2 /* … */ } from '../kit.js';
export default function build({ rng, city, accent }) {
  const b = new Builder();
  // … static geometry into b …
  const object = new THREE.Group();
  object.add(b.build());
  // … animated meshes added to object …
  return { object, update(t, dt) { /* cheap per-frame animation */ } };
}
```
- `rng`: seeded RNG — `rng()`, `rng.range(a,b)`, `rng.int(a,b)`, `rng.pick(arr)`, `rng.chance(p)`, `rng.inDisc(R, minR)`, `rng.gauss()`, `rng.shuffle(arr)`.
  Use it instead of Math.random so the build is deterministic. Kit helpers take it as `r: rng` or `rand: rng`.
- `accent`: the realm colour (hex). Use it as a subtle unifying touch (banners, door trim, a glow), not the main colour.
- Coordinates: y = 0 is the top of a round stone plinth of radius 11. Keep the footprint within radius ~10.5.
  Typical height 3–14; strongly vertical places may go up to ~24. 1 unit ≈ one storey; a person ≈ 0.35 tall.
  Nothing can go below y = 0 — if the idea needs an underground, raise the ground on a block and cut it away.
- Static geometry goes through `Builder` (it merges into ~1 mesh per material → very few draw calls).
  Animated parts are separate Meshes/Groups/InstancedMeshes. Builder can also build a sub-group and animate the Group as a whole
  (rotating wheels, swaying trees, drifting clouds…).
- Budget per place: ≤ ~150k triangles, ≤ ~40 draw calls. Use InstancedMesh for many identical moving things.
- `update(t, dt)` runs every frame only while the place is on screen; keep it cheap: no allocations in loops.
  Animation should be calm and poetic (slow, looping), not frantic.
- Materials: `M.stone`, `M.smooth`, `M.flat` (faceted), `M.wood`, `M.cloth` (double-sided), `M.metal` (tint with C.gold/C.silver),
  `M.rough_metal`, `M.water` (transparent), `M.glass`, `M.glow` (unlit; vertex colour × `glow` intensity → blooms).
  All use vertex colours via the `color` option. Stand-alone animated meshes: `solid(color, opts)` / `glowMat(color, intensity)`.
  `Lines` builds thin lines (ropes, strings, wires) in one draw call.

## Look
- Global lighting: dusk sun low, cool hemisphere fill, ACES tone mapping, bloom on bright emissives, fog, tilt-shift.
  The stage is a parchment map of Middle-earth with the place standing on a stone plinth (like a museum miniature).
- Visual language: refined miniature — parchment, stone, dark wood, leaf-green, candle-gold. The palette `C.*` is warm;
  keep the "museum model" feel: clean silhouettes, believable materials, calm animation.
- Each place needs ONE strong, instantly readable idea taken from the text — a silhouette you'd recognise at overview
  distance (~150 units away) — plus rich detail that rewards a close look (~25–40 units). Prefer the poetic core over literal clutter.
- Use glow sparingly and meaningfully (lit windows, lamps, fire, magic). Large glowing areas blow out the bloom.
- Avoid: plain grids of identical boxes; inexplicable floating things; z-fighting (offset coplanar faces by ≥ 0.01);
  text/letters; giant flat untextured planes; everything the same colour.
- Make each place clearly different from the others in silhouette, palette and composition.

## Verify (mandatory)
Headless Chrome + playwright-core is set up:
```
node scripts/shot.mjs <id> <view> <out.png> [t]
```
views: `front` | `side` | `back` | `top` | `close` | `low`; `t` = animation time in seconds (default 2).
Put screenshots in your own scratch folder and inspect them with the Read tool.
The script prints console errors — fix them all. Iterate until your place is beautiful and recognisable from at least
`front`, `side` and `close`. Overall app check: `node scripts/shot.mjs app <out.png> <id> 9000` loads the full app and flies to your place.

## Report
At the end: 1–2 sentences on the idea and what you built, and anything you're unsure about. No code.
