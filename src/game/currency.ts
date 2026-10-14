/**
 * THE MONEY OF EVERY COUNTRY THE GAME HAS A CITY IN
 * ===========================================================================
 * One static table from a city's country (the lower-case code a catalogue entry carries, src/game/cities/catalogue.ts `countryISO`; a
 * city without one is in Nigeria) to its currency: the ISO 4217 code, a short symbol, and how many decimals the money has.
 *
 * Two readers: the world feed (server/world-feed) keeps only the day's rates for the currencies in this table, and the money formatter
 * of the next phase shows a city's amounts in its own currency. The game's own unit stays the naira; nothing stored changes.
 *
 * A few codes in the catalogue are not countries (map entries such as the disputed regions); they use the money people there use.
 * Pure data and two small readers: no imports, so the browser may use it.
 */

export interface Currency { readonly code: string; readonly symbol: string; readonly decimals: 0 | 2 | 3 }

/** Symbols where one is in common use; every other currency is written with its code. */
const SYMBOLS: Readonly<Record<string, string>> = {
  NGN: '₦', USD: '$', EUR: '€', GBP: '£', GHS: 'GH₵', KES: 'KSh', ZAR: 'R', INR: '₹', JPY: '¥', CNY: 'CN¥', KRW: '₩', XOF: 'CFA', XAF: 'FCFA',
  CAD: 'CA$', AUD: 'A$', NZD: 'NZ$', MXN: 'MX$', BRL: 'R$', UGX: 'USh', TZS: 'TSh', RWF: 'FRw', EGP: 'E£', ILS: '₪', PHP: '₱', VND: '₫', THB: '฿',
  TRY: '₺', UAH: '₴', RUB: '₽', PLN: 'zł', CZK: 'Kč', HUF: 'Ft', SEK: 'kr', NOK: 'kr', DKK: 'kr', ISK: 'kr', CHF: 'CHF', HKD: 'HK$', SGD: 'S$', TWD: 'NT$',
}
/** Money with no minor unit in everyday use, and money with a thousandth. Everything else has two decimals. */
const NO_DECIMALS = new Set(['JPY', 'KRW', 'UGX', 'RWF', 'XOF', 'XAF', 'XPF', 'CLP', 'PYG', 'VND', 'ISK', 'KMF', 'DJF', 'GNF', 'BIF', 'VUV'])
const THREE_DECIMALS = new Set(['BHD', 'KWD', 'OMR', 'JOD', 'TND', 'LYD', 'IQD'])

const make = (code: string): Currency => Object.freeze({ code, symbol: SYMBOLS[code] ?? code, decimals: NO_DECIMALS.has(code) ? 0 : THREE_DECIMALS.has(code) ? 3 : 2 })

