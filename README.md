# Middle-earth — an atlas

A three.js atlas of the places of J.R.R. Tolkien's *The Lord of the Rings*. Every landmark —
from Hobbiton to the fires of Mount Doom — is a procedurally generated miniature diorama standing
on a painted parchment map of Middle-earth.

**Live:** <https://yingyanmhk.github.io/middle-earth-atlas/>

```sh
pnpm install
pnpm dev        # http://127.0.0.1:5199
pnpm build      # static site in dist/
```

## What is in it

- **25 dioramas**, one per place, each built in code from a shared kit of miniature
  architecture (`src/cities/<id>.js`, `src/kit.js`). Most are animated.
- **Four layouts**, animated between:
  - *Map*: the places stand on a hand-painted parchment map of Middle-earth —
    coast, rivers, mountain ranges, forests and Mordor, drawn in the classic Tolkien map style.
  - *The Road*: a spiral in the order the Ring's road passes through the places. The One Ring
    rises at its centre: “three rings for the Elven-kings… one for the Dark Lord on his dark throne.”
  - *Chapters*: the six books of the tale as rows, plus a row for *The Hobbit*.
  - *Realms*: grouped by people and powers (Shire, Men, Elves, Dwarves, Rohan, Gondor, the Wild, the Shadow).
- **The Red Book of Westmarch** at the head of the board. Click it to read the interludes.
- **The Road mode**: a tour through all the places in order, with the book interludes between.
- **Contents**: a book × realm grid of every place.
- Realm filters, dusk/night lighting, a generative soundscape, tilt-shift, bloom and film grain.

Keys: `←/→` previous/next place, `↑/↓` same realm, `1/2/3/4` layouts, `T` the road, `C` contents,
`N` night, `M` sound, `H` hide the interface, `Esc` back.

Deep links: `/#minas-tirith` opens a place. `/?solo=hobbiton&view=front` renders one diorama alone
(used by `scripts/shot.mjs` for screenshots).

## A note on the texts

The place texts and interludes are paraphrases written for this atlas, not quotations from the
book (except for a few short phrases). Read the book itself.

## Deploy

```sh
pnpm build          # static site in dist/ (relative base: deployable anywhere)
```
The repo includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that builds and
publishes to GitHub Pages on every push to `main`.

## Credits

Architecture and visual approach inspired by *[Invisible Cities — an atlas](https://github.com/stared/invisible-cities-opus-5.5)*
by Piotr Migdał (a three.js atlas of the fifty-five cities of Calvino's *Invisible Cities*),
which was itself generated in a single Claude Opus 5.5 session. This project was built by
multi-agent AI coding (DeepSeek Harness) using the same workflow: a shared builder kit, one brief
per place, parallel agents, and headless-Chrome screenshot verification.
