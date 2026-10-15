/**
 * PRICE LEVELS FROM THE WORLD BANK (docs/PRICE-LEVELS.md)
 * ===========================================================================
 *   node --experimental-strip-types scripts/price-levels.ts            fetch the latest data and rewrite src/game/price-levels-data.ts
 *   node --experimental-strip-types scripts/price-levels.ts --year latest   use the newest year with enough countries instead of the pinned benchmark year
 *   node --experimental-strip-types scripts/price-levels.ts --check    fetch and say whether the committed file is out of date (writes nothing)
 *
 * Re-run once a year (the World Bank updates its International Comparison Program series in the autumn), commit the file it writes.
 * The game never fetches at runtime: the table is a committed file.
 *
 * WHAT IT READS (open data, CC BY 4.0, https://data.worldbank.org/)
 *   PA.NUS.PPP    PPP conversion factor, GDP (local currency units per international dollar)
 *   PA.NUS.FCRF   Official exchange rate (local currency units per US dollar, period average)
 *   The price level of a country is PPP / exchange rate: what a dollar's worth of everyday goods costs there, in dollars, against the
 *   United States (= 1). This is the World Bank's "price level ratio of PPP conversion factor (GDP) to market exchange rate"
 *   (PA.NUS.PPPC.RF), which the API no longer serves, worked out from the two series it still serves.
 *
 * THE YEAR is the pinned benchmark year (PINNED_YEAR below), or with `--year latest` the newest one in which at least MIN_COUNTRIES countries have both numbers. A country with no number for that year uses its
 * latest earlier year, up to MAX_BACK years back (the table says which year each one is from); a country with none stays out of the
 * table and the game treats it as Nigeria (level 1). Aggregates (regions, income groups) are left out.
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const API = 'https://api.worldbank.org/v2';
const MIN_COUNTRIES = 150, MAX_BACK = 3, MIN_RATIO = 0.1;
/**
 * The year the table is cut from unless `--year latest` (or another year) is given. 2021 is the last International Comparison Program
 * benchmark: the last year prices were surveyed in the shops. Later years are carried forward with each country's price index and the
 * year's official exchange rate, and the naira's float in 2023-24 makes Nigeria's later figures swing (0.37 in 2021, 0.12 in 2024), which
 * would make Accra three times Lagos. Move this forward when the World Bank publishes the next benchmark (2024 round).
 */
const PINNED_YEAR = 2021;
const OUT = fileURLToPath(new URL('../src/game/price-levels-data.ts', import.meta.url));

interface Row { countryiso3code: string; date: string; value: number | null; country: { id: string } }
async function series(indicator: string): Promise<Row[]> {
  const year = new Date().getUTCFullYear();
  const response = await fetch(`${API}/country/all/indicator/${indicator}?format=json&per_page=20000&date=${year - 8}:${year}`);
  if (!response.ok) throw new Error(`${indicator}: HTTP ${response.status}`);
  const body = await response.json() as [unknown, Row[] | null];
  if (!Array.isArray(body[1])) throw new Error(`${indicator}: no data (${JSON.stringify(body[0]).slice(0, 200)})`);
  return body[1];
}
async function countries(): Promise<Map<string, string>> {
  const response = await fetch(`${API}/country?format=json&per_page=400`);
  if (!response.ok) throw new Error(`countries: HTTP ${response.status}`);
  const body = await response.json() as [unknown, { id: string; iso2Code: string; region: { id: string } }[]];
  return new Map(body[1].filter((c) => c.region.id !== 'NA').map((c) => [c.id, c.iso2Code.toLowerCase()])); // region NA: the aggregates
}

const [ppp, fx, names] = await Promise.all([series('PA.NUS.PPP'), series('PA.NUS.FCRF'), countries()]);
const byCountry = new Map<string, Map<number, number>>(); // iso3 -> year -> price level
const fxOf = new Map(fx.filter((r) => r.value && r.value > 0).map((r) => [`${r.countryiso3code}:${r.date}`, r.value as number]));
for (const r of ppp) {
  const rate = fxOf.get(`${r.countryiso3code}:${r.date}`);
  if (!r.value || r.value <= 0 || !rate || !names.has(r.countryiso3code) || r.value / rate < MIN_RATIO) continue; // below MIN_RATIO: a unit change or a collapsed currency
  const years = byCountry.get(r.countryiso3code) ?? new Map<number, number>();
  years.set(Number(r.date), r.value / rate);
  byCountry.set(r.countryiso3code, years);
}
const count = new Map<number, number>();
for (const years of byCountry.values()) for (const year of years.keys()) count.set(year, (count.get(year) ?? 0) + 1);
const asked = process.argv.includes('--year') ? process.argv[process.argv.indexOf('--year') + 1] : String(PINNED_YEAR);
const newest = Math.max(...[...count].filter(([, n]) => n >= MIN_COUNTRIES).map(([y]) => y));
const year = asked === 'latest' ? newest : Number(asked);
if (!Number.isFinite(year) || (count.get(year) ?? 0) < MIN_COUNTRIES) throw new Error('no year has enough countries');

const rows: [string, number, number][] = [];
for (const [iso3, years] of byCountry) {
  const used = [...years.keys()].filter((y) => y <= year && y >= year - MAX_BACK).sort((a, b) => b - a)[0];
  if (used !== undefined) rows.push([names.get(iso3) as string, Math.round((years.get(used) as number) * 1000) / 1000, used]);
}
rows.sort((a, b) => a[0].localeCompare(b[0]));
if (!rows.some(([code]) => code === 'ng')) throw new Error('Nigeria has no price level: the table is relative to it');

const body = `/**
 * PRICE LEVELS BY COUNTRY: generated by scripts/price-levels.ts (docs/PRICE-LEVELS.md). Do not edit by hand; re-run the script once a year.
 * Data: World Bank, International Comparison Program: PA.NUS.PPP (PPP conversion factor, GDP) divided by PA.NUS.FCRF (official exchange
 * rate): the price level of a country against the United States. Licence: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
 * Read only by the price-level loader (price-levels.ts), which fetches this file with the first city that is not in Nigeria.
 */
export const PRICE_LEVEL_DATA = Object.freeze({
  year: ${year},
  source: 'World Bank, International Comparison Program (PA.NUS.PPP / PA.NUS.FCRF)',
  url: 'https://data.worldbank.org/indicator/PA.NUS.PPP',
  licence: 'CC BY 4.0',
  licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
  /** Lower-case ISO 3166 alpha-2 code to [price level against the United States, year of the figure]. */
  levels: Object.freeze({
${rows.map(([code, level, used]) => `    ${code}: [${level}, ${used}],`).join('\n')}
  } as Record<string, readonly [number, number]>),
});
`;
if (process.argv.includes('--check')) {
  const same = existsSync(OUT) && readFileSync(OUT, 'utf8') === body;
  console.log(same ? `Up to date (${year}, ${rows.length} countries).` : `Out of date: the World Bank now has ${year} with ${rows.length} countries. Run without --check.`);
  process.exit(same ? 0 : 1);
}
writeFileSync(OUT, body);
console.log(`Wrote ${OUT}: year ${year}, ${rows.length} countries.`);
