# Share cards

A card is a link with its own title and preview picture that a player sends to a chat (WhatsApp first). It is made from public
facts only and opens the exact place for a new visitor or a returning player.

## How a card is made

1. A player presses Share (after a table win: Tables app; on a line of the public record: Politics, "Hall of Records"; later the
   city gist). The browser asks `POST /api/growth/share` with the **kind** and, for civic cards, the **record number**. It never
   sends words: the server writes them.
2. The server stores a share (`growth.shares`, as before) with its facts and answers `/s/<code>`. The same card twice on one
   Lagos day is the same link. Limits are the old ones (per-day, total, 30 days).
3. The browser builds the link `https://<site>/s/<code>?utm_source=share&utm_medium=card&utm_campaign=<kind>` (`shareUrl` in
   `src/game/share-model.ts`), the text (`shareText`, link on its own last line) and the picture, and opens the share sheet
   (`ShareSheet.vue`): the phone's own share sheet first (`navigator.share` with the picture and text), then WhatsApp
   (`https://wa.me/?text=`), X, Telegram, Copy.
4. A chat app's crawler reads `/s/<code>` (`sharePageHtml`, `server/growth/share.ts`, both hosts through `ctx.pages`): no script,
   `og:title`, `og:description`, an absolute `og:image` (1200x630). A person is sent on by a meta refresh to the landing hook.

This is the pattern the invite already used; the cards reuse it, so there is no second route family (`/s/<kind>/<id>` was not needed).

## Kinds

| Kind | Facts (all public) | Picture | Lands |
| --- | --- | --- | --- |
| `table` (win or invitation) | sharer's shown name, game, venue, table id | `card-table.png` | beside the sharer, at the table when named |
| `wedding` | both players' shown names, city | `card-wedding.png` | beside the sharer |
| `election` | one `term` line of the public record | `card-election.png` | the Governor panel |
| `news` | one `term`, `law`, `party` or `impeachment` line of the public record | `card-news.png` | the Governor panel |
| `street` | a local unit or district of a city, or a city alone, named from the city's rules; the sharer's shown name | `entry-cities.jpg` | `/street/<city>/<place>` or `/visit/<city>` (the entry page with the dive, `docs/ENTRY.md`) |
| `invite`, `house`, `missions`, `week`, `event` | as before | `allworld.jpg` | as before |

* **Weddings of residents** (Phase 20, `server/residents/bonds.ts`). `POST /api/growth/share` with `{ kind: 'wedding', wedding: '<id>' }` makes the card of a
  resident wedding that was announced in the gist and has opened (`publicWedding`): the card names the two residents' public first names and the city, never
  how close anyone was. An unknown, unannounced or not yet opened wedding answers `nothing_to_share`; a malformed id answers 400. There is still no Share button
  in the game for it (a button would need a lazy panel). Players have no marriages yet: `kind: 'wedding'` without an id still answers "nothing to share"; when
  players can marry, their rules supply `{ partner }` in `factsFor`.
* **Streets** ("Come and see Yaba on Allworld"). `POST /api/growth/share` with `{ kind: 'street', place: '<unit or district id>' }` (the
  sharer's city) or `{ kind: 'street', city: '<city id>' }` (a city alone). The server names the place from the city's rules and refuses
  one it does not have (`nothing_to_share`; a malformed id is 400). The facts carry `place` (`lagos/yaba`, or `abuja`) for the link; the card
  says nothing of where the sharer lives. Offered from a local government's page (Share Ikeja) and from a community based on a real, open
  city (Share place, `CrewsApp.vue`).
* **News is generic.** `shareMoment(kind, n)` (`src/app/features/growth/shareMoment.ts`) shares any public item that has a stable
  number. The gist feed of the world-alive phase 8 can pass its own entries through the same kind (add its reader next to
  `publicEntry` in `server/growth/share.ts`).
* **Privacy.** The headline is the sentence the Hall of Records already shows to everyone. Rulings are left out (they can name a
  person who was tried), operator entries too. No amounts of money, no ids but the sharer's public id (which the link already
  carried), no votes by person. The sharer's name has passed the text filter; every value is escaped.
* An unknown, expired or malformed code gives the general card with status 404 and a link home: never a 500.

## Pictures

