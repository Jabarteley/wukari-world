# The roster

Twelve finished characters, six men and six women, replace the procedural figures. A character has up to four outfits (texture
swaps on the same mesh) and, for most, six skin tone steps. The roster is data: `src/game/roster.ts` lists the characters and which
are on; the models, textures and portraits are fetched later and never sit in the first download.

## Files

| What | Where |
| --- | --- |
| The manifest (ids, names, outfit counts, skin steps, the `on` switch) | `src/game/roster.ts` |
| Models and textures: `<id>-hero.glb`, `<id>-crowd.glb`, masks, `-o1..o3.jpg`, `.json` | `src/scene/roster/assets/` |
| Portraits (256 px) and whole-figure thumbnails | `src/scene/roster/portraits/` |
| The figure loader, the face (moods, blink) and the hero / crowd budget | `src/scene/roster/figure.ts`, `life.ts`, `budget.ts` |
| Who wears what (old looks, regulars, seeds) | `src/scene/roster/map.ts` |
| Other people's bodies in a scene | `src/scene/roster/crowd-bodies.ts` |

To turn a character on, put its files in the two folders and change its `on` to `1`. To turn it off, change it back: a saved look
that names it is then read as the nearest character that is on.

## The saved look

A look keeps its old fields and gains three optional ones: `character` (an id), `characterOutfit` (1 and up) and `characterSkin`
(1 to 6). A key exists only for a choice other than the default. The old hairstyle, outfit and fabric of a character are free
styles (`as` in the manifest) that stand in for it where the old figure is still drawn; wearing a character grants no style that is
sold. The server accepts a known character of the body's sex with an outfit and a skin step in range (`checkLook`).

## Old looks (mapped on read, never rewritten)

A look with no `character` is read as the nearest character that is on. The body gives the sex; the outfit, fabric, hairstyle and
accessories then score each candidate (the table in `map.ts`, highest wins, ties go to the first in manifest order); the old skin
tone becomes the nearest of the six steps. Nothing stored changes until the player next saves a look.

| Old look | Character |
| --- | --- |
| man, casual / jersey / chill / site work | T-shirt and jeans (m1) |
| man, hoodie | Hoodie and joggers (m4) |
| man, office | Shirt and trousers (m5) |
| man, kaftan; agbada | Senator (m2) |
| man, in ankara / adire, or a fila | Ankara shirt and chinos (m6) |
| woman, casual / jersey | Crop top and jeans (w3) |
| woman, casual in ankara with braids | Ankara wrapper and blouse (w1) |
| woman, office | Two-piece (w4) |
| woman, owambe / gown, or a gele | Aso-ebi (w2) |
| woman, kaftan, or a headwrap | Bubu (w6) |

## Regulars and crowds

A regular's character comes from their description (a look field, their emoji, the honorific in their name, their life stage) and
their id, so the same regular always looks the same. A person with no look gets a character from their seed.

## Budgets

A scene draws at most four hero figures, and its roster figures together stay under 30,000 triangles on top of the scene's own
(`budget.ts`). The player's own figure is the first claim. A device with four cores or fewer has no hero model and at most four
figures. Anything over the budget, a failed file, or no WebGL2 leaves the procedural figure.
