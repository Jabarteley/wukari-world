// Is the address a short address (/abuja, /games/chess, /unilag, /signup …) that the creator carries a line for, rather than the plain page, an
// invite or share link, or an address of the entry page (/shops, /services, /games, /cities, /agents, /politics, /street/<city>/<place>,
// /visit/<city>, /detty: src/entry-variants.ts)? Kept apart from the entry page's words because the first download reads it (warmLanding.ts,
// startExtras.ts, src/quick-start/entry.ts). Each word maps to the variant it belongs to; a test keeps the words equal to the table.
const ID_OF: Readonly<Record<string, string>> = { shops: 'shops', sell: 'shops', services: 'services', games: 'games', cities: 'cities', world: 'cities', agents: 'agents', ai: 'agents', politics: 'politics', street: 'street', visit: 'visit', detty: 'detty' }
export const ENTRY_WORDS: readonly string[] = Object.keys(ID_OF)

/** The name of the entry variant an address belongs to (exactly: `/games/chess` is not one), or null. Counted as the campaign's `content` when a link carries none. */
export function entryVariantId(pathname: string): string | null {
  const path = pathname.replace(/\/+$/, '').toLowerCase()
  // Under /street and /visit the place is read later, against the table (src/paths.ts).
  const id: unknown = ID_OF[/^\/(street\/[a-z0-9-]{1,40}(\/[a-z0-9-]{1,40})?|visit\/[a-z0-9-]{1,40})$/.test(path) ? path.split('/')[1]! : path.slice(1)]
  return typeof id === 'string' ? id : null
}
export const isEntryAddress = (pathname: string): boolean => entryVariantId(pathname) !== null
export function isPathAddress(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '')
  return path !== '' && path !== '/index.html' && !isEntryAddress(path) && !/^\/(v|s|w)\/[^/]+$/.test(path)
}
