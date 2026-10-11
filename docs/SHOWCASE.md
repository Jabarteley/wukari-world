# Showcase shops (Services)

A place where real people show real skills and services, from markets across the world, and are contacted or paid for real, outside the game. Slice 1 (and its first polish): one shop per seller, a directory, a shop page, a no-code editor, review by an operator, and a one-way release of the seller's own chat and payment links.

## The rules

- **The game never holds real money.** The seller supplies their own chat link and, if they take payment, their own payment link. Payment happens outside Allworld. A real price is always labelled "Seller's price, paid outside Allworld" and is never shown with, or added to, in-game naira or any wallet.
- **No provider is named** in showcase screens or text. The one place a destination is named is the existing "You are leaving Allworld" sheet, which prints the site and the full address so the player knows where they are going.
- **Location coordinates never leave the device.** A shop has a market (a venue that rents stalls) and a stall number, nothing more precise.
- **Links are released, not published.** The chat and pay URLs are in no card, directory page, in-game shop page or search result. A signed-in adult calls `go`; the answer goes to the leaving sheet, which opens the address with `noopener,noreferrer`. The one other place they appear is the seller's own public page (see "The public link"), reached only through the shop's unguessable address, which the seller chose to share.
- **Nothing in `src/game/`.** That folder ships in the first download. The types are `src/types/showcase.ts` and `src/types/showcase-http.ts`; the client is `src/app/features/showcase/` and loads when the app is opened.

## Who may publish

The same conditions as a real-value stall (`server/real-value/listings.ts`), plus an adult's own word:

1. A signed-in account (not a guest).
2. No held complaints (three upheld complaints in 90 days hold a seller until an operator releases them).
3. The adult answer is "18 or older" (`POST /api/growth/consent`). "Under 18" is refused with `adults_only`.
4. `trust.postBlock('stall')`: phone-checked tier or better, and the account is at least 24 hours old.

A buyer needs only a signed-in account, an adult answer of "18 or older", and no held complaints of their own.

## Data model

A server-only collection `db.showcase` (`server/showcase/data.ts`), kept per entry in the keyed layout (`server/keyed.ts`): `shops`, `owners` and `contacts`.

- **Shop** (`ShowcaseShop`, one per owner): id `SC-n`; owner; city; venue (a market); slot (1 to 24, unique per market, first come first served); name 3 to 40; category (salon, tailor, tech, food, beauty, photography, repair, tutoring, crafts, cleaning, events, other); template (classic, bold, fresh, night, craft, plain: colours, icon and layout, no art); two palette colours; sign up to 24; logo (an icon id); about up to 400; up to 12 services of label up to 40, `priceNaira` a whole number from 0 to 100,000,000, and a note up to 80; seven days of hours (open and close, or closed); chat `{kind, url}`; pay `{kind, url}` or none; photos; status; `reviewedAt`; `payChangedAt`; `reapprove`; `revision`. At most 2,000 shops.
- **Owner record**: the shop id, and the day's upload count.
- **Contact event** `{id, shop, buyer, kind, at}`: written by `go`. At most 5,000, pruned after 90 days. A later slice binds reviews to it.
- **Photos**: bytes are in a second image store, `ctx.showcaseImages` (Node: `DATA_DIR/showcase-images`; Worker: the table `showcase_images`). The chat picture store drops everything older than 30 days and then the oldest over its ceiling whatever the conversation, so showcase photos could not share it. This store never evicts: its `trim` removes nothing and an upload past the ceiling is refused with `picture_store_full`. The ceiling is 100 MB for all showcase photos together; `SHOWCASE_IMAGES_MAX_MB` changes it.

## Writing and screening

- Every text (name, sign, about, each service label and note) goes through the fee screen, the global text filter with contact checks (links, phone numbers, e-mail addresses, handles on other apps), and the home-address check. The global filter is not weakened. A body with any key the form does not have (a fee, a phone, an address, a wallet) is refused.
- The chat link must be an allow-listed chat site, the pay link an allow-listed payment site (`src/game/trust/links.ts`). A link of the wrong kind, another host, a look-alike host or a path outside the allowed paths is refused (`chat_link_not_allowed`, `pay_link_not_allowed`). The pay link is optional.
- Photos are 150 kB each at most, 3 to 6 per shop, 10 uploads a day. The browser shrinks and redraws them (dropping all metadata); the server parses the bytes again with the chat picture parser, rewrites them without metadata, and stores that copy.

## Lifecycle and moderation

`draft` (saved, not shown) → `review` (submitted with at least 3 photos) → `live` (an operator approved it once). A seller can set a shop `hidden`; an operator can set it `held`.

- First publish waits for an operator. A new shop's photos are not public until that approval; photos added later are public at once.
- Later edits are live at once, except a change of **name**, **chat link** or **pay link**, which returns the shop to `review` (it leaves the directory until approved again).
- A changed pay link shows "Payment details changed recently" on the shop page for 7 days.
- Two distinct players reporting one photo hide it from everyone but its owner until an operator decides (restore or remove).
- A shop shows only while its owner can still publish (no held complaints, session valid).

