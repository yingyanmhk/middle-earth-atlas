# Place specs for mass production

One-strong-idea + key elements per place, for the batch of remaining cities.
Style anchor: `src/cities/hobbiton.js`. Realm accent colours in `src/data.js` (CATEGORIES).

## Book I — The Ring Sets Out
- **old-forest** (wild) — Dark ancient trees that lean and mutter. Idea: a dense, shadowy wood with
  gnarled leaning trunks, thick canopy, a golden-brown river (Withywindle) curling through, and one
  huge menacing willow at the heart. Element: fbm terrain, many `tree`/bare twisted trunks (use
  `rock`-style jitter or lathe for twisted trunks), heavy canopy of overlapping icosahedra, river
  band of M.water, a few fireflies (glow particles). Mood: dim, sleepy, faintly sinister.
- **bree** (men) — A village of Men behind a hedge, on a hill, with an inn. Idea: a circular hedge
  (wallRing of bushes) around a hill village; stone-and-timber houses, one big inn (Prancing Pony)
  with a lantern and a signpost (no text — a small painted board), a well, a few Men and hobbits.
  Warm dusk windows. Element: `wallRing`-like hedge ring (green), houses via `house`, inn bigger.
- **weathertop** (men) — A ruined watchtower on a bare hilltop. Idea: a broken ring of stone walls
  (ruined `wallRing` with gaps and fallen blocks), a low ruined tower with a cracked top, a
  campfire glow in the hollow, a bare windswept hill (fbm, sparse grass), and 5 dark riders
  (shadowy figures on horses? keep abstract: dark cloaked `figure`s on small dark horses — or just
  a sense of emptiness + a faint cold blue light from the horizon). Simplest strong read: ruined
  stone ring + fire + dark figures.

## Book II — The Ring Goes South
- **caradhras** (wild) — The Redhorn Pass: a steep snowy mountain shoulder with a narrow pass and
  falling snow. Idea: a big red-grey rocky peak (two `rock` clusters forming a shoulder) with snow
  caps, a winding pass road (path boxes), drifting snow particles (InstancedMesh of white specks
  falling), wind lines, a small camp or abandoned packs. Palette: red-grey rock + white snow.
- **moria** (dwarves) — A vast dark dwarven kingdom under the mountain. Idea: a towering dark
  doorway in a cliff face (the Doors of Durin — a great arch with a faint star-glowing lintel),
  opening into darkness; beside it a tall carved pillar forest (rows of big square pillars
  receding into darkness — give perspective), the tomb of Balin (a stone slab with a small light),
  and at the far end Durin's Bridge (a slender span over a glowing chasm). Use M.glow sparingly
  (faint blue star-light on the door, warm torch light inside). Mood: vast, dark, echoing; a few
  distant glowing windows.
- **lothlorien** (elves) — The Golden Wood: tall silver-barked mallorn trees with golden leaves,
  flets (platforms) in the branches, the Mirror (a silver basin of water in a clearing). Idea:
  vertical golden forest — 8-12 tall mallorn (silver trunks, gold canopy), branch platforms with
  small structures and a lantern, one clearing with the Mirror (dark water disc with faint glow),
  a couple of elves (figure). Palette: silver + gold + deep green. Falling golden leaves animation.

## Book III — The Treason of Isengard
- **edoras** (rohan) — A town on a hill crowned by a golden hall. Idea: a stepped hill town of low
  thatched houses (thatched = M.cloth roofs), a winding street, and at the top the Golden Hall
  Meduseld: a long timber hall with a golden roof, carved pillars (horses), banners (accent gold),
  a fence of horse-skulls? (keep abstract: carved posts). Wind-blown grass plains around. A few
  riders? Palette: straw-gold + dark timber.
- **fangorn** (wild) — The oldest forest, where the trees talk. Idea: huge ancient trees — massive
  trunks (a few tall gnarled lathe trunks with knobby roots), among them 2-3 Ents: tree-shaped
  figures (tall trunks with "arms" branches and a head — abstract, not cartoonish; slow,
  monumental), a dim green light, moss on rocks. One tree literally walking (very slow sway/
  step animation via swayify or rotation). Mood: ancient, watchful.
- **isengard** (shadow) — Orthanc: a black tower of unbreakable stone in a ring of walls. Idea: a
  tall black four-horned tower (orthanc = four sharp pinnacles — build a tall dark prism with 4
  spikes) standing alone in a circular stone ring, the ring partly flooded (M.water ring with
  fallen stone), wrecked machinery (a broken wheel), a few orc-ish dark figures, and green ivy
  creeping up (the forest taking back). Palette: black stone + pale sickly green light from the
  tower's top (palantír — a small glowing orb).

