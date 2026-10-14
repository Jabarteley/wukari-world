# Money in the city's own currency

Phase 5 of the "world alive" programme. The code is `src/game/money.ts` (pure, no imports), the table is `src/game/currency.ts`
(Phase 4, only the server reads it), the rates come from the world feed (`docs/WORLD-FEED.md`).

## What a player sees

In a city outside Nigeria the amounts on screen are written in that city's money at the day's real rate: £3.40 in London,
GH₵ 45.00 in Accra, KSh 12,000 in Nairobi, ¥1,500 in Tokyo. In Nigeria, and whenever the rate is not known yet, the text is
exactly what it always was: ₦5,000. Pressing (or hovering on) the main amounts (the top bar cash, the bank balance, shop, grocery
and car prices) shows "≈ ₦5,000", the naira value. The launch bonus and the welcome words use the same writer, so a visitor in
Accra reads the bonus in cedis.

## What does not change

The game's unit is still the naira. Every stored amount, every number a rule computes and every amount sent to the server is in
naira. Only displayed text is converted. Text already written into data (a notification, a message) stays as it was written.
Inputs labelled "(₦)" are still in naira. Text a server service builds has no city (the server never sets a display city) and
stays in naira; messages that go out to other people (share cards) also stay in naira.

## How it works

- `money(amount, cityId?)`: converts naira to the city's currency with `amount / NGN-per-USD * CUR-per-USD`; `cityId` defaults to the
  display city. No display city, a Nigerian city, or no rate: the old naira text, byte for byte.
- Rounding: whole units from 100 up and for money with no minor unit (yen, shilling-like), two decimals below. A non-zero amount is
  never written as zero: it shows the smallest unit (£0.01). A symbol of two or more letters gets a space (KSh 1,200, GH₵ 45.00).
- Frozen for the day: `setCityMoney(city, money)` keeps the first rates of a feed day and replaces them only when the day changes,
  so a price does not move while a player looks at it.
- The holder: `src/game/money.ts` keeps each city's money. The browser fills it from `GET /api/world/feed` (`takeFeed` in
  `src/app/features/world/worldFeed.ts`, which also sets the display city to the city the player is in); the server fills it in
  `answer()` of the world-feed service. The feed answer carries `currency: { code, symbol, decimals }`, so the browser needs no table.
- Callers: `naira()` (`src/game/util.ts`) and the UI `money()` (`src/app/ui/format.ts`) both call it, so the ~300 call sites move
  without change. The UI `money()` also reads a counter that the holder bumps, so a template draws again when rates arrive.
  `moneyHint(amount)` is the title text for "≈ ₦…". The short forms (`compactMoney`) follow the city too.
- First paint: until the feed answers (about 1.5 s) amounts are in naira, then they switch to the city's money.

## Tests

`src/game/money.test.ts` (Nigerian byte-identical, rounding, decimals, smallest unit, day freeze, display city, short form, junk
answers), `src/app/features/world/worldFeed.test.ts` (the phone's feed fills London, Accra and Nairobi),
`server/world-feed/world-feed.test.ts` (the route answers the currency for Lagos, Accra, Nairobi and London).
