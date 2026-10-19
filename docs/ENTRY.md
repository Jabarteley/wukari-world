# The entry page

A visitor with no life sees the entry page (`src/app/features/start/EntryPage.vue`) before the character creator: the game's own scenes behind one compact card. "Play now" is the one-tap guest start; "Make my character first" opens the creator, unchanged. A returning player never sees it.

## Variants

One table, `src/entry-variants.ts`, drives the page and the link preview of both hosts (`server/path-meta.ts`). A row holds the addresses, the title and description, the headline and pitch, four tiles, the card picture and the link-preview picture, the first button and the others. A new variant is a row.

| Address | For | First button |
| --- | --- | --- |
| `/` | everyone | Play now |
| `/shops`, `/sell` | people with goods to sell | Open my shop |
| `/services` | salons, tailors, repairs, photography, tutoring, events, tech | List my services |
| `/games` | friends who want to play together | Play now |
| `/cities`, `/world` | the map | Play now |
| `/agents`, `/ai` | AI agents (see `docs/AGENTS.md`) | Play now |
| `/politics` | the politics advert: "Become governor of Lagos this week" (one-week terms, real elections, `docs/POLITICS.md`) | Play now |
| `/street/<city>/<place>`, `/street` | the street advert: "Walk Yaba, Lagos" | Play now |
| `/visit/<city>`, `/visit` | the diaspora advert: "Visit home from London" (walk your family's street, call their character) | Play now |

- The address is not rewritten to `/` until the visitor acts, so it survives a reload.
- `/politics` opens the Politics panel once the life exists (it is also the panel's short address for a returning player).
- "Open my shop" and "List my services" start a guest, then open My shop in the Services app with a kind of shop chosen. A guest cannot publish, so My shop shows the three steps ("Set up now · Sign up to save it · Goes live once checked") and the real requirements, with Sign up at that moment. Nothing about the rules is loosened: an account, a checked phone number, an account at least a day old, an "18 or older" answer, three photos, and an approval.
- A returning player who opens `/shops` or `/services` goes straight to My shop; `/games` to the games; `/cities` to the map.
- Campaign counting: `landed` and `play` are counted on this page. When a link has no `utm_content`, the variant name (`shops`, `services`, `games`, `cities`, `agents`, `politics`, `street`, `visit`) is counted as the content, so the variants can be compared without tagging. Every street and visit address counts as `street` or `visit`: the place itself is not a campaign word.
- The head of each address (title, description, `og:` and Twitter tags, canonical, picture) is fixed text from the table, written by the Node host and the Worker alike.

## A street or a visit (ad-ready plan, phase 1)

`/street/<city>/<place>` names an open city (its id or an alias) and one of its local units or districts (`/street/lagos/yaba`,
`/street/lagos/ikeja`); `/visit/<city>` names the city alone. The path table (`src/paths.ts`, intent kind `street`) reads the address;
the place is checked against the city's rules (`streetPlace`), so a word the city does not have is never shown or written anywhere.

- **The card** names the place ("Walk Yaba, Lagos", "Visit home to Lagos") once the city's rules are read, after the first paint.
- **The dive behind the card** (`src/map3d/entry-dive.ts`, the path is `src/map3d/dive.ts` `entryDivePlan`): the atlas from space, then
  the country (or the continent), then the atlas's own flight down to the city under the dive's clouds, which part over it. It runs on
  its own timers and is fetched with the maps after the card has drawn (`src/app/features/start/streetEntry.ts`); the first paint and the
  startup download do not grow. Reduced motion: the atlas already over the city, faded in (300 ms). Save-data or a weak device
  (`diveTier` cut): the page's own picture, and the maps are never fetched. No WebGL, or a level that does not load: the picture stays.
- **Play never waits on the dive.** On a street it waits only for the city's content (asked for as soon as the card knows the street),
  then the life starts in that city. The dive's box is under the card, `inert`, with no pointer events and the dive's Skip hidden.
- **After Play** (a new visitor) or at once (a returning player), the city map opens on that place's local unit (a district is shown on
  the unit it lies in; a visit or an unknown place is the whole city). A returning player in another city gets the travel card, as `/<city>`.
- **Find my street** (on `/`, `/street/…`, `/visit/…`): `findCity.ts` on the device, which now also hands back the local unit the city
  pack puts the device in (an id and a name). The dive goes there and "Start in Ikeja" plays there. **Location privacy is the same rule
  as Find my city:** the position never leaves the device and is never stored; nothing at all is kept or sent until Play, and then only
  the street's ids (kept for this tab as any address is, `paths/intent.ts`); the address bar is cleaned first so the old one is not read.
- **Link preview** on both hosts (`server/path-meta.ts`): "Walk Yaba, Lagos on Allworld" / "Visit Lagos on Allworld", a description from
  the row, `/og/entry-cities.jpg`. Both hosts read the city's rules first (`preparePathMeta`, at most 1.5 s; the Worker through the asset
  binding). A place the rules do not have gives the city's visit head, with `/visit/<city>` as its canonical.
- **Share** a street: the `street` card (`docs/SHARE-CARDS.md`) from a local government's page and from a community based on a real city.

## Example advert links

- `https://joinallworld.com/shops?utm_source=instagram&utm_medium=paid&utm_campaign=sellers-oct`
- `https://joinallworld.com/services?utm_source=facebook&utm_medium=paid&utm_campaign=providers-oct`
- `https://joinallworld.com/games?utm_source=tiktok&utm_medium=paid&utm_campaign=friends-oct`
- `https://joinallworld.com/cities?utm_source=x&utm_medium=paid&utm_campaign=world-oct`
- `https://joinallworld.com/street/lagos/yaba?utm_source=instagram&utm_medium=paid&utm_campaign=street-oct`
- `https://joinallworld.com/visit/lagos?utm_source=instagram&utm_medium=paid&utm_campaign=visit-home-uk&utm_content=london-1`
- `https://joinallworld.com/politics?utm_source=tiktok&utm_medium=paid&utm_campaign=governor-oct`
