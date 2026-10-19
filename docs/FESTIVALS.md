# Festivals, owambe parties and match nights

Long-running social games keep people with themed events that come back every year. This is the calendar of multi-day festivals,
the owambe parties a player throws at home, and the watch parties at the times of real football fixtures. (Phase 16 of
`docs/agent-plans/world-alive`.)

## The festival calendar

`src/festivals/calendar.ts` holds the table and the pure functions; nothing in it makes a request. It is deliberately **not** under
`src/game/` (`vite.config.ts` sends everything there to the first download): the server, the Events app and the venue scenes read it,
and the last two load it on demand.

| Where | Festivals |
| --- | --- |
| Nigeria | Independence Day (1 Oct), Democracy Day (12 Jun), Detty December (1 to 31 Dec, with Ghana) |
| Ghana | Independence Day (6 Mar), Republic Day (1 Jul), Homowo (late August), Detty December (1 to 31 Dec) |
| Kenya | Madaraka Day (1 Jun), Mashujaa Day (20 Oct), Jamhuri Day (12 Dec) |
| South Africa | Freedom Day (27 Apr), Heritage Day / Braai Day (24 Sep), Day of Reconciliation (16 Dec) |
| Everywhere | New Year, Valentine's week (10 to 16 Feb), Christmas (23 to 26 Dec), Easter (Good Friday to Easter Monday), Ramadan evenings, Eid al-Fitr, Eid al-Adha |

* Every festival runs **at least three days** (a day either side of the holiday for the fixed ones), so every time zone sees it. The
  country's own clock decides the day (`UTC_OFFSET`: Nigeria +1, Ghana 0, Kenya +3, South Africa +2; anywhere else the game's Lagos clock).
* **Faiths are treated alike.** Christmas, Easter, Ramadan evenings and both Eids are global, have the same shape (a window, a main
  day, one main event) and the same words. When two festivals overlap, the Square is dressed by the one whose main day is nearest,
  then by id: never by faith. `calendar.test.ts` checks the shape.
* **Dates.** Fixed holidays are the governments' dates. Easter is computed. Ramadan, Eid al-Fitr and Eid al-Adha for 2026 to 2028 are
  the tabulated Umm al-Qura dates (Saudi Arabia); the real day depends on the moon being sighted and can differ by a day in a
  country, which is why the Eid windows are widened. **After 2028 the table has no row and the festival is simply not shown**, never
  guessed: add the next rows to `LUNAR`, or add them from the admin page. Homowo has no fixed date (the traditional council announces
  it); the window is the usual season and an admin can replace it. Live public-holiday data (date.nager.at, DESIGN.md Part 1) is a
  later step; this phase makes no live call.

### What a player sees while a festival runs

* **The Square's look.** The venue a new player arrives in (`publicArrivalVenue`: the first park of the city) leans toward the
  festival's two colours: the sky, the fill light and the rim light, and the lamps come up a little (`festiveLighting`, applied in
  `src/scene/venue-scenes.ts` next to the weather). No geometry is added, so it costs nothing to draw. The decision is
  `dressingFor(now, country, extras)`; the scene asks it at most every ten minutes of game time.
* **A notice line and a main event in Phone → Events** (`src/app/features/growth/EventsApp.vue`, `festivalEvents.ts`): "Eid al-Fitr,
  day 2 of 4" with the festival's blurb, and the **main event** at a set local time at the Square (17:00 to 20:00 for most; evenings
  18:00 to 21:00 for Ramadan; 19:00 to 23:00 for Detty December). A festival with `main.daily` holds it every day of its run
  (Ramadan evenings, Detty December); the others on the main day. The main event is a row like any other event: Go takes the player
  to the Square. It is not a spray event.
* **Hook for Phase 10.** `main.host` is `null`: when house agents exist, an agent id there hosts the event. Nothing else needs to change.

## Detty December, the season

Lagos, Accra and Abuja hold a full season from 1 to 31 December (WAT) on top of the calendar row: the city skin, a night out every night,
**owambe Saturdays** (a city-wide party night that sends people to throw or visit an owambe at home, below), a daily drop, the Returnee
badge and a season card. It switches itself on by the date; an admin can preview it. In those three cities the season's nights replace
the row's daily "Detty December at the Square". Everything is in [DETTY-DECEMBER.md](DETTY-DECEMBER.md).