## Routes

Public and signed-in routes, under `/api/showcase/`:

| Route | Who | What |
| --- | --- | --- |
| `GET directory?city&venue&category&q&after` | anyone | cards, newest first, 20 a page; `q` searches name, sign and services; `after` is the last id |
| `GET :id` | anyone | one shop page (the owner also sees their own unapproved shop) |
| `GET photo/:id` | anyone | photo bytes; public photos of live shops, all of the owner's own |
| `GET mine` | account | your shop with your own links, status, `blocked` (the refusal you would meet), `uploadsLeft` |
| `POST mine` | publisher | create or edit: `{clientId, expectedRevision, ...shop}`; `expectedRevision` is 0 to create |
| `POST mine/photos` | publisher | `{clientId, type, data}` (base64) |
| `POST mine/photos/arrange` | publisher | `{clientId, order, captions?}`: `order` lists every photo id once (first is the cover); `captions` maps a photo id to a caption of at most 60 characters (empty clears), screened like all shop text |
| `POST mine/photos/remove` | publisher | `{clientId, photo}` |
| `POST mine/submit` | publisher | draft to review |
| `POST mine/hide` | publisher | `{clientId, hidden}` |
| `POST mine/remove` | owner | deletes the shop and its photos; frees the slot |
| `GET entry/:token` | anyone | the shop id behind a public address (404 `shop_unavailable` otherwise); 30 a minute per address |
| `POST mine/share` | owner | the public address of a live shop, made once: `{ok, path}`; `not_published` otherwise |
| `POST :id/go` | signed-in adult | `{clientId, kind}` where kind is `chat` or `pay`; returns `{link, badge, warning}`; 10 a day per buyer; records one contact event |
| `POST :id/report` | account | `{clientId, reason, note?, photo?}`; files a trust report, and votes to hide a photo |

Every write carries a `clientId` (exactly once: a repeat returns the first result with `duplicate: true`) and is rate limited.

Operator routes (token in `Authorization: Bearer`, 404 unless the server has `MODERATOR_TOKEN`):

- `GET /api/mod/showcase` returns `{queue, shops}`: shops in `review` and shops with a hidden photo, with each shop's text, photo ids and destinations.
- `GET /api/mod/showcase/photo/:id` returns the bytes of any showcase photo.
- `POST /api/mod/showcase` with `{action, shop, photo?, reason?}`; `action` is `approve`, `hide` (sets `held`, `reason` shown to the owner), `restore`, `photo-restore` or `photo-remove`. Each is written to the moderation audit.

There is no screen for this in the admin shell in this slice: the routes are the operator interface.

## What a buyer and a seller see

Files are in `src/app/features/showcase/`. The shop is drawn from one shared set of parts, so the editor's preview and the shop page are the same thing.

- **Shopfront** (`StorefrontCard.vue`): the template's awning, sign, logo, name, kind, market and city, whether the shop is open now (with "opens at ..."), the trust badge, and in the directory the cover photo and the "From" price with its label. `size="header"` is the top of the shop page.
- **Shop page** (`ShopPage.vue` around `ShopFront.vue`): the shopfront, a photo gallery (the cover large, the others in a row that swipes sideways; a larger view with Previous and Next, arrow keys and a swipe; alt text is the seller's caption, else the shop's name and the photo number), About as prose, the price list (label, a note on its own line, price right-aligned; the "Seller's price, paid outside Allworld" line is shown once), the week with today marked, and a Chat and Pay bar fixed to the bottom of the screen. The bar goes through the same leaving sheet as before; a guest gets the sign-in prompt and an undeclared adult gets the age question, both inside the bar.
- **Open now** is worked out in the shop's own time zone (its city's, and Nigeria's until a city says otherwise), so a buyer far away reads the shop's day. A day whose closing time is not after its opening time runs past midnight. The server still requires closing after opening, so a shop cannot yet set an overnight day; the display handles it for when it can.
- **Editor** (`ShopEditor.vue`): six steps (Look, About, Services, Hours, Photos, Contact and payment) with a jump bar; the preview sits beside the form on a wide screen and behind a "Preview my shop" switch on a phone. A refusal shows beside the field it is about (`FieldRow.vue`: `aria-invalid`, `aria-describedby`, `role="alert"`), the first problem gets the focus, and a summary of what to fix sits by the Save button. A refusal of wording does not say which text it was, so the editor looks for the shape that was refused and otherwise puts it on About.
- **Staying in step**: an approval (or any other change the server makes) moves the shop's revision. The editor refreshes on focus, on opening and before every save, and keeps the seller's unsaved text. Only the same part changed on both sides is a conflict; then a banner offers "Load the latest", which takes the server's version of everything the seller did not touch and keeps what they typed.
- **Photos** (`PhotoManager.vue`): a styled button (the file input is hidden), a tile per photo on its way (getting it ready, uploading, or why it was refused), the first photo marked Cover, "Make cover", Earlier and Later, a caption of at most 60 letters (screened like all shop text) and Remove. Order and captions are one write, `mine/photos/arrange`.
- The Services app has its own icon (`showcase` in `src/ui/phone/icons-more.ts`).

