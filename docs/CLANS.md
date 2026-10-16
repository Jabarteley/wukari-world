# Clans, ladders and city leagues

Friends first, then city pride. A **clan** is a small group under one name and colour; **ladders** turn the results the games already
produce into ranks; the **city league** adds every counted result to the player's city, so Lagos plays Accra and London every week.
The rules are pure modules in `src/clans/`; the server is `server/clans/` and `server/routes/clans.ts`; the screen is the Clans section
of the Games app (`src/app/features/games/ClansScreen.vue`, a lazy chunk).

## Clans

- A name (3-20 letters, digits, spaces, apostrophes and hyphens; the text filter applies; one clan per name), a colour from the
  festival colour list (`src/festivals/party.ts`), and a home city (the leader's home-city pin, else where they live).
- **Up to 25 people** (admin setting `clanSize`, 5-50). One leader and up to two deputies. Joining is by a six-letter code with no
  look-alike letters, or the invite link `/?table=clan-<code>`, which survives the quick start like a game link and opens the Clans
  screen on that clan; its link preview says "Join my clan on Allworld". A leader or deputy can replace the code.
- The leader can make deputies, hand the clan over, and remove a member (who cannot rejoin for a day). When the leader leaves, the first
  deputy (else the longest-standing person) leads; a clan left with nobody who can lead ends.
- **The clan chat** is a group conversation the clan owns: the usual chat rules, filter, mutes and blocks apply, and the group's own
  room (Places) comes with it. The group controls refuse a clan chat; membership follows the clan.
- **The clan's venue room.** A clan of 10 or more may hold a room in one public venue (never a home or the street): the leader stands
  there and taps "Make this place our clan room". In that venue the clan's members are seated together in one of the venue's groups
  (`server/clans/venue.ts`, read by `server/ws/rooms.ts`, which treats them like friends when placing), and that group carries the
  clan's name and colour in the venue's group list. The venue stays open to everyone else, who are seated in its other groups.
- Under-18s may join (chat rules unchanged). AI-played characters may join and always carry the AI mark, but never start, lead or
  inherit a clan, and win no war prize.

## Ladders

Built from results the games already produce: table games call `ctx.checks.gameResult` in the transaction that records the result,
and the arena raises `game-result` (`src/clans/results.ts`). A match counts once (its id), only between two or more people or agents
(never against house bots).

- Tiers Bronze, Silver, Gold, Platinum, Diamond (three sub-tiers each: III, II, I) and Master. Below Master a win is **+30**, a loss
  **-12**, a draw 0; in Master points move by rating. Each tier has a **floor**: once reached in a season you cannot fall below it.
- A player's **best 10 matches of a Lagos day** count in each game, not volume; the same two people count three times a day.
- **Seasons** of 28 days (admin setting `seasonDays`, 7-90); the next season starts with a **soft reset**: one sub-tier down in the lower
  tiers, two from Gold up, never to zero.
- **Boards**, in the order people meet them: friends, my city, my weekly group (30-50 people grouped by the hour of their first match
  of the week), my clan, my country, everyone. Agents have a board of their own and never appear on people's. An answer is the top ten
  and the player's own row, under 4 KB gzipped (tested).

## City leagues

Every counted result rolls up to the player's city (the home-city pin counts abroad, so someone in Houston plays for Lagos) and country.
A city's weekly score in a game is the sum of its best 20 players' weekly points, so it wins on strength, not head-count. Last week's
winner (at least two cities with three or more players) is written to that city's gist: "Ibadan took the week in all the games." The
league tab shares the player's city's standing.

## Clan wars

Each week a clan of 3 or more is matched with a clan of similar size and rating. Its score is the **top 80%** of its members' weekly
points (a quiet member counts 0, nobody is dropped for running out of data). The result moves both clans' ratings and is a line in the
clan card; members whose points counted in a won war (or any who scored in a drawn one) can claim a prize of game naira once
(`wallet.bonus`, never "worked for", so it cannot be given onward). AI-played members are not counted and not paid.

## Stored data

The collection `clans`, kept one entry at a time (`server/keyed.ts`): `clans[id]`, `names`, `codes`, `players[id]` (a player's clan,
per-game ladder, the day's best, the week), `boards[key]` (the top 50 of one scope), `league[w<week>]`, and `meta` (the season). Old
weeks and seasons are swept. Every field is optional on read. An erased player is taken out of every clan, board and prize list
(`server/clans/forget.ts`).

## Routes

`GET /api/clans/me`, `GET /api/clans/preview?code=`, `POST /api/clans/create|join|leave|kick|role|edit|code|venue|prize`,
`GET /api/clans/boards?period=week|season&game=`, `GET /api/clans/league?game=` (types in `src/types/clans.ts`).

## Tests

`node --experimental-strip-types --test src/clans/clans.test.ts server/clans.test.ts src/app/features/games/clansModel.test.ts`:
the maths (floors, points, soft reset, best-10, cohorts, war scores), and against a real server: making, joining, roles, the day's
ban, a new code; the venue room seating members together under the clan's name; arena results feeding the ladder with the pair limit
and the board order and size; a city league week settling into the gist; a clan war settling on the top 80% with a prize claimed once.
