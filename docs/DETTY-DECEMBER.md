# Detty December

Phase 6 of the wow plan (`docs/WOW-PLAN.md`). From **1 to 31 December, West Africa Time**, Lagos, Accra and Abuja hold a season: the
city dressed for December, a night out every night, owambe Saturdays, one thing to do each day, a **Returnee** badge for people who come
home from abroad, and a season card at the end. It switches itself on and off by the date, every year. An admin can preview it early.

| What | Where |
| --- | --- |
| The dates (and nothing else, for the entry page, the hosts and the scenes) | `src/festivals/detty-dates.ts` |
| The rules and lists: cities and venues, nights, owambe Saturdays, drops, the Returnee rule, the card, the skin plan | `src/festivals/detty.ts` |
| The page's side: the season fetch, the check-in, the venue scenes' hook | `src/festivals/detty-client.ts` |
| The props (loaded only while the season is on) | `src/festivals/detty-skin.ts` |
| The routes, the admin settings | `server/routes/detty.ts` |
| The stored shape, the profile badge, export and erasure | `server/detty/store.ts` |
| The Events app's part: rows, the notice, the drop chip, the badge, the card | `src/app/features/detty/` |
| Tests | `src/festivals/detty.test.ts`, `server/detty.test.ts`, `src/festivals/calendar.test.ts` |

## The season

* **Dates.** 00:00 on 1 December to 24:00 on 31 December, WAT (UTC+1). Accra keeps GMT, but the season is one season: it opens and closes
  at the same moment in the three cities (21:00 GMT on 31 December is already New Year in Lagos, and the season is over). Event hours are
  each city's own local hours. Out of the season nothing is shown and nothing is recorded.
* **In the festival calendar.** The calendar's `ng-detty-december` row (`src/festivals/calendar.ts`) now runs 1 to 31 December in Nigeria
  and Ghana (it was 15 December to 2 January in Nigeria only), so the Square of every Nigerian and Ghanaian city is lit in the season's
  gold and purple. In Lagos, Accra and Abuja the season's nights replace that row's daily "Detty December at the Square" (the Events app
  hides that row and its notice there).
* **Preview.** Admin → World → Settings → **Detty December preview** (`dettyPreview`, typed confirmation) turns the whole season on **now,
  for every player** in the three cities: skin, nights, drops, the Returnee badge, the card. The day is today's day of the month (19 October
  shows what 19 December will). What a preview records is kept under `preview-<year>` and never counts in the real season; a preview
  Returnee badge reads "(preview)" in the Events app and is never on a profile. Turn it off after testing; the real season needs no switch.

## What a player sees

