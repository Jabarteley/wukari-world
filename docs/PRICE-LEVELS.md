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

RESULTS_PLACEHOLDER

## Tests

`src/game/price-levels.test.ts`: the table (year, source, licence, every row in range), the loader (Nigeria 1, London above 2, Accra
and Nairobi near 1, unknown and junk 1, clamping, aliases, every country the game has), the rounding, Nigerian cities unchanged byte for
byte and the same objects, London dear and paying more, Accra near Lagos, a grocery price in Lagos, London and Accra, the wage and price
ratios in every country of the table (a shift buys a day of food; rent keeps its share of pay), and an old save loading in London and in
Lagos with nothing rewritten.
