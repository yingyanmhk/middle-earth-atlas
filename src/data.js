// The places of Middle-earth, in the order the road of the Ring passes through them.
// Texts are original paraphrases written for this atlas, not quotations from the book.

export const CATEGORIES = [
  { id: 'shire',   short: 'Shire',   name: 'The Shire',     color: '#8aa66b', glyph: '✳' },
  { id: 'men',     short: 'Men',     name: 'Men of the West', color: '#c8a86b', glyph: '♞' },
  { id: 'elves',   short: 'Elves',   name: 'The Elves',     color: '#9fc2d4', glyph: '✦' },
  { id: 'dwarves', short: 'Dwarves', name: 'The Dwarves',   color: '#9a8b76', glyph: '⚒' },
  { id: 'rohan',   short: 'Rohan',   name: 'Rohan',         color: '#d9b64e', glyph: '♜' },
  { id: 'gondor',  short: 'Gondor',  name: 'Gondor',        color: '#e6dfd0', glyph: '♛' },
  { id: 'wild',    short: 'Wild',    name: 'The Wild',      color: '#557a3e', glyph: '❧' },
  { id: 'shadow',  short: 'Shadow',  name: 'The Shadow',    color: '#7c3f3f', glyph: '☾' },
];

export const CAT = Object.fromEntries(CATEGORIES.map((c, i) => [c.id, { ...c, index: i }]));

