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

## A sticker pack (#15)

Thirty text stickers in three sets (Pidgin, owambe, table games), as a last tab ("🏷️") of the emoji picker in the message box. A tap
sends one as an ordinary message, so it works wherever this message box does (groups, direct chats and house chats), and nothing new is stored. No images:
the whole pack is under 3 KB and its component is fetched when the tab is first opened. Code:
`src/app/features/messages/stickerData.ts`, `StickerPack.vue`, `EmojiPicker.vue`, `Composer.vue` (`sendSticker`).
Reactions already take any emoji (`QUICK_REACTIONS`); stickers are messages, not reactions. A pack that also works in a phone's
messaging app, and a marketplace for creators, are not built.

## Home-city pin (#16)

A player abroad picks the city they come from in the Gist app and sees a small card: its weather now and its last three gist lines.
In the Events app every event then also shows its time on the player's own clock and on the home city's clock (the first line stays
Nigerian time, as before). Code: `src/app/features/gist/HomePin.vue`, `homePinModel.ts`, `homePinStore.ts`, `EventCard.vue`,
`src/app/features/gist/homePin.test.ts`.

- It reuses the two public reads, `GET /api/world/gist?id=` and `GET /api/world/feed?id=`; the weather credit the feed asks for is
  shown on the card. It does not touch the weather of the city the player is in.
- **Kept with the character, so it follows the account** (15 October; before, it was on the device only). The pin is an optional field of the
  character's record (`SessionRecord.homeCity = { city, name, tz }`, server/types.ts): `GET /api/world/home-city` reads it and
  `POST /api/world/home-city` sets it (`{ city, name, tz }`) or removes it (`{ clear: true }`); both need a session and answer `{ home }`
  (`server/routes/stages.ts`, `server/stages/home-city.ts`). A guest character keeps it with the device's session; a signed-in character
  keeps it for every device of the account. It is shown only to its owner, never in a gist, on the map or on a profile.
- **The device copy is a cache** (`allworld.homepin` in localStorage): the card and the Events times read it at once, and the first read of the
  page (`syncHomePin`, when the Gist or Events app opens) asks the server. The server's pin wins and refreshes the cache. **Migration:** when
  the server has none and the device has one, the device uploads it once with `ifNone: true` (the server never overwrites a pin made on another
  device with an upload). Choosing or removing a pin updates the cache first, then tells the server; offline, the cache stands and the next
  sync uploads it.
- **Export and erase:** the account export (`POST /api/account/export`) lists it under `character.homeCity`. It lives in the character's
  record, so deleting the account with `erase: true` removes it with the character; deleting the account while keeping the character hands
  the character back as a guest life with its own pin, as with the rest of that life. Test: `server/auth.test.ts` ("home city"),
  `src/app/features/gist/homePin.test.ts`.
- The city's time zone is read from its rules once, when it is pinned.

## Life stages (#18): birthdays only

Opt-in birthdays. A player gives a month and a day (no year), and chooses whether friends may see it. On the day they get a greeting
in the Gist app, and friends who chose to share are named for each other. Nothing is public: not in the gist, not on a profile, not
on the map. Code: `server/stages/birthday.ts`, `server/routes/stages.ts` (`GET` / `POST /api/world/birthday`),
`src/app/features/gist/BirthdayCard.vue`, `server/stages.test.ts`. Stored in a new top-level collection `stages`; nothing existing
changes. The date is not the age the game holds for safety rules and is never compared with it.

**Passing property and reputation to a next character is not built.** A house, a stall or a plot belongs to one session's life and to
that city's record (land, rent, business, a seat in an election), and a hand-over would have to move owned things between sessions
and undo their city rules in one step; the store has no rollback, so a half-finished hand-over would lose or duplicate a house. It
needs its own design (what moves, what is undone, who agrees), so it is left for the owner to decide.