`public/og/card-<kind>.png`, 1200x630, 13 to 33 KB, flat shapes with no words (the words are in `og:title`). WhatsApp does not draw
SVG, so they are PNG. Made by `node --experimental-strip-types scripts/make-share-cards.ts` (no browser, no package: shapes are
drawn pixel by pixel and written with `node:zlib`) and committed. Change the script and run it again to change a picture.

## Clips and photos from Capture (Phase 2 of the ad-ready plan)

Capture (`src/app/features/capture/`) has a **Share** button beside Download for the photo and the clip. This is not a server share card: there is no
`/s/<code>`, nothing is stored and nothing is uploaded. The file is made on the phone and goes only where the person sends it.

* **The mark.** A small pill in the lower-right corner, `@handle · joinallworld.com` (the handle from `GET /api/feed/me`; `joinallworld.com` alone without one).
  Words, size and place are pure (`captureShareModel.ts`: `markText`, `markLayout`); drawing is `captureMark.ts`. A photo is one canvas pass (JPEG out). A clip is
  played into a canvas and recorded again with `MediaRecorder`, in real time (a 30 s clip takes about 30 s; the panel says so and shows the seconds left).
  If the browser cannot (no `captureStream` or no recordable type), the clip is shared **without** the mark and the panel says so; the photo always has it.
* **9:16.** A checkbox crops the middle 9:16 for phone stories (and lifts the mark above the strip the story apps cover).
* **Type.** `video/mp4` where `MediaRecorder.isTypeSupported` says so (recent Chrome, Safari), `video/webm` otherwise. The same choice is used for the plain recording, and
  the download name follows the type. The shared `File` carries the plain type, which is what WhatsApp checks.
* **Sending.** `navigator.share({ files, text, title })` when `navigator.canShare({ files })` says yes; otherwise, or if the browser refuses, the Allworld share
  sheet (`ShareSheet.vue`, with `prepared.clip` for the video preview and Save). A long clip ends in a "Share clip now" button, because the phone's share sheet wants a fresh tap.
* **Link and text.** `clipLink`: the player's profile `/p/@handle` (or `/p/<id>`, or the front door) through `shareUrl(link, 'clip', 'share', 'clip')`, so it carries
  `utm_source=clip&utm_medium=share&utm_campaign=clip`. The text ends with the link on its own line. The profile page `/p/…` keeps those words on its "Open Allworld"
  links (`server/routes/profiles.ts`), so the landing is counted by the growth metrics under source `clip` (any `[a-z0-9_-]` word is a valid source there).
* **Clip this moment.** While a party at the player's home (or a live calendar event from the growth hello) is on, and Capture is allowed, the Capture chip offers
  **Clip 6 s**: it records 6 seconds, opens Capture on the clip and marks it, ready for one tap on Share. Capture is only ever allowed in the player's own home
  (see `captureAccess`), so the offer appears only there; nothing about that gate was loosened.
* Capture still never asks for the camera or microphone. The only request is the player's own `GET /api/feed/me` for the handle.

## Ad-source words

Every shared link carries `utm_source=share&utm_medium=card&utm_campaign=<kind>`. The page keeps the cleaned words
(`sourceQuery`, same cleaning as `src/game/attribution.ts`) on the address it sends people to; `src/quick-start/entry.ts` keeps them
for the visit and the growth counts (landed, play, game, stayed) show them under source `share`. The medium is `card` because the
channel is chosen later in the phone's own sheet; `shareUrl(link, kind, 'whatsapp')` is ready to set it per channel.

## Landing

`shareTarget` (pure, tested) writes the address a card leads to: `/?join=<sharer>&ref=<code>[&table=<id>]` or, for civic cards,
`/?go=governor&ref=<code>`. A new visitor goes through the quick start first (the link is kept on the device meanwhile) and then
arrives there; a returning player arrives at once. For `go` the landing (`landingStore.ts`) does not place the visitor beside the
sharer: it opens the panel.

## Check by hand (cannot be tested here)

Share one card to a WhatsApp chat (for example a table win to a chat with yourself) and look at the preview: the title with the
names, the right picture (not the default globe), the site name. Open the link on a phone that never played: the quick start
runs, then the table or the Governor panel opens. WhatsApp keeps a preview for a while: for a retry use a new card (a new code).
Also check one card in Telegram and in the Facebook sharing debugger if needed.