// [id, name, category, n-within-category, motif, mapPos[x,z], text]
const RAW = [
  // ─── Book I · The Ring Sets Out ───
  ['hobbiton', 'Hobbiton', 'shire', 1, 'Round doors in a green hillside, and a party tree by the mill', [-79, -42],
   'Half a dozen round doors painted yellow and green open into a hillside, each with a polished brass knob and a little garden of its own. Below, the mill by the water turns lazily; the Party Tree stands on the hill where the whole Shire once gathered to watch fireworks. The road that leaves it is still young here — it will grow old and dangerous before it comes back, but the hobbits who live in these holes know, for now, only the smell of fresh bread and pipeweed.'],
  ['old-forest', 'The Old Forest', 'wild', 1, 'Trees that lean and mutter, and a river that sings you to sleep', [-56, -23],
   'Beyond the Hedge the trees are older than the Shire, and they do not like being walked through. They lean over the path, their roots trip the traveller, and the dark places between them smell of wet earth and age. In its heart the Withywindle curls, slow and golden-brown; the willows along it hum a drowsy tune, and whoever stops to listen finds it very hard to go on. There is one willow in particular, deep in the wood, that swallows people whole.'],
  ['bree', 'Bree', 'men', 1, 'A village of Men behind a hedge, where strangers are noticed', [-84, -12],
   'Bree is the only place in all the lands west of the Misty Mountains where Men and hobbits live side by side in the same village. The houses climb the hillside behind a tall hedge, and the inn at the top of the street — the Prancing Pony — is the one place where news from far away still stops to rest. Travellers are noticed in Bree, and remembered, which is why the hobbits of the Shire are careful what they say there.'],
  ['weathertop', 'Weathertop', 'men', 2, 'A ruined watchtower on a hill, and a fire that drew the dark', [-48, -52],
   'Amon Sûl, the Hill of the Wind, was once the highest watchtower of the North Kingdom; now it is a broken ring of stone on a bare hilltop. From its crown you can see the road for miles, which is why the travellers camped there — and why the fire they lit was seen from farther still. In the hollow of the ruined tower, under a cold wind, the nine riders closed in, and the hill has been unlucky ever since.'],
  ['rivendell', 'Rivendell', 'elves', 1, 'The Last Homely House, hidden in a valley of waterfalls', [-19, -59],
   'East of the mountains, behind a fold of the hills, the valley of Imladris opens: waterfalls pour down the cliff faces, the river runs silver over stones, and the last house east of the Sea stands among birch and rowan, its windows lit by evening. Here old things are kept and mended — swords, songs, and the weary. Elrond’s house is a place where time moves gently, and the road, for a while, does not press.'],
  // ─── Book II · The Ring Goes South ───
  ['caradhras', 'Caradhras', 'wild', 4, 'The Redhorn Pass, whose snows turn travellers back', [-27, -31],
   'The Redhorn is the cruelest of the Misty Mountains: a great red shoulder of rock that catches every storm. The pass over its shoulder is high and narrow, and the mountain does not welcome travellers. Snow comes down without warning, the wind screams through the gaps, and stones fall from the heights. Those who try it learn that the mountain has its own mind, and its mind is against them.'],
  ['moria', 'Moria', 'dwarves', 1, 'A kingdom of the deep, whose door opens only to moonlight', [-36, -1],
   'Under the mountains the dwarves of Khazad-dûm carved halls so vast that their roofs are lost in darkness. The door on the western side is written in moon-letters and opens only when moonlight touches them. Inside, the old road leads past great pillars and empty halls, the tomb of Balin in a chamber of fallen stone, and at last to Durin’s Bridge, a single slender span over a gulf of blackness — where something older than the dwarves waits in the deep, and the drums begin.'],
  ['lothlorien', 'Lothlórien', 'elves', 2, 'A golden wood where time moves slowly and nothing ages', [-7, -8],
   'On the far side of the mountains, between the river and the dark forest, lies the Golden Wood. Its trees are mallorn, tall and silver-barked, and in autumn their leaves turn gold and fall only with the coming of a new spring. The elves here live in flets high in the branches, and a traveller who stays a while finds that days pass like years elsewhere — or is it the other way round? From the Mirror of the Lady one may see things that were, and things that may be.'],
  // ─── Book III · The Treason of Isengard ───
  ['edoras', 'Edoras', 'rohan', 1, 'The golden hall of Meduseld on a hill above the grass', [-22, 72],
   'Edoras stands on a hill above the plains of Rohan, a town of low thatched houses and a single great hall at the top: Meduseld, the Golden Hall, its roof gilded and its pillars carved with horses. The wind moves through the grass like a sea, and the horse-lords of the Mark measure their wealth in herds and their history in song. From the hall door you can see the whole land, and beyond it, far off, the black spike of Orthanc.'],
  ['fangorn', 'Fangorn', 'wild', 2, 'The oldest forest, where the trees talk and the hills walk', [-34, 29],
   'Fangorn is older than any kingdom, older than the Elves remember, and its trees remember things that no one else does. The trees here move, slowly, and some of them — the Ents, the shepherds of the forest — talk, in a language that takes all day to say good morning. Travellers who enter are not always found again; those who come out are not quite the same. And when the forest grows angry, it walks.'],
  ['isengard', 'Isengard', 'shadow', 1, 'A black tower of stone that nothing can break, in a ring of iron', [-48, 56],
   'In the ring of Isengard, a circle of stone walls, stands Orthanc: a black tower of four horns, unbreakable, made of a stone that no hammer can chip. Saruman once kept its garden full of rare trees and fountains; now the valley is full of pits and forges, and the tower watches the road to Rohan like a needle. When the forest finally came, it tore the machines and flooded the ring — but the black tower still stands, alone and unbroken.'],
  ['helms-deep', 'Helm’s Deep', 'rohan', 2, 'The Hornburg in the cleft, where the tide of war broke', [-9, 44],
   'In the fold of the White Mountains the valley of Helm’s Deep narrows to a gorge, and at its head rises the Hornburg: a great wall of grey stone, a tower behind it, and a cavern keep. Twice the armies of the dark have flooded the valley, and twice the wall has held, until the horn sounds and the host pours down the road to the plain. The stone of Helm’s Deep remembers war the way the plains remember grass.'],
  // ─── Book IV · The Ring Goes East ───
  ['ithilien', 'Ithilien', 'gondor', 4, 'The fair land east of the river, hidden under shadow', [41, 16],
   'East of the Anduin the land of Ithilien was once the garden of Gondor: olives and cedars, thyme and rosemary on the slopes, springs of cold water. Now the shadow of Minas Morgul creeps through it, and the woods are patrolled by orcs, yet the flowers still bloom and the birds still sing where the land is left alone. In the hidden dell of Henneth Annûn a waterfall falls behind a curtain of white water, and men still live there, watching the dark.'],
  ['minas-morgul', 'Minas Morgul', 'shadow', 2, 'The city of the moon that fell, glowing with pale sickness', [45, 55],
   'Minas Morgul was once a fair city of Gondor, Minas Ithil, the Tower of the Moon, holding the pass against the dark. It fell, and now the moon it was named for looks down on a city that glows with a sickly pale light. Its towers are crooked, its windows are like the eyes of insects, and the valley beneath it stinks of death. No one enters it willingly; the dead city watches the road, and its great gate opens only to let evil out.'],
  ['shelobs-lair', 'Shelob’s Lair', 'shadow', 3, 'Dark tunnels where a spider older than the world spins her webs', [63, 81],
   'The pass of Cirith Ungol climbs through rock that stinks and oozes, and the tunnel at its top is the lair of Shelob, a spider older than the oldest forest. Her webs hang in the dark like grey curtains; her strength is in the deep blackness where no torch helps. She has fed there for longer than the histories remember, and the orcs fear her more than they fear their masters. The tunnel is a place where the dark itself seems to have teeth.'],
  // ─── Book V · The War of the Ring ───
  ['dunharrow', 'Dunharrow', 'gondor', 1, 'A camp under the mountain, and a door that no living thing passes', [20, 38],
   'High in the White Mountains, under the shadow of the Dwimorberg, the riders of Rohan and Gondor gather at Dunharrow, a stony upland dotted with white stones of forgotten kings. Behind the camp, in the cliff, stands a dark door: the entrance to the Paths of the Dead, where an oathbroken host waits for the king who will call them. No living thing passes that door willingly, and the air around it is cold even in summer.'],
  ['minas-tirith', 'Minas Tirith', 'gondor', 2, 'The white city of seven circles, built into the mountain', [33, 81],
   'Minas Tirith is built on the spur of Mindolluin like a great white ship turned to stone: seven circles of wall and street climbing one above another, each with its gate set differently from the one below, so that no enemy can pass them in a straight line. At the top stands the Citadel, the beacon of Ecthelion, and the withered White Tree of Gondor in its courtyard. From the highest wall you can see the Anduin and, far away, the dark land it flows toward.'],
  ['osgiliath', 'Osgiliath', 'gondor', 3, 'The ruined city of kings, straddling the great river', [8, 67],
   'Osgiliath was the old capital of Gondor, a city of great arches and stone bridges straddling the Anduin, with a silver dome that held a palantír. Now it is a ruin: the bridges are broken, the streets are rubble, and armies of both sides have fought through it so often that the stones are worn by boots and fire. Yet it is still the key to the crossing, and whoever holds its ruined towers holds the road to Minas Tirith.'],
  ['black-gate', 'The Black Gate', 'shadow', 4, 'Two towers of iron guarding the entrance to the dark land', [69, 38],
   'Where the mountains of Mordor leave a gap between them, the enemy built the Morannon: a great rampart of iron and stone, with two towers of black rock standing like teeth, and between them a gate of iron that no army has ever broken. The plain before it is a desert of ash, dotted with the bones of those who tried to pass. The gate opens only to the enemy’s will — and, once, to a small company who came to knock on it.'],
  // ─── Book VI · The End of the Third Age ───
  ['barad-dur', 'Barad-dûr', 'shadow', 5, 'The Dark Tower, built with sorcery, watching over Mordor', [112, 59],
   'In the heart of Mordor, at the foot of the Ash Mountains, stands Barad-dûr, the Dark Tower: a fortress of black iron and stone, with walls a hundred feet thick and a pinnacle that rises like a spear. It was built with the power of the Ring, and only the Ring’s destruction could unbuild it. At its top an Eye watches — a lidless eye of flame that reaches out over the dark land, seeking. Even from the far side of the mountains, its presence presses on the mind like a weight.'],
  ['mount-doom', 'Mount Doom', 'shadow', 6, 'The fiery mountain where the Ring was forged and unmade', [92, 81],
   'Orodruin, the Mountain of Fire, rises alone in the ashfields of Mordor, its cone smouldering, its cracks glowing red at night. In its heart, in the Sammath Naur, the Cracks of Doom, the Ring was forged in the fires that could destroy it — and there, at the last, in the moment of despair, it was unmade by the simple fall of a small creature, and the mountain erupted and broke. All the dark of Mordor ended in that fire, on the last day of the War of the Ring.'],
  ['grey-havens', 'The Grey Havens', 'elves', 3, 'The last shore, where white ships sail into the western sea', [-112, -30],
   'At the western edge of the world, where the land meets the sea, stands Mithlond, the Grey Havens: a small town of grey stone beside a harbour of grey water, where the ships of the elves lie waiting. From here the straight road of the sea leads west, out of the circles of the world, and the elves come here when their time in Middle-earth is done. One last ship left that harbour carrying the keepers of the Three Rings and the Ring-bearers, and the world of the Third Age ended, and the fourth began.'],
  // ─── Beyond the book · The Hobbit ───
  ['erebor', 'Erebor', 'dwarves', 2, 'The Lonely Mountain, and the gold hoard that woke a dragon', [86, -14],
   'Erebor, the Lonely Mountain, stands apart in the north-east, its lower slopes terraced and its great hall carved deep in the rock. There the dwarves of Durin’s folk once feasted in halls of stone and gold, until the dragon came and took the mountain, sleeping on a hoard that no one could count. When the dragon was ended, the dwarves returned, and the forges of the Lonely Mountain rang again — the last great kingdom of the dwarves under the sky.'],
  ['lake-town', 'Lake-town', 'men', 3, 'A town on stilts in a cold lake, under the shadow of the mountain', [67, -37],
   'Esgaroth, the Lake-town, is built on piles driven into the Long Lake, its wooden houses and walkways standing above the dark water, reached by a great bridge of wood. Its people are bargemen and merchants who trade along the river, and they live in the shadow of the Lonely Mountain, whose dragon they fear and whose treasure they secretly remember. When the dragon came, the town burned and sank — but it was rebuilt, and the men of the lake went on.'],
  ['mirkwood', 'Mirkwood', 'wild', 3, 'The great dark forest, where the Elvenking’s halls lie hidden', [39, -28],
   'The great forest east of the river was once called Greenwood the Great; it is now Mirkwood, and the name suits it. Its trees grow close and dark, the paths wind and forget themselves, and the air is heavy with spells and the smell of decay. In its northern heart the Elvenking’s halls are carved into a hill, with stone doors and torch-lit passages; but the road that passes the forest on its way to the mountain is not safe, and the forest swallows what it can.'],
];