/** Country (lower-case code) to ISO 4217 code. Nigeria is the default for a city without a country. */
const COUNTRY_CURRENCY: Readonly<Record<string, string>> = Object.freeze({
  ng: 'NGN',
  ad: 'EUR', ae: 'AED', af: 'AFN', ag: 'XCD', ai: 'XCD', al: 'ALL', am: 'AMD', ao: 'AOA', aq: 'USD', ar: 'ARS', as: 'USD', at: 'EUR', atc: 'AUD', au: 'AUD',
  aw: 'AWG', ax: 'EUR', az: 'AZN', ba: 'BAM', bb: 'BBD', bd: 'BDT', be: 'EUR', bf: 'XOF', bg: 'EUR', bh: 'BHD', bi: 'BIF', bj: 'XOF', bl: 'EUR', bm: 'BMD',
  bn: 'BND', bo: 'BOB', br: 'BRL', bs: 'BSD', bt: 'BTN', bw: 'BWP', by: 'BYN', bz: 'BZD', ca: 'CAD', cd: 'CDF', cf: 'XAF', cg: 'XAF', ch: 'CHF', ci: 'XOF',
  ck: 'NZD', cl: 'CLP', cm: 'XAF', cn: 'CNY', co: 'COP', cr: 'CRC', cu: 'CUP', cv: 'CVE', cw: 'XCG', cy: 'EUR', cyn: 'TRY', cz: 'CZK', de: 'EUR', dj: 'DJF',
  dk: 'DKK', dm: 'XCD', do: 'DOP', dz: 'DZD', ec: 'USD', ee: 'EUR', eg: 'EGP', eh: 'MAD', er: 'ERN', es: 'EUR', et: 'ETB', fi: 'EUR', fj: 'FJD', fk: 'FKP',
  fm: 'USD', fo: 'DKK', fr: 'EUR', ga: 'XAF', gb: 'GBP', gd: 'XCD', ge: 'GEL', gg: 'GBP', gh: 'GHS', gl: 'DKK', gm: 'GMD', gn: 'GNF', gq: 'XAF', gr: 'EUR',
  gs: 'GBP', gt: 'GTQ', gu: 'USD', gw: 'XOF', gy: 'GYD', hk: 'HKD', hm: 'AUD', hn: 'HNL', hr: 'EUR', ht: 'HTG', hu: 'HUF', id: 'IDR', ie: 'EUR', il: 'ILS',
  im: 'GBP', in: 'INR', io: 'USD', ioa: 'AUD', iq: 'IQD', ir: 'IRR', is: 'ISK', it: 'EUR', je: 'GBP', jm: 'JMD', jo: 'JOD', jp: 'JPY', kas: 'INR', ke: 'KES',
  kg: 'KGS', kh: 'KHR', ki: 'AUD', km: 'KMF', kn: 'XCD', kp: 'KPW', kr: 'KRW', kw: 'KWD', ky: 'KYD', kz: 'KZT', la: 'LAK', lb: 'LBP', lc: 'XCD', li: 'CHF',
  lk: 'LKR', lr: 'LRD', ls: 'LSL', lt: 'EUR', lu: 'EUR', lv: 'EUR', ly: 'LYD', ma: 'MAD', mc: 'EUR', md: 'MDL', me: 'EUR', mf: 'EUR', mg: 'MGA', mh: 'USD',
  mk: 'MKD', ml: 'XOF', mm: 'MMK', mn: 'MNT', mo: 'MOP', mp: 'USD', mr: 'MRU', ms: 'XCD', mt: 'EUR', mu: 'MUR', mv: 'MVR', mw: 'MWK', mx: 'MXN', my: 'MYR',
  mz: 'MZN', na: 'NAD', nc: 'XPF', ne: 'XOF', nf: 'AUD', ni: 'NIO', nl: 'EUR', no: 'NOK', np: 'NPR', nr: 'AUD', nu: 'NZD', nz: 'NZD', om: 'OMR', pa: 'PAB',
  pe: 'PEN', pf: 'XPF', pg: 'PGK', ph: 'PHP', pk: 'PKR', pl: 'PLN', pm: 'EUR', pn: 'NZD', pr: 'USD', ps: 'ILS', pt: 'EUR', pw: 'USD', py: 'PYG', qa: 'QAR',
  ro: 'RON', rs: 'RSD', ru: 'RUB', rw: 'RWF', sa: 'SAR', sb: 'SBD', sc: 'SCR', sd: 'SDG', se: 'SEK', sg: 'SGD', sh: 'SHP', si: 'EUR', sk: 'EUR', sl: 'SLE',
  sm: 'EUR', sn: 'XOF', so: 'SOS', sol: 'SOS', sr: 'SRD', ss: 'SSP', st: 'STN', sv: 'USD', sx: 'XCG', sy: 'SYP', sz: 'SZL', tc: 'USD', td: 'XAF', tf: 'EUR',
  tg: 'XOF', th: 'THB', tj: 'TJS', tl: 'USD', tm: 'TMT', tn: 'TND', to: 'TOP', tr: 'TRY', tt: 'TTD', tv: 'AUD', tw: 'TWD', tz: 'TZS', ua: 'UAH', ug: 'UGX',
  us: 'USD', uy: 'UYU', uz: 'UZS', va: 'EUR', vc: 'XCD', ve: 'VES', vg: 'USD', vi: 'USD', vn: 'VND', vu: 'VUV', wf: 'XPF', ws: 'WST', xk: 'EUR', ye: 'YER',
  za: 'ZAR', zm: 'ZMW', zw: 'ZWG',
})

const CURRENCIES: ReadonlyMap<string, Currency> = new Map([...new Set(Object.values(COUNTRY_CURRENCY))].map((code) => [code, make(code)]))

/** Every currency code the game's countries use, sorted. */
export const CURRENCY_CODES: readonly string[] = Object.freeze([...CURRENCIES.keys()].sort())
/** The countries the table knows (lower-case codes). */
export const CURRENCY_COUNTRIES: readonly string[] = Object.freeze(Object.keys(COUNTRY_CURRENCY))

/** The money of a country (its lower-case catalogue code, any case accepted); no country means Nigeria; an unknown one is null. */
export function currencyOfCountry(country?: string | null): Currency | null {
  const key = country ? country.toLowerCase() : 'ng'
  const code = Object.hasOwn(COUNTRY_CURRENCY, key) ? COUNTRY_CURRENCY[key] : undefined
  return code ? CURRENCIES.get(code) ?? null : null
}
/** One currency by its ISO code, or null. */
export const currencyByCode = (code: string): Currency | null => CURRENCIES.get(code.toUpperCase()) ?? null
