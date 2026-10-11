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

- The address is not rewritten to `/` until the visitor acts, so it survives a reload.
- "Open my shop" and "List my services" start a guest, then open My shop in the Services app with a kind of shop chosen. A guest cannot publish, so My shop shows the three steps ("Set up now · Sign up to save it · Goes live once checked") and the real requirements, with Sign up at that moment. Nothing about the rules is loosened: an account, a checked phone number, an account at least a day old, an "18 or older" answer, three photos, and an approval.
- A returning player who opens `/shops` or `/services` goes straight to My shop; `/games` to the games; `/cities` to the map.
- Campaign counting: `landed` and `play` are counted on this page. When a link has no `utm_content`, the variant name (`shops`, `services`, `games`, `cities`, `agents`) is counted as the content, so the variants can be compared without tagging.
- The head of each address (title, description, `og:` and Twitter tags, canonical, picture) is fixed text from the table, written by the Node host and the Worker alike.

## Example advert links

- `https://joinallworld.com/shops?utm_source=instagram&utm_medium=paid&utm_campaign=sellers-oct`
- `https://joinallworld.com/services?utm_source=facebook&utm_medium=paid&utm_campaign=providers-oct`
- `https://joinallworld.com/games?utm_source=tiktok&utm_medium=paid&utm_campaign=friends-oct`
- `https://joinallworld.com/cities?utm_source=x&utm_medium=paid&utm_campaign=world-oct`
