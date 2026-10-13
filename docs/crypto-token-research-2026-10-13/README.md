# Should Allworld launch its own tradable crypto token?

Research date: 13 October 2026. This is desk research by Claude, with three parallel research tracks, and by Codex, working independently. It is not legal advice. Figures marked [unverified] still need a primary source. Codex's full report, with every citation, is in [`codex-report.md`](codex-report.md).

## The idea that was tested

1. Create a custom token and use it as Allworld's in-game currency.
2. Let anyone anywhere trade it inside the game, with every trade visible to everyone.
3. Later, list it on exchanges or DEXes so that game money becomes real money.
4. The motive: avoid the licensing and financial burden that real money in the game would bring.

## Verdict: no-go as stated

Claude and Codex reached the same conclusion independently. **Using a token does not avoid financial regulation. It brings in more of it than any other way of putting real money into a game.**

The parts of the token idea that make it fun and cost nothing legally are trading, a live order book and a public ledger. Allworld can have all of them with play money. The part that makes it "real money", cash-out and an exchange listing, is what turns Allworld into a regulated financial business. Today that means at least ₦500M of SEC capital in Nigeria, and separate regimes in every other country where players live.

| Option | Recommendation |
| --- | --- |
| Play-money market in the game: tradable in-game asset, public ledger, price charts, leaderboards, no cash-out | **Go.** Captures most of the experiment at close to zero legal burden. |
| Closed-loop coins for cosmetics (REAL-VALUE L2) | **Go**, as already planned |
| Creator or seller payouts funded from real revenue, through a licensed partner (the Roblox DevEx / Second Life model) | **Go only if** CBN and SEC advice is in writing (REAL-VALUE L4) |
| Own token, cashable or listed | **No-go** until the conditions in the last section are met. Budget about $400k–$1.2M plus ₦500M–₦2B of regulatory capital, and 9–18 months, for a Nigeria-only version [unverified estimate] |

## 1. Why crypto does not escape the law

Regulators look at what a thing does, not at the technology it runs on. Each feature of the proposal triggers rules on its own:

| Feature in the proposal | What it triggers | Where |
| --- | --- | --- |
| Selling the token to players, including in-game top-ups | A securities offering: white paper, SEC registration, licensed offering platform | Nigeria, US, EU |
| Matching players' buy and sell orders | Running an exchange | Nigeria (₦2B capital), EU (CASP licence), US (state money-transmitter licences, NY BitLicense, California DFAL) |
| Holding players' balances or keys | Custody, and possibly money transmission | All |
| Cash-out to naira, dollars or euros | Loses "closed-loop" status. Brings money transmission or e-money rules, AML/KYC, sanctions screening and tax reporting | All |
| Free trading between players, plus a public ledger | Breaks the EU "limited network" exemption. Adds AML and OFAC exposure. NDPA privacy problems for students | EU, US, Nigeria |
| Announcing a future exchange listing | Removes the EU MiCA exemptions as soon as it is announced (Art. 4(4)). Supports an "expectation of profit" in the US | EU, US, Nigeria |
| Team or founder allocation, or promoting the price | Investment-contract evidence (SEC interpretation of 17 March 2026). Crypto promotions are a criminal offence in the UK if unauthorised | US, UK, all |
| Random rewards that can be cashed out | Gambling analysis, with state-level licensing in Nigeria since the November 2024 Supreme Court ruling | Nigeria, UK, Belgium, US |

### Nigeria, Allworld's main market, is the strictest case

- **Digital assets are securities by statute.** Investments and Securities Act 2025, s.357; Codex confirmed this against the official SEC text. "It's only a game token" is a weak argument here.
- **Capital requirements, from the SEC circular of 16 January 2026:**
  - Token issuer or platform operator: ₦500M
  - Offering platform: ₦1B
  - Exchange or custodian: ₦2B each

  New registrations must meet these up front. The June 2027 deadline only covers existing operators. Allworld would perform several of these functions at once.
