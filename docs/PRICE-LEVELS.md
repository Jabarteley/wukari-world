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

### Not scaled (on purpose, for a later step)

The starting purse and the family loan (they are stored and the loan terms are constants of the bills), goal targets and the dream
targets, fares between cities (distance-based), wardrobe prices, the shop-owner business numbers, the launch bonus, and text already
written into data. A player who starts in London therefore begins with the same naira as anyone, against dearer prices; the day's
work pays proportionally.

### Stored data

Nothing stored changes: no field is added to a save, and no balance, debt or arrears is rewritten. Rent, pay and prices are read from
the city's content each time, so a saved London life simply meets the new numbers on its next Saturday. Arrears stored under the old
rent stay as they are (they are below the new cap).

## Results

`node scripts/economy-sim.ts` was run in full (the heavy slot, 30 days, the default career track; no reduced version was needed) on the
branch with the 2021 table. Its new section plays a new player for 14 days in each city (settle in a local unit, the helper job,
a free activity) and reads the rent, pay and prices the rules gave. Amounts are naira, before the display conversion of Phase 5.

```
city       level  helper shift  entry shift  top shift  cheapest rent/wk  cheapest pack  food days per entry shift  rent / entry shift        14-day cash  conserved
---------  -----  ------------  -----------  ---------  ----------------  -------------  -------------------------  ------------------  -----------------  ---------
lagos          1          ₦300       ₦2,400    ₦67,200            ₦2,400           ₦200                        3.4                   1   ₦5,000 → ₦46,200        yes
london      2.51          ₦750       ₦9,000   ₦144,600           ₦15,100           ₦500                        5.1                1.68   ₦5,000 → ₦33,600        yes
accra       1.01          ₦300       ₦3,600    ₦58,200            ₦6,100           ₦200                        5.1                1.69  ₦5,000 → ₦206,220        yes
nairobi     1.05          ₦320       ₦3,800    ₦60,500            ₦6,300           ₦210                        5.2                1.66   ₦5,000 → ₦58,640        yes
cairo       0.67          ₦200       ₦2,400    ₦38,600            ₦4,000           ₦130                        5.1                1.67   ₦5,000 → ₦56,150        yes
cape-town   1.36          ₦410       ₦4,900    ₦78,300            ₦8,200           ₦270                        5.2                1.67  ₦5,000 → ₦208,500        yes
delhi       0.77          ₦230       ₦2,800    ₦44,400            ₦4,600           ₦150                        5.3                1.64   ₦5,000 → ₦56,770        yes
tokyo       2.47          ₦740       ₦8,900   ₦142,300           ₦14,800           ₦490                        5.1                1.66   ₦5,000 → ₦67,260        yes
new-york    2.73          ₦820       ₦9,800   ₦157,200           ₦16,400           ₦550                        5.1                1.67   ₦5,000 → ₦68,980        yes
paris       2.28          ₦680       ₦8,200   ₦131,300           ₦13,700           ₦460                        5.1                1.67   ₦5,000 → ₦66,020        yes
sao-paulo    1.2          ₦360       ₦4,300    ₦69,100            ₦7,200           ₦240                        5.1                1.67   ₦5,000 → ₦25,440        yes
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
- **What the table shows that this phase did not change:** (1) the Lagos column differs from the others (3.4 food days and 1 rent per
  shift, against 5.1 and 1.66 elsewhere) because the other cities' own content has a dearer cheapest home and has no 2,400 entry track,
  at any level; (2) the 14-day cash of Accra (about 206k) and Cape Town (about 208k) is far above their neighbours' at a level close to 1: it
  comes from what the first free activity of those cities' content gives, not from the price level. Both are for a later look at those
  cities' base numbers.
- **The one real effect of not scaling the starting purse:** a new player in London starts with the same naira as anyone, against
  prices 2.5 times higher (14-day cash 33,600 against 46,200 in Lagos, at 2.5 times the pay). That is the next step if players find it hard.


## Tests

`src/game/price-levels.test.ts`: the table (year, source, licence, every row in range), the loader (Nigeria 1, London above 2, Accra
and Nairobi near 1, unknown and junk 1, clamping, aliases, every country the game has), the rounding, Nigerian cities unchanged byte for
byte and the same objects, London dear and paying more, Accra near Lagos, a grocery price in Lagos, London and Accra, the wage and price
ratios in every country of the table (a shift buys a day of food; rent keeps its share of pay), and an old save loading in London and in
Lagos with nothing rewritten.
