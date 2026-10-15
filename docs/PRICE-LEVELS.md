# Real price levels

Phase 18 of the "world alive" programme, step 2 of "Currency" (DESIGN.md Part 1). Phase 5 ([CURRENCY.md](CURRENCY.md)) writes
amounts in a city's own money at the day's real rate. This phase makes the amounts themselves believable there: a London room costs
what a London room costs, and a London shift pays what a London shift pays. Moving savings from one country to another at the real
rate then gives real buying power.

## What a player sees

London is expensive and pays more; Accra and Nairobi are close to Lagos; Cairo and Delhi are cheaper. A shift, a room, a bag of rice,
a bus fare and a chair all cost and pay more or less than in Lagos, by the same factor, so a day's work still buys a day's food
everywhere. Nigerian cities are exactly as they were.

## The data

- **Source:** World Bank, International Comparison Program: PPP conversion factor, GDP (`PA.NUS.PPP`) divided by the official
  exchange rate (`PA.NUS.FCRF`). That quotient is the "price level ratio of PPP conversion factor to market exchange rate" (the
  indicator `PA.NUS.PPPC.RF`, which the API no longer serves): what a dollar's worth of everyday goods costs in the country, in
  dollars, against the United States (= 1).
- **Licence:** CC BY 4.0 (<https://creativecommons.org/licenses/by/4.0/>). Credited here, in the header of the data file, and in the
  Help sheet ("Price levels from the World Bank (CC BY 4.0)", beside the weather credit).
- **File:** `src/game/price-levels-data.ts`, committed, 195 countries, one `[level, year]` line each, with the year, the source URL and
  the licence in its header and fields. Never fetched at runtime.
- **Year:** 2021, the last benchmark year of the programme (the last time prices were surveyed in shops; later years are carried
  forward). This is a deliberate choice, not "the latest year": in 2023-24 the naira floated, and the carried-forward figures for
  Nigeria fall from 0.37 to 0.12 against the dollar, which makes Accra three times Lagos and London seven times. With 2021 Accra is
  1.0 and London 2.5. Run `--year latest` to see the newest figures; move the pinned year when the World Bank publishes the 2024 round.
- **Countries without a figure** (a unit change or a collapsed currency, or not in the series): `ai aq as ax bl ck cu eh fk gg gs gu hm
  hr im io je kp li lr mc mf mp ms nc nf nu pf pm pn ps sh so tf tm tw va ve vg wf ye zw`. They are treated as Nigeria (level 1).
  Catalogue entries that are not countries read as the country whose money they use (`kas` as India, `cyn` as Turkey, `sol` as
  Somalia, `atc` and `ioa` as Australia).

### Refreshing it, once a year

```
node --experimental-strip-types scripts/price-levels.ts            # fetch and rewrite src/game/price-levels-data.ts
node --experimental-strip-types scripts/price-levels.ts --check    # say whether the committed file is out of date
node --experimental-strip-types scripts/price-levels.ts --year latest
```

Commit the file it writes and re-run the economy simulation (below). The script needs the network, nothing else does.

## How it works

- **Level against Nigeria:** `priceLevelOf(data, country)` = the country's figure divided by Nigeria's, rounded to two decimals, kept
  within 0.5 to 4 (a collapsed or redenominated currency would otherwise give a nonsense price). Nigeria, no country, or a country
  with no figure: 1.
- **One place, the city's content:** `src/game/cities/registry.ts` calls `scaleCityContent` once, when a city outside Nigeria loads.
  The content then carries its scaled weekly rent and move-in cost, shift pay and every ladder rung, the price and reward of every
  activity (and of its choices), local fares, goal rewards and the "earn" wish. The rules and the screens read these, so no rule knows
  about price levels. The content records the factor as `priceLevel`; a Nigerian city has no such field and is the very same object.
- **The shared shop catalogues:** furniture, groceries and cars are not city content, so the `shop.price` modifier in
  `systems/economy.ts` multiplies them by the level of the city the player is in (rounded the way the game writes money).
- **The scaler** (`src/game/price-levels.ts`) is tiny and in the first download. **The table is not**: `vite.config.ts` leaves
  `price-levels-data.ts` out of the engine chunk and the registry fetches it with the first city outside Nigeria.
- **Rounding:** to 100 naira from 1,000 up, 10 from 100 up, else whole naira; an amount above zero never becomes zero.

### Starting money (the second step, 15 October)

"If you start in London, you have more money." The first step scaled prices and wages; a London player still began with the same naira as
anyone. The second step scales everything that is money at the start by the level of the city the life starts in, so buying power at the
start is about equal everywhere. All of it goes through the one sum, `scaleNaira(amount, level)`, and the level is written once.

- **Where the level lives:** `onboarding.level` (optional, `src/types/life.ts`). `onboarding.home` ("Move in") writes it when the life
  settles, from the city's content (`priceLevel`). A Nigerian start writes nothing. `lifeLevel(state)` reads it and answers 1 for a life
  without it, so **every life saved before this step reads as level 1 and nothing stored is rewritten**; only lives that move in from now on
  have it. Out-of-range values are dropped when a life loads.
- **Starting purse:** the birth-lottery start cash (`startCash` of a rented home, `ownCash` of the free starter house) times the level;
  the "Start cash" grant tops the wallet up to it. The guest purse a brand-new life is created with (`STARTING_CASH`, 5,000) is also times
  the level of the city it is created in (`systems/wallet.ts`), so a guest playing in London is not poorer than one in Lagos.
- **Family (LAPO) loan:** principal, weekly instalment, total to repay and the late fee are the Lagos terms times the level
  (`loanTerms` in `systems/economy.ts`). The level is stored on the loan record (`economy.loan.level`, optional), so a loan made earlier,
  and every Nigerian loan, keeps the old terms for ever; only a new loan carries the scaled ones. The "(includes ₦… LAPO loan)" ledger line, the
  Bank screen and the Goals tab read the loan's own terms.
- **Dream targets:** the Lekki Landlord net-worth target, the startup funding and the cash a dream pays are times the life's level. The
  sentences that name an amount ("Build a net worth of ₦1,000,000.", the lottery bullets "₦60,000 LAPO loan to start…") are restated at the
  level (`restateNaira`), so the words match the numbers. Goal rewards and the "earn" wish were already scaled by the city's content (step 1).
- **Wardrobe:** Boutique prices (styles, accessories and layered clothing) are times the life's level, in the shop, in the Boutique view and in
  the messages.
- **Fares between cities:** a ticket costs the link's base fare times the life's level (`linksPriced` in `systems/estate.ts`: the fare the Travel list
  shows, the check, the debit, the saved trip and the ride on credit to the main home's direct link). A Nigerian start pays the fares as written. The
  whole-route ride home on credit (`homewardQuote`, a signed multi-leg quote whose total is bounded at 1,000,000) keeps the base fares: scaling it would
  break the bound that guarantees a stranded visitor can always be sent home.
- **The launch bonus** ([LAUNCH-BONUS.md](LAUNCH-BONUS.md)): the advertised amount (`LAUNCH_BONUS_AMOUNT`) is the least anyone is paid. A life that
  started in a dearer city is paid the amount times its level when the bonus is paid (the marker's `amount` becomes what was paid); a life that
  started in a cheaper city is paid the advertised amount, because the words promise it. A Nigerian start is paid exactly as before.
- **Not scaled:** stored balances, the shop-owner business numbers, and text already written into data apart from the sentences above.

Known gap: the creator's hints ("Boutique · ₦…" under a style before the life has moved in) still show the catalogue price; the price a
player is charged and shown in the Boutique after moving in is the scaled one.

### Stored data

Step 1 changed nothing stored: no field is added to a save, and no balance, debt or arrears is rewritten. Rent, pay and prices are read from
the city's content each time, so a saved London life simply meets the new numbers on its next Saturday. Arrears stored under the old
rent stay as they are (they are below the new cap).

Step 2 adds three optional fields and rewrites nothing: `onboarding.level` and `economy.loan.level` (a life or loan made before it has none and
reads as level 1), and the launch-bonus marker's `amount`, which becomes the amount actually paid at the moment it is paid. Existing balances, loans,
goals and dreams are untouched; only new lives (and new loans) use the scaled numbers.

## Results

The first version of this table came from `node scripts/economy-sim.ts` in full (30 days, the default career track) with the 2021 table. The table below is the
foreign-city section re-run on 15 October after the Starting money step (`simulateAbroad`, 14 days, the free starter house, every city rolling the same
no-loan birth-lottery outcome, "Civil Servant's Pikin", so the rows compare the same start and not a lucky roll; the 30-day main simulation of Lagos
lives was not changed by this step and cannot finish on this branch for a reason that predates it, see STATUS.md). The section plays a new player for 14 days in each city (settle in a local unit, the helper job,
a free activity) and reads the rent, pay and prices the rules gave. Amounts are naira, before the display conversion of Phase 5.

```
city       level  helper shift  entry shift  top shift  cheapest rent/wk  cheapest pack  food days per entry shift  rent / entry shift         14-day cash  packs bought by it  conserved
---------  -----  ------------  -----------  ---------  ----------------  -------------  -------------------------  ------------------  ------------------  ------------------  ---------
lagos          1          ₦300       ₦2,400    ₦67,200            ₦2,400           ₦200                        3.4                   1    ₦5,000 → ₦46,200                 231        yes
london      2.51          ₦750       ₦9,000   ₦144,600           ₦15,100           ₦500                        5.1                1.68  ₦12,500 → ₦116,000                 232        yes
accra       1.01          ₦300       ₦3,600    ₦58,200            ₦6,100           ₦200                        5.1                1.69    ₦5,100 → ₦46,620                 233        yes
nairobi     1.05          ₦320       ₦3,800    ₦60,500            ₦6,300           ₦210                        5.2                1.66    ₦5,300 → ₦48,640                 232        yes
cairo       0.67          ₦200       ₦2,400    ₦38,600            ₦4,000           ₦130                        5.1                1.67    ₦3,400 → ₦30,950                 238        yes
cape-town   1.36          ₦410       ₦4,900    ₦78,300            ₦8,200           ₦270                        5.2                1.67    ₦6,800 → ₦62,900                 233        yes
delhi       0.77          ₦230       ₦2,800    ₦44,400            ₦4,600           ₦150                        5.3                1.64    ₦3,900 → ₦35,570                 237        yes
tokyo       2.47          ₦740       ₦8,900   ₦142,300           ₦14,800           ₦490                        5.1                1.66  ₦12,400 → ₦114,060                 233        yes
new-york    2.73          ₦820       ₦9,800   ₦157,200           ₦16,400           ₦550                        5.1                1.67  ₦13,700 → ₦126,180                 229        yes
paris       2.28          ₦680       ₦8,200   ₦131,300           ₦13,700           ₦460                        5.1                1.67  ₦11,400 → ₦105,220                 229        yes
sao-paulo    1.2          ₦360       ₦4,300    ₦69,100            ₦7,200           ₦240                        5.1                1.67    ₦6,000 → ₦55,440                 231        yes
```

- **London is expensive and pays more:** level 2.51. Against London's own base content every figure is 2.51 times: the cheapest
  rent 6,000 becomes 15,100, the helper shift 300 becomes 750, the entry career shift about 3,600 becomes 9,000, a pack of rice 200
  becomes 500. Paris, Tokyo and New York are in the same band (2.3 to 2.7).
- **Accra is close to Lagos:** level 1.01. Nairobi 1.05, Cape Town 1.36, Cairo 0.67 and Delhi 0.77 are close or cheaper.
- **Nothing broken:** in every city one entry-level shift buys about 5.1 days of food (the three cheapest grocery packs) and a week of
  the cheapest rent costs about 1.66 entry shifts; the figures differ by under 4% from city to city, which is the rounding. The
  helper shift (a starter job) pays one grocery pack, as in Lagos. Every one of the 112 lives of the main simulation and the 11 city lives above keeps
  `cash = seed + sum of the ledger`, and every ledger reason is classified.
- **Lagos rows are the same as before** (the Nigerian content is the same object; `price-levels.test.ts` also checks it).
- **Buying power at the start is equal everywhere:** the last column is the 14-day cash divided by the cheapest grocery pack of the city. London ends
  with 232 packs, Lagos with 231, Tokyo 233, New York 229, Paris 229, Cairo 238: within 3%. Before the Starting money step the same London life ended on
  ₦33,600 against ₦46,200 in Lagos at 2.5 times the prices (about 67 packs against 231); London was a third as well off. The purse now starts at
  ₦12,500 for the guest (5,000 times 2.51) and the Civil Servant's Pikin start is ₦40,000 times 2.51 in London.
- **The earlier anomaly in Accra and Cape Town (14-day cash of about 206k) was the birth lottery, not the cities' content:** each city rolled its own
  outcome (a different one from the Lagos row). With the same outcome in every city they end where their neighbours do.
- **The Lagos column still differs on food days (3.4) and rent (1):** Lagos's own content has a cheaper home and a different entry track; that is the base
  content, not a price level, and is unchanged.


## Tests

`src/game/price-levels.test.ts`: the table (year, source, licence, every row in range), the loader (Nigeria 1, London above 2, Accra
and Nairobi near 1, unknown and junk 1, clamping, aliases, every country the game has), the rounding, Nigerian cities unchanged byte for
byte and the same objects, London dear and paying more, Accra near Lagos, a grocery price in Lagos, London and Accra, the wage and price
ratios in every country of the table (a shift buys a day of food; rent keeps its share of pay), and an old save loading in London and in
Lagos with nothing rewritten.

`src/game/price-levels.test.ts` (second half): a Nigerian start is exactly as before (purse, loan, no level stored, the same ledger words); a
London start has the purse, the loan terms, the dream words and the Boutique in London prices, the loan is collected at the scaled instalment,
and London's purse buys about as many packs of rice as Lagos's (within 5%); an old life without a level reads as 1 and loads unchanged, a bad
level is dropped, a scaled loan survives a load; the guest purse; a ticket is in the prices of the life's starting city, and Nigerian and old lives pay the fare as written.
`server/bonus.test.ts`: a dearer start is paid the amount times its level, a cheaper one and a Nigerian one exactly the advertised amount.
