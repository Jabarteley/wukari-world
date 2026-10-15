# City texture (Phase 17)

Small written touches that make a city feel lived in: the ride, the light, the market. Nothing here uses a model, and none of it
shows a city only as danger or scams.

## Rides with life

During a trip the Map's trip bar shows one written line at a time under the progress bar (`src/app/features/travel/RideBanter.vue`):
the conductor, the driver, the radio, or a thing you notice. The lines are in `src/app/features/travel/ridePacks.ts`, loaded on the
first trip.

- **A pack per city.** `LAGOS` (danfo, okada, keke, cab, trek), `ACCRA` (tro-tro, keke, okada), `NAIROBI` (matatu, boda, tuk-tuk) and
  `SOUTH_AFRICA` (minibus taxi; serves Johannesburg, Pretoria, Cape Town, Durban, Soweto) all ride the game's `danfo` mode, so the
  pack is chosen by the city and the mode id. A city or a mode a pack leaves out uses `GENERIC`. A walk or a train has no lines.
- **Chosen by route and time of day.** A line may carry `when` (morning, midday, evening, night, in the city's own clock) and `near`
  (words in the from/to names, such as "Oshodi"). Route lines come first, then time-of-day lines, then the rest.
- **Never repeats in a trip.** The same trip gives the same lines on every device (seeded), one line for about four seconds
  (2 to 6 lines), and the bar picks the line by how far along the trip is. Between cities the trip uses the city it left.
- **Radio is words about a song** ("an Afrobeats bass line rolls in"), never lyrics. A test keeps danger and scam words out of every pack.
- **Add a city:** add a `RidePack` to `PACKS` with the city ids it serves and its hours ahead of UTC. Aim for 8 or more lines per mode.

BRT has no mode of its own in the game yet, so it has no pack; its lines can join the `danfo` list when a mode exists.

## Power cuts, generators and inverters

These already existed (docs/REALISM.md section 8): `src/game/conditions/grid.ts` makes a district's cuts from the city, the day and
the district (about 55 days in 100, 1½ to 4 hours, mostly evenings); a Small Petrol Generator (₦150,000) burns petrol (₦900 a litre,
Phone → Groceries); an Inverter & Batteries (₦600,000, silent, no petrol) carries the room. Phase 17 adds:

- **The published plan.** Phone → Groceries shows "Light plan for Yaba. Today: 5PM to 7:30PM. Tomorrow: no cut planned." from
  `src/game/conditions/power-schedule.ts`. It is the grid's own list, so the plan IS what happens, a day ahead, the same on every host.
- **A line for each kind of room** when a cut starts (`power-words.ts`): the inverter takes over without a sound, the generator
  "coughs, then roars" (the noise line), and a room with neither is told "Phone torch on. Good time for gist."
- A cut only affects the home's own bonus and needs. It never blocks chat, visits, travel or any action (tested).
- There is no separate solar item: the inverter is the quiet, dearer choice. A solar kit would be a new furniture item with its own
  model in the home scene; it was left out to keep the scene chunk inside its limit.

## Market haggling

Phase 10's haggling (`server/house/haggle.ts`: the floor is in code, never from a model) is unchanged and not duplicated. It sells a
held quote only (`HAGGLE.quoteMs`); turning an agreed quote into a purchase needs the wallet, the item hand-over and the quote store,
which Phase 11 (missions from agents, `claude/alive-p11-missions`) is building for hand-overs. It is left to that phase on purpose.

## Try it in a play-through

1. **A Lagos commute.** Open the Map, pick a far place (try one with "Ikeja" or "Oshodi" in the name), go by danfo, then by okada and
   keke. Read the lines on the trip bar; make the same trip morning and evening. Walking has none, by design.
2. **A power cut.** Open Phone → Groceries and read the light plan. When a cut starts you get a notice; with a generator and petrol
   or an inverter placed the notice has the loud or the quiet line. Walk out and talk to people during the cut: nothing is blocked.
3. Look for lines that fall flat, that a Lagos reader would find wrong, or that you wish were longer; tell us.

Tests: `src/app/features/travel/ridePacks.test.ts`, `src/game/conditions/power-schedule.test.ts` and `src/game/conditions/home-power.test.ts`.