export const CITIES = RAW.map(([id, name, cat, n, motif, mapPos, text], i) => ({
  id, name, cat, n, motif, mapPos, text,
  order: i, // reading order 0..24
}));

// Book membership: the six books of The Lord of the Rings + a bonus row for The Hobbit.
const CHAPTER_SIZES = [5, 3, 3, 3, 4, 3, 3];
export const CHAPTERS = [
  { roman: 'I', name: 'The Ring Sets Out' },
  { roman: 'II', name: 'The Ring Goes South' },
  { roman: 'III', name: 'The Treason of Isengard' },
  { roman: 'IV', name: 'The Ring Goes East' },
  { roman: 'V', name: 'The War of the Ring' },
  { roman: 'VI', name: 'The End of the Third Age' },
  { roman: 'H', name: 'A Tale of the Lonely Mountain' },
];
{
  let k = 0;
  CHAPTER_SIZES.forEach((size, ch) => {
    for (let j = 0; j < size; j++) { CITIES[k].chapter = ch; CITIES[k].inChapter = j; k++; }
  });
}
export const CHAPTER_SIZES_ARR = CHAPTER_SIZES;
export const ROMAN = CHAPTERS.map((c) => c.roman);

export const CITY = Object.fromEntries(CITIES.map((c) => [c.id, c]));