## Operator steps to seed a seller

1. The seller signs in, answers "18 or older" (the My shop screen offers it), and waits 24 hours.
2. An admin sets the phone-checked tier by hand: `POST /api/admin/trust/players/<player id>/act` with `{"clientId": "...", "action": "verify", "tier": "phone", "reason": "..."}`.
3. The seller saves their shop in Services, adds at least 3 photos and sends it for review.
4. The operator lists the queue (`GET /api/mod/showcase`), looks at the photos (`GET /api/mod/showcase/photo/:id`), and approves: `POST /api/mod/showcase` with `{"action": "approve", "shop": "SC-1"}`.

## Limits

2,000 shops; 24 stalls per market; 12 services; 3 to 6 photos of 150 kB; 10 photo uploads a day per seller; 10 `go` calls a day per buyer; 5,000 contact events for 90 days; 100 MB of photos.

## Not in this slice

Reviews (the contact event is kept so a later slice can bind a review to a real contact), follow or save, seller statistics, a market night, and booking.

## The public link

A published shop (`live`, its owner still able to publish) can be shared. Nothing about who may publish changed: the same account, adult, phone-checked, one-day-old and no-complaints gates, three photos at least, and an operator's approval come first. Before that, "Share my shop" in the editor says what is still needed and offers no link.

- **Address**: `/shop/<name>-<token>` (`src/types/showcase-link.ts`). The token is 8 random letters and digits (31 characters, no look-alikes), made by `POST /api/showcase/mine/share` the first time the seller shares, and kept on the shop as `pub`. It is not the `SC-n` id, which is listed in the directory and counts upwards. Only the token finds a shop; the name part is for people reading the link, so renaming the shop keeps the old link working. The token is in no directory, card or shop payload except the seller's own `mine`.
- **Page**: `server/showcase/page.ts`, served for the `/shop/` prefix through `ctx.pages` by both hosts (the Worker sends the prefix to the object, `PAGE_PREFIXES`). One HTML document, style inline, no script, no cookie, no session read, never cached by a shared cache. It shows the name, kind, market and city, the phone-checked badge when there is one, the first photo, the seller's about text, every item with the seller's price, the other photos, the week's hours, and the seller's own chat link as **Message the seller**, on the shop and on each item, with the first words filled in (`?text=` for a chat link of the wa.me kind, a subject and body for an e-mail address, nothing for a phone number or another messaging link). A pay link, when there is one, is **Pay the seller**, with the "Payment details changed recently" notice for a week. The page says "You deal directly with the seller. Allworld takes no orders and never holds or moves your money." and repeats the safety line. Only https, tel and mailto addresses are ever written, checked again when the page is made; every other scheme is dropped. External links open with `rel="noopener noreferrer"`.
- **Preview**: `og:title` (the name), `og:description` (kind, city and the start of the about text), `og:url`, `og:image` (the first public photo at least 300 px wide, else the site's image) and the Twitter tags are in the HTML. Every value is escaped; a colour that is not `#rrggbb` is replaced and an origin that is not an origin is dropped.
- **Not available**: an unknown or malformed address, a shop that is hidden, in review, held or removed, or whose owner can no longer publish, all answer the same plain page ("This shop is not available", 404) with a button into the game.
- **What is not on the page**: player ids, the shop id, coordinates, online state, counts. There is no per-visitor record. The public read is limited per address (60 a minute for the page, 30 for the entry lookup).
- **Step inside**: a link to `/?go=shop&shop=<token>`. The game keeps the token with the `go` on the device, the visitor starts as a guest the usual way, and the landing asks `GET /api/showcase/entry/:token` for the shop's id and opens the Services app on that shop's page. The tour is not shown over it (it waits for the Services app to close, as it does for any open sheet). A guest cannot chat or pay from inside the game (that needs an account); the public page is where a customer messages the seller. The game has no 3D shop interior or stall model: what the visitor sees in the game is the shop's page in the Services app over the world, and the shop's stall in its market. The visitor is not moved to the shop's city.

## Tests

`server/showcase.test.ts` (Node host), `deploy/showcase.edge.test.ts` (Worker host in Miniflare, every store layout), `src/app/features/showcase/showcase.test.ts` (client model, the clock, conflicts, field problems, photo order and registration), `src/app/features/showcase/showcaseComponents.test.ts` (the shopfront and the shop page parts, rendered), and `server/registry.test.ts` (the two namespaces), `src/types/showcase-link.test.ts` and `server/showcase/page.test.ts` (the address, the messages, the link checks, the page and its escaping), the public-link tests in `server/showcase.test.ts`, and the journey `scripts/journeys/shoplink.ts`.