## Owambe parties

A player throws a party in their own home (`src/festivals/party.ts` for the rules, `server/social/party.ts` for the service, the panel is
`src/app/features/visit/PartyPanel.vue` on the Home tab). It reuses home visits: guests come in through the host's door, an invitation
or a house link as always, and the party only adds what they see.

* **Start:** a title (optional, plain text) and an **aso-ebi colour** from ten. It lasts two hours and starts only while the host is home.
  Starting again while it runs changes the title and colour and keeps the end time and the roles.
* **MC and DJ.** The host names one guest MC and one guest DJ (only people inside; one role each; naming a guest for the other role
  takes the first away; a role lapses when its holder leaves). The labels show beside the names in the guest list and in the party card.
  *The DJ is a label for now:* there is no music selector for a room. When one exists the DJ would pick the room's music.
* **Spray.** Anyone inside can "spray the floor": a line in the house chat, five per guest per party, four seconds apart. **No money
  moves.** (The Square's spraying, `events.spray` in `src/game/systems/events.ts`, stays the only place where game money is sprayed.)
* **Stored:** `social.houses[host].party` (additive). Every route is under `/api/social/visit/party/{start,role,spray,end}`; the party
  rides in the `HouseView` the guests already get (`party`).
* **Hook:** the gist ledger (Phase 8) does not exist yet in this build; a big party could be noted there later.

## Match nights

Schedule only: a title and a time, never a broadcast, a stream, a link or a score (no rights to any). Two sources, `src/festivals/matches.ts`:

* **Weekly:** "Match night", Saturday 20:00 to 22:00 local, in every country with a viewing centre (a venue whose scene is `viewing`).
* **Fixtures:** a list an admin edits without a release. **It ships empty**: the dates of real fixtures are not guessed here. A fixture is an
  id, a title (3 to 60 plain characters; links, "stream" and "score" are refused), a start time within the next year, a length of
  30 to 300 minutes and optionally the countries it is shown in (none = every country).

During a match night the viewing centre is **fuller**: the background crowd's busyness gets `MATCH_LIFT` (0.45) added
(`densityFor(..., lift)`, `Ident.liftAt`, fed by `src/app/chatter/ambient.ts`). Match nights are also rows in Phone → Events.

## Editing without a release

`GET/POST /api/admin/festivals` (admin session; `docs/ADMIN.md`), kept in the `adminFestivals` collection (`server/admin/festivals.ts`):

| Action | Body | Effect |
| --- | --- | --- |
| `festival.save` | `item` | Add a festival, or replace one with the same id (a built-in id replaces the built-in: the way to fix a moon-sighting date). 3 to 60 days, two `#rrggbb` colours, a main event between two local hours, no links. At most 60. |
| `festival.remove` | `id` | Remove an added festival (a replaced built-in one comes back). |
| `fixture.save` / `fixture.remove` | `item` / `id` | Add, change or remove a fixture. At most 200. |
| `hide` / `show` | `id` | Hide a festival (built-in or added) from the calendar, or show it again. |

Every change writes one audit line. The running copy is held in memory; the page reads it from the public
`GET /api/world/festivals?city=<id>` (`{ now, city, country, extras, fixtures }`, no session, cached a minute) and runs the same pure
functions the server does. Example item:

```json
{ "id": "harvest-fair", "name": "Harvest fair", "blurb": "Stalls, music and food.", "countries": ["ke", "gh"],
  "start": "2026-11-06", "end": "2026-11-09", "focal": "2026-11-07", "colours": ["#aa5500", "#ffcc00"],
  "main": { "from": 12, "to": 16, "daily": true } }
```

## Size

All of it is outside the first download: the calendar is fetched with the Events app, the scene dresses itself through a dynamic import
of `src/festivals/client.ts` (only in the arrival venue), and the party panel is part of the lazy Home tab.

## Tests

`src/festivals/calendar.test.ts`, `matches.test.ts`, `party.test.ts`, `detty.test.ts` (spans, countries, lunar rows, the dressing decision, main events,
fixture validation, party rules), `server/admin/festivals.test.ts` (the admin route and the public feed), `server/party.test.ts` (the
party over HTTP).