- **ARIP (the SEC sandbox) is not an exemption.** It gives conditional Approval-in-Principle. It requires a Nigerian company, a physical office and a resident CEO. Busha and Quidax are still at Approval-in-Principle, not fully licensed.
- **A July 2026 Executive Order** splits oversight. Securities go to the SEC; non-security virtual-asset payments and custody go to the CBN. Even if the token were found not to be a security, the payment side would still be regulated.
- **Draft SEC rules of August 2026** are not final [unverified detail]. They reportedly:
  - include utility tokens
  - ban promoting unregistered digital assets
  - reach offshore issuers that target Nigerians
  - cap retail buyers at ₦1M per issuer
- **Tax guidance of 31 July 2026** names gaming utility tokens explicitly. Rewards and disposals can be taxable even when nobody cashes out.
- **Enforcement climate.** In April 2025 the SEC moved against CBEX for operating an unregistered exchange. Its executives were detained during the Binance case. An unregistered token sold to students would be an easy target.

### Payment rails and stores would refuse it

- **Paystack** bans "cryptocurrency operators".
- **Flutterwave**'s Nigeria prohibited list includes crypto and digital-wallet companies, and "monetizable virtual credits".
- **Opay, Moniepoint and PalmPay** warned in 2024 that they would close accounts used for crypto trading.

Allworld could lose the gateways that the L2 coin and the commerce work depend on.

- **Apple 3.1.5(v)** forbids giving currency for completing tasks, which is play-to-earn.
- **Google Play** forbids promoting earnings from play.
- **Steam** bans games that issue crypto.

The browser build avoids store review today, but not the law or the processors.

## 2. What happened to games that tried it

Prices are a single-date snapshot from 13 October 2026, from Codex's Binance reference pages.

| Game | Token | All-time high → now | Players | What went wrong |
| --- | --- | --- | --- | --- |
| Axie Infinity | AXS / SLP | $165 → $1.14 / −99.9% | 2.7M daily (2021) → about 100k (2024) | SLP was minted 4× faster than it was burned. The Ronin hack lost $620M to Lazarus. Filipino "scholars" ended up in debt. |
| STEPN | GMT | $4.11 → $0.008 | down 80–90% | Weak sinks, China ban, GPS-spoofing bots |
| Decentraland | MANA | $5.90 → $0.09 | hundreds to thousands daily (disputed) | Hype without users |
| The Sandbox | SAND | $8.44 → $0.06 | mostly bots reported; more than 50% of staff laid off in 2025 | |
| Gala Games | GALA | $0.84 → $0.002 | — | 5B tokens minted through a compromised admin key; co-founder lawsuits |
| Pixels | PIXEL | $1.02 → $0.006 | CEO: only about 40% of wallets were real people | |
| Hamster Kombat | HMSTR | −98% | 300M claimed → about 0.8M monthly | Nigerians expected about $200 and got about $8; 2.3M wallets disqualified as cheaters |
| Notcoin | NOT | −98.5% | — | Airdrop recipients sold as soon as it was listed |

**No game in this list kept both its token value and its player base.** The real-value economies that lasted have three things in common:

- Players cannot cash out at all, or only creators can.
- The operator controls supply.
- Real licensing is in place.

