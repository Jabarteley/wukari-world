/**
 * OWNER: social
 * ALLWORLD FOR BUSINESS, the pure rules (docs/PROMOTE.md): any adult's business or service is listed FREE in its city's directory; a
 * boost is a week of a Sponsored card in the city's feed (Boost) or in every city's World tab too (Spotlight), paid in real naira to
 * Allworld, at prices far below what in-game billboards cost elsewhere. Nothing here reads a clock, a store or the DOM.
 */
export const CATEGORIES = Object.freeze([
  ['food', 'Food and drinks'], ['fashion', 'Fashion and tailoring'], ['beauty', 'Hair and beauty'], ['tech', 'Phones and tech'],
  ['repairs', 'Repairs and artisans'], ['transport', 'Transport and delivery'], ['events', 'Events and music'], ['learning', 'Lessons and tutoring'],
  ['health', 'Health and fitness'], ['home', 'Home and cleaning'], ['shops', 'Shops and supplies'], ['services', 'Other services'],
] as const)
export type Category = typeof CATEGORIES[number][0]
export const isCategory = (v: unknown): v is Category => CATEGORIES.some(([id]) => id === v)
export const categoryLabel = (id: string): string => CATEGORIES.find(([c]) => c === id)?.[1] ?? 'Business'
export type Tier = 'boost' | 'spotlight'
export const TIERS: Readonly<Record<Tier, { label: string; what: string; price: number }>> = Object.freeze({
  boost: { label: 'Boost', what: 'A Sponsored card in your city\'s feed and the top of its directory for a week', price: 2500 },
  spotlight: { label: 'Spotlight', what: 'Everything in Boost, plus a Sponsored card in the World feed of every city for a week', price: 7500 },
})
export const PROMOTE = Object.freeze({ name: 40, about: 280, area: 40, listingsPerOwner: 3, weeksMax: 8, sponsoredEvery: 6, perPage: 30, reviewTries: 3 })
/**
 * Billboards (docs/PROMOTE.md): a running Boost or Spotlight also shows on the boards of its own city's map and streets, at no new price.
 * Only a live listing (it passed the advertising rules or an admin approved it) with a running boost; the board shows its name, kind and
 * photo, never its description; a tap opens the business. Places young people pass keep nightlife, alcohol and gambling words off the
 * boards, whatever the reviewer let into the directory.
 */
export const BILLBOARD = Object.freeze({ max: 24, rotateMs: 600000, street: 12, streetTotal: 120 })
const NOT_ON_BOARDS = /\b(bar|bars|club|clubs|nightclub|lounge|liquor|wine|wines|beer|alcohol|whisky|whiskey|vodka|hookah|shisha|casino|betting|bet|lottery|escort|strip|stripper|vape|vapes|cigar|cigars|cigarette|cigarettes|adult)\b|18\+/i
/** May this business be shown on a billboard where young people pass? */
export const boardSafe = (l: { name: string; about: string; area: string }): boolean => !NOT_ON_BOARDS.test(`${l.name} ${l.about} ${l.area}`)
export type ListingStatus = 'review' | 'live' | 'refused' | 'removed'
export type OrderStatus = 'pending' | 'paid' | 'ended' | 'cancelled'
export const naira = (n: number): string => `₦${Math.round(n).toLocaleString('en-NG')}`
/** The price of a tier for some weeks, in whole naira; `prices` are the admin's values (they replace the defaults). */
export const priceOf = (tier: Tier, weeks: number, prices: Partial<Record<Tier, number>> = {}): number => (prices[tier] ?? TIERS[tier].price) * Math.max(1, Math.min(PROMOTE.weeksMax, Math.round(weeks)))