* **The city skin** (`detty-skin.ts`), in the three cities only:
  * string lights on posts along the back and sides of the city's Square (where a new player arrives: Freedom Park in Lagos) and of the
    street-party place (Freedom Park, Accra's memorial park, Eagle Square in Abuja), in gold, purple and warm white;
  * beach-day props (umbrellas, loungers) plus lights at the day venue: Lagos's Lekki beach (Elegushi-like); in Accra, **Labadi Beach**
    as soon as Accra has that venue (`accra-labadi-beach`), until then Kwame Nkrumah Memorial Park ("Park day"); in Abuja, Jabi Lake Park
    ("Lake day");
  * coloured beams over the back of the music venue (Afrika Shrine; Accra's National Theatre; Gwarinpa Evening Garden).
  Every part is one instanced mesh with unlit colours (at most six draw calls, no lights, no shadows, no textures). A weak phone
  (`src/scene/body/gate.ts` `bodyAllowed` false: Data Saver, 2G, two cores or 2 GB) gets half the pieces. The scene asks once a minute of
  server time; when the season ends the props are taken away.
* **A night every night** (Phone → Events, and the venue): from the admin-editable list, going round by the day of December. Defaults:
  Afrobeats night, beach day, street party, amapiano and highlife night, sunset beach session, block party, live band night. **Saturdays
  are always Owambe Saturday** (18:00 to 23:00): the whole city parties at home, so the row's Go takes the player Home, where Home → Party
  starts an owambe (`docs/FESTIVALS.md`), or they visit a friend's.
* **The daily drop**: one thing to do, the same for everyone, from a list of 31 (an admin may replace it; a shorter list goes round). Shown
  as a chip ("Today's drop") at the top of the Events app. It changes at midnight WAT.
* **The Returnee badge**: "Returnee · Detty December 2026", on the profile beside the location badge (My profile, and a person's card in
  the feed). Earned when, during the season, the character is in a season city and the player's **location badge** (docs/FEED.md) is in
  a **different country** from that city's. A London badge in Lagos earns it; a Lagos badge in Accra earns it; a Lagos badge in Abuja does
  not. Without a badge the Events app says how to get one.
* **The season card**, from 24 December to 15 January (WAT) to anyone with something on it: "I did Detty December in Allworld" with
  nights out, owambes, the season cities visited and "Returnee". Drawn on the phone (`dettyCard.ts`), shared through the Allworld share
  sheet with the text and `https://joinallworld.com/detty?utm_source=share&utm_medium=card&utm_campaign=detty`. Nothing is uploaded.

## What the server records, and how it knows

`POST /api/world/detty/checkin` (the Events app on opening, and the venue scenes of the three cities at most every ten minutes and on
arrival) **reads nothing from the request body**. During the season it looks only at stored records:

* the city the character is in (`server/character.ts` `characterCity`): a season city goes on the card;
* the Returnee rule (`returneeEarned`): that city's country against the country of the location badge's city, while the badge lasts
  (90 days). The badge is a city id the player chose to show; **no position exists anywhere in this**, and the season record does not even
  keep the badge city;
* the night on now in that city, when the stored life stands at one of its venues (`canOccupyVenue`): its key goes on the card once;
* a party the player is inside as a guest the host let in, or is throwing at home, while it is on: kept as its start time, never as the
  host's id. On Owambe Saturday that also counts the night.

Stored in the collection `detty` (`players[id]`, kept one entry at a time: `server/keyed.ts`): the season key, at most three cities, at
most 62 night keys and 62 party tokens, and the Returnee badge per season. A check-in that adds nothing writes nothing. At most 20 a
minute per player. An account's export carries it; erasure (admin and account deletion) removes it.

## Addresses

* `/visit/lagos`, `/visit/accra`, `/visit/abuja` read **"Detty December in Lagos"** from 1 to 31 December (title, description, headline and
  pitch: the visit row's `december` words, `src/entry-variants.ts` `placeWords`), on the entry page and in both hosts' link previews
  (`server/path-meta.ts`), by the date alone. Other cities, streets and other months keep the visit words.
* `/detty` is its own entry variant ("Detty December in Allworld", the season's three cities); Play, or a returning player, opens the
  Events app on the season. Campaign content `detty`. Example: `https://joinallworld.com/detty?utm_source=instagram&utm_medium=paid&utm_campaign=detty-diaspora`.

## Routes

| Route | Who | Answer |
| --- | --- | --- |
| `GET /api/world/detty` | public, cached a minute | `{ now, on, preview, day, year, key, cities, nights, drops, card }` |
| `GET /api/world/detty/me` | the caller | `{ season, facts, returnee }` |
| `POST /api/world/detty/checkin` | the caller | the same, plus `added` (`city`, `returnee`, `event`, `party`) or `code: 'off_season'` |

## Admin

Admin → World → Settings (`server/admin/settings.ts`, registered by `server/routes/detty.ts`; every change is audited):

| Setting | What |
| --- | --- |
| `dettyPreview` | The season on now for everyone, for testing (typed confirmation). Off by default. |
| `dettyNights` | One night per line: `kind \| title \| from-to`, kind `concert`, `beach` or `street`; `{day}` becomes Beach, Lake or Park; local hours; at most 14. Bad lines are left out; nothing usable means the defaults. |
| `dettyDrops` | One drop per line for 1 to 31 December, plain words, no links; at most 31. Empty means the defaults. |

## Size

Nothing in the first paint or the startup download but the word `detty` in the entry addresses (`src/app/features/start/pathAddress.ts`,
+9 raw bytes). The venue scenes import the hook only for a venue of the three cities, and the props only while the season is on; the
Events app imports its part when it opens. The entry page carries its own two-line copy of the December rule (a test keeps it equal to
`detty-dates.ts`) so its chunk imports nothing more.

## Not done

* A HUD chip for the drop outside the Events app: the startup download has about 0.5 kB of brotli headroom and must not grow.
* Labadi Beach as an Accra venue (city content, `scripts/geo/`): the day venue falls back to the park until it exists.
* A server share card (`/s/<code>`) for the season card: the card is made on the phone; a server kind would sit with Phase 4's share work.