// The frame story: the Red Book of Westmarch, and the road of the Ring.
// `after` = shown after the last place of that book (−1 = prologue, last = epilogue).
export const INTERLUDES = [
  { after: -1, title: 'The Red Book',
    text: 'In the west of the world, in the Shire, there lived hobbits — small folk who love good food, warm fires, and long walks, and who mostly think the great events of the world are nothing to do with them. Yet it was a hobbit who found the Ring, and a hobbit who carried it, and this atlas is the book of that road: the road that ran from the round door of Bag End, through the dark of Moria and the gold of Lórien, to the fire of Mount Doom, and home again — changed. The road goes ever on.' },
  { after: 0, title: 'Out of the Shire',
    text: 'Three hobbits set out from Hobbiton on a morning in late September, with a little baggage and a great deal of doubt, and walked into a world wider than any of them had imagined. The Old Forest tried to keep them, Bree nearly gave them away, and on Weathertop the dark closed in. They came at last to Rivendell, the Last Homely House, where the road rested — and where the choice was made to carry the Ring south.' },
  { after: 1, title: 'Under the Mountains',
    text: 'The Ring-bearers tried to cross the mountains and the mountain refused them, so the road went under them instead: into Moria, where the dwarves once held a kingdom of stone and light, and where something woke in the deep. They came out on the far side into Lothlórien, a wood where time moves gently and the Lady of the Galadhrim looked into their hearts. There the Fellowship was broken in spirit but not in hope, and the company set out again on the Anduin, toward the falls and the dark.' },
  { after: 2, title: 'The Golden Hall',
    text: 'The road split at the falls of Rauros: one company followed the orcs that took the hobbits, through the grass of Rohan to the golden hall of Meduseld, and into the anger of Fangorn, where the oldest trees took counsel. Helm’s Deep held through the long night, and the forest rose and walked to Isengard. Saruman’s power was broken in a single evening — and the world of the White Wizard came down like a house of cards.' },
  { after: 3, title: 'The Stair of the Spider',
    text: 'East of the river, in the shadow of the mountains, the two hobbits and their guide crossed the fair land of Ithilien, which the war was slowly killing. They passed the gates of Minas Morgul, the dead city of the Moon, and climbed the pass of Cirith Ungol, where a spider older than the world waited in the dark. Beyond the tunnel lay Mordor — the land the ring had been made to rule, and the place where it had to be unmade.' },
  { after: 4, title: 'The City of the White Tree',
    text: 'While the Ring-bearers crept through the dark, the War of the Ring came to its great door: the white city of Minas Tirith, seven circles of stone built against the mountain, stood against the armies of the dark as it had a hundred times before. The riders of Rohan came down from the north at dawn, and the Dead that kept their oath broke the corsairs’ fleet, and the tide turned on the fields of the Pelennor. The road to Mordor was open, and the last march began.' },
  { after: 5, title: 'The Dark Land',
    text: 'The armies of the West marched to the Black Gate to draw the Eye upon them, and behind them, unseen, the Ring-bearer climbed the ash slopes of Mount Doom. At the Cracks of Doom, at the last moment, the Ring took him — and then it was unmade anyway, by the fall of a small creature and the mercy of a chance. Barad-dûr fell, the Eye was blinded, the mountain broke, and the dark land became a land of rain and ash and beginning again.' },
  { after: 6, title: 'The Last Ship',
    text: 'The war was over, the Shire was healed, and the four hobbits came home to find that the road they had walked had followed them there. In the autumn, at the Grey Havens, a white ship lay waiting in the harbour. Elrond and Galadriel, Gandalf, and the Ring-bearers — those who had worn the Ring or kept it — boarded her and sailed west, out of the circles of the world. For them the story was over; for those left behind, it was only the beginning of the telling. The road goes ever on.' },
];