## Book IV — The Ring Goes East
- **ithilien** (gondor) — The fair land east of the river, still beautiful under shadow. Idea: a
  hidden dell with a waterfall (Henneth Annûn): a green vale with olive trees, a curtain waterfall
  falling into a pool behind a rock screen, a small watch-post (a low stone shelter with a lit
  window), flowers. Contrast: beauty + a distant dark tower on the horizon (tiny black spike).
  Palette: green/gold + a thread of shadow.
- **minas-morgul** (shadow) — The city of the moon that fell. Idea: a crooked pale-green glowing
  city in a dark vale: 2-3 towers that lean (rotated cylinders), windows glowing sickly pale-green
  (M.glow with a green tint), a great gate, a bridge over a dead river, pale mist. Mood: wrong,
  beautiful, sick. A single warm light somewhere (a memory of what it was).
- **shelobs-lair** (shadow) — Dark tunnels with webs. Idea: a great dark tunnel entrance in a rock
  face, thick grey webs (Lines/cat-sag ropes crisscrossing the opening), a huge dark spider shape
  (abstract: a black bulbous body on thick legs, half in shadow, one eye glinting faint red), a
  dead tree with a lantern at the mouth, bones (small white cylinders) on the floor. Mood:
  dread. Very little color — black/grey + one glint.

## Book V — The War of the Ring
- **dunharrow** (gondor) — A stony upland with white stones, and a dark door. Idea: a high grey
  plateau (flat fbm terrain) scattered with small white standing stones (rows of white slabs),
  tents (small cloth cones) of a muster, and in a cliff at the back a DARK ARCHED DOOR with a thin
  white mist seeping out, two torches flanking it. Mood: cold, waiting, ancient.
- **osgiliath** (gondor) — The ruined city of kings, straddling the river. Idea: the Anduin
  (M.water band) running through the middle; on both banks ruined white-stone buildings: broken
  arches (`arch` + broken top), a ruined great bridge with a gap (two bridge halves meeting over
  water), rubble, one surviving tower with a watch-fire. Two or three soldiers (figure). Palette:
  white ruin + river + fire.
- **black-gate** (shadow) — Two towers of iron guarding a gate. Idea: a great iron rampart across
  a mountain gap: two huge dark towers (tall square prisms) flanking a massive iron gate (dark
  metal slabs with rivet dots), the plain before it ash-grey with scattered bones (white), banners
  of Mordor (black with red eye? abstract: dark flags). A faint red glow behind the gate.

## Book VI — The End of the Third Age
- **barad-dur** (shadow) — The Dark Tower: a vast black fortress, and the Eye. Idea: a huge
  stepped black fortress (stacked dark blocks with spiked corners, like Minas Tirith's evil
  mirror), a towering central pinnacle, and at its top a glowing EYE — a red-orange radial glow
  (glow sphere + thin radiating lines), slowly pulsing. Ash plain, chains, a great bridge up to
  the gate. Mood: vast, oppressive, burning.
- **mount-doom** (shadow) — The fiery mountain. Idea: a conical volcano of black ash with glowing
  red cracks (thin M.glow lines down the slopes), a plume of smoke/ash (particles rising), at the
  base the Sammath Naur: a dark doorway of fire, and a small dark figure at the door (one hobbit
  silhouette). The Cracks of Doom glow. Animation: pulsing fire + ash.
- **grey-havens** (elves) — The last shore, where white ships sail west. Idea: a grey harbour:
  a calm sea (M.water disc), stone quays, two white ships (use `boat` bigger, white hulls with
  tall masts and folded sails), grey stone houses with warm windows, a tall lantern at the pier,
  the sun setting low and golden on the water, and a few elves waiting on the quay. Palette:
  grey stone + white ships + gold horizon light. Mood: farewell, peace.

## The Hobbit
- **erebor** (dwarves) — The Lonely Mountain and its dragon-hoard. Idea: a great lone peak (two
  big `rock` clusters) with a great stone door in its base (the secret door — a stone door with a
  faint moon-rune glow), and inside the doorway a hint of gold (a warm gold glow). Below the
  mountain, dwarf forges: a few low stone buildings with forge fires (orange glow), anvils, and
  dwarf figures. A small treasure glint (scattered tiny gold dots near the door).
- **lake-town** (men) — A town on stilts in a cold lake. Idea: a dark lake (big M.water disc), a
  long wooden bridge, and a cluster of timber houses on tall stilts (each house on 2-4 posts
  standing in the water, connected by walkways — use `spiralStair`-style posts + `bridge`/plank
  walkways), warm windows reflecting on the water (add faint glow copies under the water? keep
  simple), boats tied below, a watch-tower. Palette: dark blue water + warm amber timber.
- **mirkwood** (wild) — The great dark forest and the Elvenking's halls. Idea: a dense dark forest
  (many dark trees, black-green), and a hill with stone doors (the Elvenking's halls: a low hill
  with a great stone door, torch light inside), an enchanted river (a black stream with faint
  silver shimmer), giant spiders' webs between trees, and a path that winds and disappears. Mood:
  dark, enchanted, dangerous.
