# The smaller features (Phase 19b)

Five small features from `docs/agent-plans/world-alive/FEATURES.md` (#9, #10, #15, #16, #18). None adds a byte to the first
download: every screen is a lazy component inside an app that is already lazy, and every rule is in `server/`.

## City works (#9)

One shared goal per city at a time: a clinic (300,000), a market roof (200,000) or a football pitch (150,000), in game money
(naira). Code: `server/works/works.ts` (rules), `server/routes/works.ts` (routes), `src/app/features/gist/CityWorks.vue` (the card in
the Gist app), `server/works.test.ts`.

- `GET /api/world/works?id=<city>` is public and says which work takes gifts, what stands, the order and, for a signed-in caller,
  whether they may choose the order.
- `POST /api/civic/works/give { cityId, amount, requestId }` pays through the life's `civic.treasury` pay operation (the wallet ledger
  shows "City works: Clinic"). One gift is 100 to 5,000, a player gives at most 10,000 a Lagos day, and a gift never overpays.
- `POST /api/civic/works/order { cityId, order, requestId }` is for the sitting head of the city (the people's city seat in
  [POLITICS.md](POLITICS.md)); the works are done in that order, the rest follow in the catalogue's order.
- A finished work shows as a line on the card ("There is a proper football pitch here.") and is announced in the gist (no amounts in
  the line). No new 3D assets.
- Stored: a new top-level collection `works` with an optional record per city; nothing existing changes.
- Not done: gifts of items. Only game money funds a work.
