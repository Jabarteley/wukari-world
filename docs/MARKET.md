# Allworld Market

The Allworld Market is a play-money commodity exchange with one market in each city. A player opens it from Phone → Market, deposits game naira into that city's market account, and buys or sells city commodities such as rice, garri and petrol. Prices follow a reference price that moves through the day and through calendar events. Everything is game naira. Nothing here can take in, pay out or stand in for real money.

This document is the design and the numbers. The decisions come from [`crypto-token-research-2026-10-13/PHASES.md`](crypto-token-research-2026-10-13/PHASES.md), and the reasons from [`crypto-token-research-2026-10-13/README.md`](crypto-token-research-2026-10-13/README.md). The money rules for every level are in [REAL-VALUE.md](REAL-VALUE.md). Status: design, 13 October 2026. Phase 1 of the plan.

| What | Where |
| --- | --- |
| Commodities, reference prices, events, limits | `src/game/content/market.ts` |
| The price walk, the book, the market maker, the fee, the caps (pure) | `src/game/market-model.ts` |
| The shared record, the matching, the routes | `server/market/` |
| The wire types, the stored record, the route contract | `src/types/market.ts` |
| The Phone app | `src/app/features/market/` |
| The Help entry | `src/app/features/help/HelpBody.vue` |

## 1. What it is

**A market is shared state, one per city.** Each city has its own commodities, its own reference prices, its own order book and its own record of who holds what. A player's market account exists in each city they trade in. This is why the market is the same on every device, and why two buyers cannot both take the last of a commodity.

**It is a simulation.** The screens say so on first open. Every price, fill and balance is in game naira and stays in the game. The copy never says "earn", "invest" or "profit" (see section 11).

## 2. Decisions

These were accepted as recommended in Phase 0.

| # | Decision | Why |
| --- | --- | --- |
| D1 | Commodities, not a coin. Rice, garri, beans, palm oil, cement and petrol. | They fit a Nigerian life-sim, their prices can follow in-game events, and they do not look like a crypto launch. A coin invites confusion with a real token. Shares in player stalls tie prices to other players' businesses and invite manipulation. |
| D2 | One market per city. Cash and holdings sit in that city's account. | Price differences between cities are arbitrage through travel, as `BUSINESS.md` already allows for traders. There is no transfer between cities, so there is no new way to move value. |
| D3 | Everyone may trade, including players under 18. | There is no real money in the market, so the age rules for money do not apply. |
| D4 | The public tape shows a public character name, or "Anonymous trader" if the player chose that. Never an id. | The tape shows what happened without showing who a player is in the real world, and a player can hide behind the label. |
| D5 | Market gains are not earned from work. | Otherwise the market would open a new way to move money. Shop takings are treated the same way in `BUSINESS.md` §5. |

## 3. What is traded

| Commodity | Unit | Base price |
| --- | --- | --- |
| Rice | 10 kg bag | ₦1,800 |
| Garri | paint bucket | ₦600 |
| Beans | 5 kg bag | ₦900 |
| Palm oil | 5 L keg | ₦1,200 |
| Cement | 50 kg bag | ₦1,500 |
| Petrol | 10 litres | ₦1,000 |

**Prices differ by city.** Each city's reference price is the base price times a city factor of up to 8% either way.

**Prices move.** The reference wanders once an hour by a random step. The walk is bounded: it never goes further from the base price than the commodity's swing. The random source is passed in, so the same game day gives the same prices on every server.

**Calendar events shock the reference.** An event is scripted against the game calendar. It multiplies the reference while it lasts and comes with a headline. Petrol scarcity is the first: petrol goes up while the shortage lasts. Other events (harvest gluts, festive demand) use the same form.

**The chart is computed, not stored.** A price chart shows the reference hourly over the last seven days. It is worked out from the same rules, so nothing extra is saved.

## 4. How trading works

**Accounts are per city.** A player deposits naira into the market account of the city they are in, and withdraws from it only there. A deposit or withdrawal is a wallet ledger line and shows in the Statement.

**Limit orders** name a price and a number of units. The price must lie inside a band of ±10% around the reference when the order is placed. An order rests in the book until another player takes it or it expires after 24 hours. Orders match by price, then by time.

**Buy now and Sell now** fill at once. They take what they can from the other players' resting orders first, then from the market maker. Whatever cannot be filled is dropped. A now order never rests in the book.

**The market maker** quotes 2% either side of the reference: it pays the reference less 2% and asks the reference plus 2%. It takes or gives at most 40 units of one commodity per player per Lagos day. That cap bounds how much naira the market can add to the game (section 6).

**The fee** is 0.5% of each fill's value, paid by both sides, and at least ₦1. The fee is removed from the game. It is the only naira that leaves the market by rule.

## 5. Limits

Every number lives in one table, `MARKET_LIMITS`. Players see the same numbers in the app.