The examples are Roblox DevEx (creators only, KYC'd, $0.0038 per Robux, paid from revenue), Second Life (Tilia, now Thunes, which holds money-transmitter licences in 50 states) and EVE Online (one-way PLEX, cash-out banned).

**Why these economies collapse:**
- A token reward creates something to sell, not a buyer with outside money.
- Payouts need real revenue. Without it, they depend on new entrants, which is how a Ponzi works, even when nobody intends one.
- Bots, multi-accounting, wash trading and insiders dumping at launch speed this up.

**A specific risk for Allworld.** In `BUSINESS.md`, simulated passers-by create new naira that no real revenue backs. If that naira became redeemable:
- every faucet would become a withdrawal liability
- every exploit would become theft
- every balance change would become a real loss for players

**Nigerian players have already been burned.** CBEX, MMM and the tap-to-earn airdrops left them wary. A launch that looks like Hamster Kombat will be judged against those.

## 3. Risks beyond the law

- **Hacks.** Ronin lost $620M, Gala's admin key was compromised, and Bybit lost $1.5B. Audits ($5k–$150k) do not protect keys or operations.
- **Privacy.** A public ledger tied to identifiable students is hard to square with NDPA 2023 (children's consent) and is permanent. EU guidance of July 2026 flags how hard erasure is on a blockchain.
- **Compliance staff.** KYC alone costs $1.35–$5 per user. Sanctions hits, suspicious-activity reports, appeals, reconciliation and tax reporting each need people.
- **Liquidity.** Market makers and listings cost tens of thousands of dollars. A thin market invites manipulation; the DOJ sentenced Gotbit's founder in 2025 for wash trading.

## 4. What to build instead

**Phase 1 (now, level L0). The Allworld Exchange, played with play money.** This runs the experiment the founder described without real money.
- An in-game tradable asset, for example "ALW" shares or city commodities, priced in game naira.
- A live order book, price charts and a public trade feed showing pseudonyms only.
- Market events and a trading leaderboard.
- A financial-literacy badge for the Skills Passport (RV2 and RV8).

Red lines:
- no deposits
- no cash-out
- no prizes with cash value tied to rank
- never use the word "earn"

The ledger can reuse the wallet and shop transaction patterns in `BUSINESS.md`. This tests whether players enjoy trading at all, which is the demand evidence any later token would need.

**Phase 2 (L2).** The planned non-cashable coin for cosmetics. Sponsor-funded airtime or data giveaways can come later, as capped promotions, never as a conversion of coins.

**Phase 3 (L3–L4).** Revenue-funded payouts to creators and sellers through a licensed partner, kept separate from the game currency. This needs written CBN and SEC advice first, and someone must confirm that the partner supports Nigerian payees.

**Phase 4 (only if all the conditions below hold).** Revisit an on-chain asset, starting with cosmetics. Do not start with a fungible currency.

## Conditions before any real-money token

1. Phase 1 data shows players keep trading with no money incentive.
2. Revenue exists to fund payouts without relying on new buyers.
3. A Nigerian securities lawyer gives a written opinion on the exact token and money flows (Codex lists 17 questions in section 9 of its report). A foreign opinion is needed for each country not geo-blocked.
4. The capital requirement is funded: ₦500M at minimum, more if Allworld runs the exchange or custody itself. Alternatively, a licensed partner performs those functions in writing.
5. Adults only, KYC'd, geo-restricted, with no paid random rewards and no earnings marketing.
6. Fraud, sanctions, tax and incident staff are in place before launch.

## Where Claude and Codex differed

- **Prices and capital.** Codex used one date-consistent price source and the SEC's own circulars. Claude's tracks used secondary coverage, which disagreed on capital tiers. This report uses Codex's figures.
- **Draft SEC rules (August 2026).** Claude found reported details such as the utility-token scope, the promotion ban and retail caps. Codex could not load the official draft. Both treat the draft as not yet in force.
- **Only Codex found** the July 2026 Executive Order, the NRS tax guidance that names gaming tokens, Flutterwave's "monetizable virtual credits" ban, the NDPA privacy problem with a public ledger, and the risk that `BUSINESS.md` faucets become cash liabilities.
- **Only Claude found** the Nigerian tap-to-earn payout experience (Techpoint), Pixels' real-user estimate, and the play-money exchange as the way to keep the experiment.

## Still unverified

- Final adoption of the August 2026 SEC draft rules
- The outcome of the Binance corporate case in Nigeria
- How the FCT lottery exception applies
- Nigerian scholar earnings
- Current vendor quotes for audit, legal and KYC work
- Whether Tilia/Thunes or Roblox-style payout partners support Nigerian recipients
