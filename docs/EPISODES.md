# The weekly city episode

Each week every city has a one-screen recap people can share: "This week in Lagos". It is built from facts that are already public, when it
is asked for, and stores nothing of its own. Code: `server/gist/episode.ts` (the builder), `server/gist/episode-page.ts` (the page),
`server/routes/gist.ts` (the page and the route), `src/episode/text.ts` (the words under the lines), `src/app/features/gist/EpisodeCard.vue` (the card).

## What an episode holds

For a city and a Lagos week (Monday to Sunday), `buildEpisode` returns:

| Part | Where it comes from |
| --- | --- |
| `lines` (at most 5) | the city's own gist lines of that week (docs/GIST.md): so a minor is "a resident", nothing private, and no amount unless a law of the public record shows it |
| `league` | the city's place among the cities with a score in the weekly city league (docs/CLANS.md), and the winner once the week settled (otherwise who leads so far) |
| `office` | the latest term of the city's top seat on the public record (docs/POLITICS.md), only when the holder is a confirmed adult who has not hidden themselves |
| `stalls` | the number of "opened a stall" lines of the week |
| `quiet` | fewer than two lines: the headline is "A quiet week in Ibadan" and nothing is invented |

**Choosing the lines.** Lines are ranked by class, biggest first: election, removal, law, new business, the league winner ("Lagos took the week
in all the games.", the gist line the league writes when a week settles), festival, party, arrest, notice, owner note, other, busy. Phase one takes
the newest line of each class in that order; only when that leaves fewer than five does phase two add a second line of a class. The same text
shows once. A line that names an AI character carries `ai: true` (the ledger sets `refs.ai = 1` when it is added: a flag, never an id) and
the page and card show the AI mark; the office holder has it too.

## Where

* **Page** `/episode/<city>` (this week so far) and `/episode/<city>/<monday>` (a past week, `2026-10-05`; the current week and the seven before it
  are accepted, anything else is a 404). Small HTML, no script, no cookie, written by the server (a `ctx.pages` page on both hosts: Node and the
  Worker, whose `PAGE_PREFIXES` lists `/episode/`). Title "This week in Lagos", the top line as the description, Open Graph and Twitter tags with the
  game's card image, a button "Open Allworld" to `/?ref=episode`. A quiet week is `noindex`. Cached five minutes by the host. Limited per address.
* **Route** `GET /api/world/episode?id=<city>[&week=<monday>]`: public, `{ episode }`, cached five minutes (types in `src/types/world.ts`).
* **In the game** the Gist app shows the card "This week in <city>" at the top with the lines, the league place and a Share button that sends
  `/episode/<city>` through `shareAddress`. It is a lazy chunk fetched when the Gist app opens.

## Limits

* The ledger keeps 14 days, so the lines of a past week are there for about one more week; the league keeps eight weeks. An older week's page is
  built from what remains (usually the league place and the office, and often "a quiet week"). Nothing is stored to keep episodes longer: that
  would add a collection of public lines per city per week, and it can be added later if the owner wants the full eight weeks of words.
* No closing line ("Last week in Lagos: ...") is written to the gist: the league already writes its winner line when a week settles, and a second
  line a week per city would only repeat the page.
* Matches played are not counted (no cheap public number exists); the stall count comes from the gist.
