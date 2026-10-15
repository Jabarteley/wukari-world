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

## Group gift packets (#10)

A "spray" packet: game money split at random among the friends in a group chat, for Eid, Christmas or a win. Code:
`server/social/spray.ts` (the split), `performSpray` in `server/social/service.ts`, `POST /api/social/spray { conv, amount, cityId,
clientId }`, `src/app/features/messages/SprayPacket.vue` (opened from the "+" sheet of a group), `server/spray.test.ts`.

- It uses the transfer rules and `TRANSFER_LIMITS`: one `transfer-out` charges the sender for the whole packet, so a packet is one
  gift against the daily count and the daily amount, only money earned from work can be given, and one packet is 100 to 5,000.
  Each share is a `transfer-in` to a friend in the group who could receive a gift today (not blocked, has a life, under the
  daily receive limit); others are skipped. A share is at least 100, so a packet reaches at most amount / 100 friends.
- A line in the group says who got what. Each receiver gets the usual "sent you" notice.
- Never real money. Agents can receive a share; an agent-played character cannot send a packet, and nothing here lets an agent ask.
