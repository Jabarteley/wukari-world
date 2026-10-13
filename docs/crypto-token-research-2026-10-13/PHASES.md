# Allworld market and real-value plan: implementation phases

Status: plan for review, 13 October 2026. Nothing below is built. The plan follows the verdict in [`README.md`](README.md):

- Run the trading experiment with play money first.
- Add real money only through licensed partners, and only after written legal advice.
- Keep a proprietary token as a decision point, not a build phase.

Phases 0–2 can ship without a lawyer. Each later phase needs the legal gate shown, and Anthony signs off before any phase starts (the same rule as the L0–L4 ladder in `docs/REAL-VALUE.md`).

| Phase | What ships | Money level | Gate to start | Rough size |
| --- | --- | --- | --- | --- |
| 0 | Guardrails and decisions, docs only | — | This review | 1–2 days |
| 1 | Allworld Market: play-money trading with a public trade feed | L0 | Phase 0 signed off | 3–5 weeks |
| 2 | Market seasons, events, badge and measurement | L0 | Phase 1 live for 2 weeks | 2–3 weeks |
| 3 | Non-cashable cosmetic coins | L2 | L1 cleared, gateway approval | per REAL-VALUE |
| 4 | Revenue-funded creator and seller payouts through a licensed partner | L4 | Written CBN/SEC advice, partner confirmed | 3–6 months, $40k–$120k [unverified] |
| 5 | Optional on-chain cosmetics | beyond L4 | Lawyer opinion, demand evidence | not estimated |
| 6 | Proprietary token: decision only | — | All conditions in Phase 6 | $400k–$1.2M plus ₦500M–₦2B capital [unverified] |

---

## Phase 0: guardrails and decisions (docs only)

**Goal.** Fix the red lines before any code exists, so later work cannot drift into a financial product.

**Work**

1. Add a "Market" row to the money-level table in `docs/REAL-VALUE.md` (L0). Add these red lines:
   - Market naira can never be bought with real money.
   - Market holdings can never be cashed out, gifted outside the existing transfer rules, or sold off-platform.
   - Market ranks never carry prizes with cash value.
   - No copy says "earn", "invest" or "profit" about the market. It is a simulation.
2. Write a short real-money-trading policy, modelled on EVE Online's: selling game naira or holdings for real money breaks the terms, and accounts are closed. Put it in the terms and the Help app.
3. Make the decisions below, then write `docs/MARKET.md` (the design doc, in the style of `BUSINESS.md`).

**Decisions for you**

| # | Question | Recommendation |
| --- | --- | --- |
| D1 | What is traded? (a) a fictional "ALW" coin; (b) city commodities such as rice, cement, fuel and garri; (c) shares in player stalls | **(b) commodities.** They fit the Nigerian life-sim, prices can follow in-game events, and they don't look like a crypto launch. (a) invites people to confuse it with a real token. (c) ties prices to other players' businesses and invites manipulation and harassment. |
| D2 | One market for all cities, or one per city? | **One per city**, with arbitrage between cities through travel, as `BUSINESS.md` already allows for traders. |
| D3 | Who can trade? | **Everyone**, including under-18s, because no real money is involved. |
| D4 | What the public feed shows | **Pseudonym, item, quantity, price and time.** No real names and no account ids. Players can opt into an "anonymous trader" label. |
| D5 | Does market profit count as "earned from work" for gifts? | **No.** It would open a new channel for moving money, the same as shop takings in `BUSINESS.md` §5. |

**Exit gate.** D1–D5 answered, `MARKET.md` written, REAL-VALUE updated.

---

## Phase 1: Allworld Market, the play-money exchange (L0)

**Goal.** The experiment you described: a market where players trade, see each other's trades live and watch prices move. Game naira only.

**Server** (new `server/market/`, following `server/business/service.ts`)

- An order book per city per commodity. It supports limit and market orders and matches price-time, all server-authoritative. The client only sends intents.
- Every fill moves game naira through the existing wallet effects, so it appears in the Statement app via `server/economy/history.ts`.
- **NPC market makers** quote around a reference price so a thin market still trades. That reference price moves with game events: fuel scarcity, harvest, festive demand, `civic` news. This is where most of the fun comes from.
- **Limits** in a `MARKET_LIMITS` table, like `TRANSFER_LIMITS`:
  - order size, open orders, daily traded value and position size per player
  - a trade fee of about 0.5% as a naira sink
- **Abuse controls**, reused from `BUSINESS.md` §5:
  - Players who share a network address or device cannot trade with each other.
  - Each player's trades with a single counterparty are capped per day.
  - Fills that match a pattern of transferring value (a sell far below the reference price to a single buyer) are blocked.
- **Collections**: a `db.market` collection holding books, fills and a bounded trade history. It has to work on both Node and Worker storage, with the same splitting the `db.business` collection already uses.
- **Moderation**: a report button on traders, plus operator tools to freeze a trader or reverse fills. These are written to the existing moderation audit.

**Client** (new `src/app/features/market/`, next to `money/InvestApp.vue`)

- A **Market** phone app with:
  - a commodity list with price and day change
  - a price chart for each commodity
  - an order ticket
  - the player's holdings and open orders
