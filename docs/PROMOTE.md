# Allworld for Business: free listings, cheap boosts

The owner's idea of 18 October 2026: welcome businesses and services, and charge far less for advertising than in-game billboards cost
elsewhere (₦50,000 a week was recorded in [REAL-VALUE.md](REAL-VALUE.md)). This is Level L1 of that page ("paid visibility"): Allworld
sells advertising to businesses. It does not pay players or hold their money. The public page `/money` (`server/money-page.ts`, linked from the Bank panel and
the privacy page) says so in plain words for players: what game naira is, what real money exists and who holds it. Change it when this page changes.

Code: `src/promote/model.ts` (rules), `src/promote/boards.ts` (billboards), `src/types/promote.ts` and `src/types/neighbourhood.ts` (wire
shapes), `server/promote/service.ts`, `server/routes/promote.ts`, `server/routes/promote-admin.ts`, `src/app/features/promote/` (the
Businesses app, the shop-front card and the Sponsored card), the admin card `src/app/features/admin/PromoteAdmin.vue`. Tests:
`server/promote.test.ts`, `src/promote/boards.test.ts`, `src/map3d/map3d.test.ts` (the board's chip).

## What a business gets

| | Price | What |
| --- | --- | --- |
| Listing | free | In its city's Businesses directory: name, kind, area, description and a photo. People message the owner in the game and visit their Services shop when they have one. |
| Boost | ₦2,500 a week | A Sponsored card in the city's feed (after the first post, and after the sixth), the top of the directory and the business street, and a place on the city's billboards. |
| Spotlight | ₦7,500 a week | Boost, plus a Sponsored card in the World feed of every city (its billboards are its own city's, as for a Boost). |

Prices are admin settings (`promoteBoostPrice`, `promoteSpotlightPrice`). One to eight weeks at a time. Up to two Sponsored cards a page,
taking turns by the minute; each is marked Sponsored and opens the business inside the game, never an outside link. The admin card counts
how often each boost was shown and how often a listing was opened (numbers only).

## Billboards and the business street (WOW-PLAN Phase 5, no new price)

A running Boost or Spotlight also shows on the billboards of its own city's map, and every live listing stands in the city's business street.

- **Billboards.** With the Map's Billboards layer on, the Map panel also reads `GET /api/promote/boards?city=` (public, no session): the city's
  live listings with a running boost, name, kind, area and photo only (never the description), rotating every ten minutes (`BILLBOARD.rotateMs`),
  at most 24. `src/promote/boards.ts` `fillBoards` puts them on the **free** boards of `GET /api/civic/ads`: a board a player rented with game
  naira is never replaced, and a free board with no business still says "for rent". The 3D map, the flat 2D map and the tile map draw it the
  way they draw any board (a few boxes; the photo is a small lazy image on the board's chip, nothing is added to the 3D scene), and a tap on the
  chip opens the business in the Businesses app (the chip is a button that raises the window event `jaw:map-business`; each of the three renderers carries its few lines itself, so no shared chunk joins the first download's list). A tap on a board is counted as a tap
  (`POST /api/promote/contact { listing, via: "board" }`, `boardTaps` on the admin's listing rows); a message or a shop visit from a shop front is
  a contact that says it began in the street (`via: "street"`, `streetTaps`, on top of `contacts`).
- **Where.** The city maps are where the game already has billboards (beside the venue each board is `near`). The scenes inside a venue and the
  street-level scenes have no billboard props today, so there is nothing there to fill; a board prop in a scene would take the same
  `GET /api/promote/boards` list.
- **Never a listing that failed the rules.** Only `live` listings are shown, so a listing the reviewer refused, one an admin removed, one edited
  and waiting to be read again, or one whose boost ended, is off the boards at once (a refusal also ends its boosts, as before). On top of that,
  `boardSafe` keeps nightlife, alcohol, gambling and "18+" words (bar, club, lounge, liquor, wine, casino, betting, vape, adult…) off the boards,
  because boards are where young people pass: such a listing is still in the directory and the feed, only not on a board.
- **Business street.** `GET /api/promote/street?city=` (public): every live listing of the city in a **shop-front card** grouped by kind, boosted
  first and then newest, up to 12 a kind. It is the Businesses app's "Business street" tab (`ShopFront.vue`), also where a billboard tap lands
  (that business first). A card opens the business in the game: a message to the owner, and their Showcase shop when they have one.
- **No WhatsApp or other outside link.** The listing rules above are unchanged and do not allow phone numbers or links in a listing, so a shop
  front has none; a business that wants an outside link keeps it in its Services (Showcase) shop, which the card links to.

## Rules

- **Who**: a signed-in account (so the business stays its owner's) of someone confirmed as 18 or older; three listings each.
- **Words**: the game's text filter with phone numbers, links and handles refused; outside links stay in the Services shop.
- **Review first**: every new or edited listing is read by the AI reviewer (`server/feed/review.ts`, with the advertising rules) before
  it is live. Refused: betting and lotteries; loans and "quick cash"; crypto, forex, investments and "double your money"; network marketing
  that asks for money; adult services; drugs, weapons, tobacco and vaping; prescription medicine and miracle cures; fake documents; selling
  to children. A refused listing tells its owner why; editing sends it back for review. When no model can answer, the listing waits and is
  tried again every five minutes (three times), then an admin decides in the Businesses card.
- **Takedown**: an admin can remove a listing at once; that also stops its running boosts.

## Payment

Paid to Allworld, never to a player:

- **Card, transfer or mobile money (Bachs)**: when the host has `BACHS_API_KEY` (the owner's Bachs key, set as a Worker secret; a
  `sk_sandbox_` key uses the sandbox), a boost opens a Bachs hosted checkout (`checkout.bachs.io`) with an e-mail the business types for
  its receipt, keyed by the order's reference. On return (`/?promote=<reference>`), and on the heartbeat for two days, the server asks
  Bachs itself about the checkout and its payment and starts the boost only for a succeeded payment in naira of at least the order's
  amount. The key never leaves the server (`server/payments/bachs.ts`, shared with [EARN.md](EARN.md)). A boost bought while another runs starts when that one ends.
- **Bank transfer**: without the key, and when an admin has written the bank details (`promoteBankDetails`), the business gets those
  details and a reference; an admin presses Mark paid once the money is in.
- **Closed**: with neither, listings are still free and live, and boosts say "open soon".

An optional advertising approval number (ARCON) can be given with an order and is shown to admins.

## Before taking money (owner decisions)

The research in REAL-VALUE.md lists what should be in place before advertising is sold: a registered company (CAC), VAT registration (VAT
on advertising, 7.5%), a lawyer's note on ARCON vetting of adverts, a published refund policy, and the Bachs merchant account in the
company's name. None of that is something code can do: the switches above stay off until the owner turns them on.

## Stored data

Collection `promote` (keyed): `listings[id]`, `orders[id]`, `owners[publicId]` (their listings and orders), `cities[city]` (listing ids);
root `seq`, `refs` (open orders by reference), `revenue` (all and by month). An order keeps the receipt e-mail only for a card payment.
Erasure removes a person's listings and open orders; a paid order stays as the record of a sale, without the person or the e-mail.
