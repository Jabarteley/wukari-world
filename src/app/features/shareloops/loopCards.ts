/**
 * The words and figures of the share-loop cards drawn from what the server answered (docs/SHARE-LOOPS.md): passport pages, Wrapped, street
 * fame and the city front page, plus the text that goes with each. Pure: ./loopPaint.ts draws them, the components only wire them up.
 */
import { gameNaira, loopText, plain } from './loopsModel.ts'
import type { FameView, FrontPageView, PassportStamp, PassportView, WrappedView } from '../../../types/shareloops.ts'

// ---- passport -------------------------------------------------------------------------------

/** The continents in the order a passport's pages run, with their names (the atlas's own). */
export const CONTINENTS: readonly (readonly [string, string])[] = Object.freeze([
  ['africa', 'Africa'], ['europe', 'Europe'], ['asia', 'Asia'], ['north-america', 'North America'], ['south-america', 'South America'], ['oceania', 'Oceania'], ['antarctica', 'Antarctica'],
] as const)
/** Stamps on one printed page. */
export const STAMPS_PER_PAGE = 12

export interface PassportPage { continent: string; name: string; page: number; pages: number; stamps: PassportStamp[]; total: number; open: number }

/** The pages of a passport: one or more per continent with a stamp (STAMPS_PER_PAGE each), oldest stamp first, in CONTINENTS order. */
export function passportPages(view: PassportView): PassportPage[] {
  const out: PassportPage[] = []
  for (const [id, name] of CONTINENTS) {
    const stamps = view.stamps.filter((stamp) => stamp.continent === id).sort((a, b) => a.at - b.at)
    if (!stamps.length) continue
    const pages = Math.ceil(stamps.length / STAMPS_PER_PAGE)
    for (let page = 0; page < pages; page++) out.push({ continent: id, name, page: page + 1, pages, stamps: stamps.slice(page * STAMPS_PER_PAGE, (page + 1) * STAMPS_PER_PAGE), total: stamps.length, open: view.open[id] ?? 0 })
  }
  return out
}
/** "12 Oct 2026" (Lagos time). */
export function stampDate(at: number): string {
  const date = new Date(at + 3600000)
  return `${date.getUTCDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getUTCMonth()]} ${date.getUTCFullYear()}`
}
/** "3 of 41 cities in Africa", or the count alone when the open total is not known. */
export const pageProgress = (page: PassportPage): string => `${page.total}${page.open ? ` of ${page.open}` : ''} ${page.total === 1 && !page.open ? 'city' : 'cities'} in ${page.name}`
export function passportText(page: PassportPage, link: string): string {
  return loopText([`My Allworld passport: ${pageProgress(page)} 🛂`, page.stamps.slice(-3).map((stamp) => stamp.name).join(' · '), 'Where has yours been?'], link)
}
/** A small stable number per city, for the ink colour and the slant of its stamp. */
export const stampTone = (city: string): number => [...city].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7) % 97

// ---- wrapped --------------------------------------------------------------------------------

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
/** "October 2026" from '2026-10'. */
export function monthTitle(month: string): string {
  const [year, index] = month.split('-').map(Number)
  return MONTHS[(index ?? 1) - 1] && year ? `${MONTHS[(index ?? 1) - 1]} ${year}` : month
}
/** The month before a 'YYYY-MM'. */
export function monthBefore(month: string): string {
  const [year = 1970, index = 1] = month.split('-').map(Number)
  return index === 1 ? `${year - 1}-12` : `${year}-${String(index - 1).padStart(2, '0')}`
}

export interface WrappedCard { title: string; tiles: { value: string; label: string }[]; rows: { label: string; value: string }[]; empty: boolean }
/** The Wrapped card: a tile per figure that is more than nothing, then the AI resident and the best post. Never a figure that is zero. */
export function wrappedCard(view: WrappedView): WrappedCard {
  const tiles: WrappedCard['tiles'] = []
  const places = view.cities.length + view.homes
  if (places) tiles.push({ value: String(places), label: places === 1 ? 'place visited' : 'places visited' })
  if (view.friends) tiles.push({ value: String(view.friends), label: view.friends === 1 ? 'friend made' : 'friends made' })
  if (view.earned) tiles.push({ value: gameNaira(view.earned), label: 'game naira earned' })
  if (view.votes) tiles.push({ value: String(view.votes), label: view.votes === 1 ? 'election voted in' : 'elections voted in' })
  if (view.cities.length) tiles.push({ value: String(view.cities.length), label: view.cities.length === 1 ? 'new city' : 'new cities' })
  const rows: WrappedCard['rows'] = []
  if (view.ai) rows.push({ label: 'AI you saw most (AI)', value: plain(view.ai.name, 24) })
  if (view.post) rows.push({ label: `Top post · ${view.post.reactions} reaction${view.post.reactions === 1 ? '' : 's'}`, value: plain(view.post.body, 60) || 'A photo or clip' })
  if (view.cities.length) rows.push({ label: 'New stamps', value: view.cities.slice(0, 4).join(', ') })
  return { title: `My ${monthTitle(view.month)}${view.partial ? ' so far' : ''}`, tiles: tiles.slice(0, 6), rows: rows.slice(0, 3), empty: !tiles.length && !rows.length }
}
export function wrappedText(view: WrappedView, link: string): string {
  const card = wrappedCard(view)
  return loopText([`${card.title} in Allworld ✨`, ...card.tiles.slice(0, 4).map((tile) => `${tile.value} ${tile.label}`), 'Make yours.'], link)
}

// ---- street fame ----------------------------------------------------------------------------

export function fameCard(view: FameView, cityName: string): { title: string; rows: { label: string; value: string }[]; foot: string; badge: string } {
  const rows = [
    ...view.homes.slice(0, 3).map((home) => ({ label: `#${home.rank} home · ${home.visitors} visitor${home.visitors === 1 ? '' : 's'}`, value: `${plain(home.name, 24)}${home.mine ? ' (me)' : ''}` })),
    ...view.communities.slice(0, 3).map((crew) => ({ label: `#${crew.rank} community · ${crew.reactions} reaction${crew.reactions === 1 ? '' : 's'}`, value: plain(crew.name, 32) })),
  ]
  const badge = view.badge ? `Street famous · #${view.badge.rank} in ${plain(view.badge.cityName, 24)}` : ''
  return { title: badge || `Street fame in ${plain(cityName, 24)}`, rows, foot: `Week of ${view.name}`, badge }
}
export function fameText(view: FameView, cityName: string, link: string): string {
  const card = fameCard(view, cityName)
  return loopText([card.badge ? `I am street famous in Allworld: #${view.badge?.rank} in ${view.badge?.cityName} this week ⭐` : `Who is street famous in ${cityName} this week?`, ...card.rows.slice(0, 3).map((row) => `${row.value} (${row.label})`), 'Come and visit.'], link)
}

// ---- the front page -------------------------------------------------------------------------

export const frontCredit = (page: FrontPageView): string => (page.by === 'ai' ? `Written by AI from ${page.lines} public gist line${page.lines === 1 ? '' : 's'}` : `From ${page.lines} public gist line${page.lines === 1 ? '' : 's'}`)
export function frontDate(page: FrontPageView): string {
  const [year, month, day] = page.date.split('-').map(Number)
  return year && month && day ? `${day} ${MONTHS[month - 1]} ${year}` : page.date
}
export function frontText(page: FrontPageView, link: string): string {
  return loopText([`${page.paper}, ${frontDate(page)} 📰`, page.headline, ...page.stories.slice(0, 2).map((story) => `· ${story.head}`)], link)
}