| Limit | Value | Field | What it bounds |
| --- | --- | --- | --- |
| Fee | 0.5% each side, at least ₦1 | `feeBps` | The naira sink |
| Market-maker spread | 2% either side | `spreadBps` | How far the maker quotes from the reference |
| Limit band | ±10% of the reference | `bandBps` | How far a limit price may sit from the reference |
| Units per order | 50 | `maxUnitsPerOrder` | Size of one order |
| Open orders | 10 | `maxOpenOrders` | Resting orders per player |
| Order life | 24 hours | `orderHours` | How long a resting order lives |
| Deposit per day | ₦20,000 | `depositPerDay` | Naira moved into one city's account per day |
| Account maximum | ₦50,000 | `accountMax` | Free plus reserved naira in one city's account |
| Traded per day | ₦60,000 | `tradedPerDay` | Value of fills per player per day, all commodities |
| Maker units per day | 40 per commodity | `makerUnitsPerDay` | Units the market maker takes or gives per player per day |
| Position | 200 units per commodity | `maxPosition` | Most of one commodity a player may hold in one city |
| Pair per day | ₦5,000 | `pairPerDay` | Fills between the same two players per day |

The Lagos day is the clock for every daily limit.

## 6. Why this cannot be used to move money

A market could be used to move naira from one player to another. These rules close that road, and the rules for gifts still apply on top.

- **The band.** A limit order must sit within 10% of the reference, so one player cannot set a price far from what the market would pay.
- **The pair cap.** Two players may trade ₦5,000 with each other in a day. Wash trading between two accounts stops at that figure.
- **Shared devices and blocks.** Players who share a device cannot trade with each other, and a blocked pair cannot trade either.
- **Market gains are not earned from work (D5).** A player who wins on the market cannot give that money away under the gift rule. The allowance for gifts is still only what the life has earned from work.
- **The operator's freeze.** An operator can freeze a trader (section 10).
- **Bounded faucets.** The only naira that the market creates from nothing is the market maker's fills, and each player's share of them is capped at 40 units per commodity per day. A simulation of colluding players and wash-trading bots is run with `npm run economy`, and the test must show that collusion does not pay.

## 7. The public tape

Each city has a public tape of its most recent fills. Each line shows the commodity, the units, the price, the time and the two traders' labels. A label is the trader's public character name, "Anonymous trader" if they chose that label, or "Market maker" for the maker's side.

The tape never shows a public id, a session secret, a real name or an account record. A player's own fills are marked so the app can highlight them. The mark is added for the reader and is not stored.

## 8. Stored data

`db.market` is one collection, `{ v: 1, accounts, books, tape, frozen, seq }`:

- `accounts[cityId][publicId]`: cash, holdings, the anonymous flag, today's deposits, traded value, maker units and pair totals, reset each Lagos day, and the public name at the last write.
- `books[cityId][commodity]`: the resting orders, each with its owner's public id. Order priority is computed when read, not stored.
- `tape[cityId]`: the most recent fills, newest last, with the public ids of both sides. The ids are kept for the caps and the audit and are never sent to another player. The market maker's side has an empty id.
- `frozen`: the public ids an operator has frozen.
- `seq`: the counter for ids.

The record holds no session secret and no real name. On the Worker it is split into parts the same way `db.business` is.

## 9. Routes

```
GET  /api/market/view?city=                          the quotes, the tape, the caller's account, the limits
GET  /api/market/history?city=&commodity=            the reference, hourly for seven days (computed)
POST /api/market/deposit   { cityId, amount, requestId }
POST /api/market/withdraw  { cityId, amount, requestId }
POST /api/market/order     { cityId, commodity, side, price, units, now?, requestId }
POST /api/market/cancel    { cityId, order, requestId }
POST /api/market/anon      { cityId, anon }
POST /api/mod/market/freeze   { publicId, frozen }   operator bearer token only
```

A well-formed request that the rules refuse answers 200 with `ok: false`, a code and a reason, and changes nothing. Every write carries a request id, so a repeated request gets the first answer. The types are in `src/types/market.ts`.

## 10. Moderation

Players report a trader through the existing player report and support channels; a report button on the tape is not in this version. The operator can freeze a public id with `POST /api/mod/market/freeze`. A frozen player can still cancel orders and withdraw, but cannot trade. Each freeze is written to the moderation audit. There is no reversal of fills in this version.

## 11. Red lines

These come from [REAL-VALUE.md](REAL-VALUE.md) and bind every change to the market.

- Market naira can never be bought with real money.
- There is no real money in and no cash-out, and market holdings are never cashed out, gifted outside the transfer rules, or sold off-platform.
- No prize with cash value goes to a market rank.
- No copy says "earn", "invest" or "profit" about the market. It is a simulation, and the first screen says so.
- Selling game naira, holdings or accounts for real money breaks the terms, and such accounts are closed. The rule is in REAL-VALUE.md.

## 12. Not in this version

- Seasons, leaderboards, the "Market basics" badge and the measurement readout (Phase 2).
- A market board in the 3D world.
- Shares in player stalls.