- A public **trade tape**: the live feed of recent fills in the city.
- An in-world **market board** at the city's market venue showing the tape, using the billboard slots in `src/game/content/civic-ads.ts`.
- Copy that says "simulation" on first open, and never says "earn".

**Tests**

- Matching engine: price-time priority, partial fills, cancels, and idempotent intents.
- Conservation: no naira is created except through the fee sink and NPC makers, which sit inside the bounds asserted in `src/game/economy.test.ts`.
- `npm run economy` gains a trader, a colluding pair and a wash-trading bot. Over 30 days the bot and the pair must lose money, and the trader's gain must stay within a stated multiple of a career's.
- Abuse cases: same device, same address, and dumping below the reference price.

**Exit gate**

- Tests pass.
- The economy simulation shows that collusion does not pay.
- The feature is live for at least 2 weeks.

---

## Phase 2: seasons, events and measurement (L0)

**Goal.** Make the market something players come back for, and measure whether trading itself keeps people playing. That measurement is the evidence any later real-value step depends on.

**Work**

- **Market events.** Scripted shocks tied to the game calendar, such as fuel scarcity, a Ramadan or Christmas demand surge, or a harvest glut. They come with Messages → Updates notices.
- **Seasons.** Monthly leaderboards for realised return. Rewards are cosmetic only: a title, a badge, or a market-board shout-out.
- **Skills Passport badge**, "Market basics" (RV2/RV8). It is earned through a short in-app lesson on spreads, fees, volatility and scams. This doubles as scam education, given CBEX and the tap-to-earn history.
- **Metrics**, using the RV7 analytics pattern in `server/real-value/analytics.ts`:
  - weekly active traders
  - retention of traders against non-traders after 7 and 30 days
  - share of trades that are player against player
  - abuse blocks per day

**Exit gate (evidence for later phases)**

- At least 4 weeks of data.
- A written readout: do traders retain better than non-traders? Does activity hold with no money incentive?

If not, stop here. Real-value steps would not have the demand they need.

---

## Phase 3: non-cashable cosmetic coins (L2)

Already planned in `REAL-VALUE.md` L2. It is included here to fix one rule:

- **Coins never enter the Market.** They buy cosmetics and boosts only. They cannot be converted to game naira, traded or transferred.
- This keeps the play-money market outside every rule that applies to bought currency, including gambling and stored value.

**Gate.** L1 cleared: CAC, VAT, the ARCON note, and Paystack or Flutterwave approval for virtual goods. When applying, describe the market accurately as play money with no cash-out.

---

## Phase 4: real money for creators and sellers (L4)

**Goal.** Give real-world value to players who create value, without game money becoming cash.

**Design**

- A **separate payout account** per eligible creator or seller. Game naira, Market holdings and coins never feed it.
- It is funded from a **capped pool of real revenue**, such as L1 ads and L2 coin sales, for example X% of last month's net revenue.
- Payouts are earned by things that bring Allworld real revenue: popular stalls, classes, cosmetic designs. Never by trading results.
- A **licensed partner** holds and pays out the money; Allworld is never the payee or the custodian. Candidates: Tilia/Thunes, Tipalti, or a Nigerian licensed payout provider. Nigerian payee support is [unverified] for all of them.
- Eligibility: 18+, KYC through the partner, BVN/NIN and TIN, a monthly minimum, a payout hold period and fraud review.

**Gates**

1. Written CBN and SEC advice. This is REAL-VALUE legal question 4 plus Codex questions 1–8, 9–10 and 16.
2. Written confirmation from the partner on scope and Nigerian payees.
3. Staff named for fraud, tax reporting and complaints.
4. A Nigeria-only pilot with 50–200 creators before any wider rollout.

**Size.** 3–6 months and $40k–$120k setup [unverified estimate].

---

## Phase 5: optional on-chain cosmetics

Only if players ask for provable ownership or resale of cosmetics, and only after a lawyer's opinion on NFT classification in Nigeria and on any marketplace Allworld would run.

- No fungible token.
- No paid random drops.
- No yield.

Apple and Google NFT rules apply if Allworld ever ships a store app. Not estimated until there is demand evidence.

---

## Phase 6: proprietary token, a decision point rather than a build phase

Revisit only when all of these hold:

1. Phase 2 data shows trading keeps players engaged with no money incentive.
2. Phase 4 runs on real revenue without relying on new buyers.
3. A Nigerian securities lawyer has given a written opinion on the exact token and flows. There is a foreign opinion for every country not geo-blocked.
4. SEC capital is funded (₦500M at minimum, ₦2B for an exchange or custodian), or a licensed partner performs those functions under contract.
5. Adults only, KYC'd and geo-restricted, with no earnings marketing and no paid chance mechanics.
6. A budget of $400k–$1.2M and 9–18 months is approved [unverified estimate].

If these hold, the likely route is SEC ARIP or a no-objection application, with issuance through a licensed offering platform. Allworld should not self-list.

---

## What to review first

1. **Answers to D1–D5** in Phase 0. Phase 1 can't start until they're settled.
2. **Whether Phase 2's stop rule is acceptable**, meaning no real-value work if trading doesn't keep players engaged.
3. **Phase 4's funding rule**: payouts only from a capped share of real revenue.
