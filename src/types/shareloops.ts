// The share loops of the wow plan, Phase 4 (docs/SHARE-LOOPS.md): what the server answers for the passport, Wrapped, street fame and the
// city front page. The cards themselves are drawn on the device from these facts; the duet is a feed post (src/types/feed.ts `duet`).

/** One passport stamp: a city the character arrived in, and when (server ms). */
export interface PassportStamp {
  city: string
  name: string
  /** ISO country code in lower case ('ng'). */
  country: string
  countryName: string
  /** The atlas level of the continent ('africa', 'europe', …; Nigeria is Africa). */
  continent: string
  at: number
}
export interface PassportView {
  stamps: PassportStamp[]
  /** How many open cities each continent has, so a page can say "3 of 41". */
  open: Record<string, number>
}

/** One month of a player's life in figures, from records the game already keeps (server/shareloops/wrapped.ts). */
export interface WrappedView {
  /** 'YYYY-MM' (Lagos time). */
  month: string
  /** The month is still going. */
  partial: boolean
  /** New cities stamped in the month. */
  cities: string[]
  /** Homes the player went into as a guest. */
  homes: number
  friends: number
  /** Game naira received (positive wallet entries); never real money. Null when the wallet history does not reach back that far. */
  earned: number | null
  /** Elections (city, state or nation) the player voted in. */
  votes: number
  /** The AI resident the player saw most, or null: always labelled AI on the card. */
  ai: { name: string } | null
  /** The player's own post with the most reactions in the month, or null. */
  post: { id: string; body: string; reactions: number } | null
}

export interface FameHome { rank: number; name: string; visitors: number; mine?: true }
export interface FameCommunity { rank: number; id: string; name: string; reactions: number }
export interface FameView {
  city: string
  /** The Lagos week of the board (Monday-started index); `name` is its Monday, 'YYYY-MM-DD'. */
  week: number
  name: string
  homes: FameHome[]
  communities: FameCommunity[]
  /** The caller's badge, when their home was in last week's top three of their city. */
  badge: { rank: number; city: string; cityName: string; week: string } | null
}

export interface FrontPageStory { head: string; body: string }
export interface FrontPageView {
  city: string
  cityName: string
  /** The Lagos day the page reports on (the day before it was made), 'YYYY-MM-DD'. */
  date: string
  paper: string
  headline: string
  stories: FrontPageStory[]
  /** 'ai': written by a model from the day's public gist lines; 'template': put together from the lines as they are. */
  by: 'ai' | 'template'
  /** How many public lines it was made from. */
  lines: number
}

type E = import('./protocol.ts').HostErrorCode | import('./protocol.ts').SessionErrorCode | import('./protocol.ts').StorageErrorCode
type Ok<T> = import('./protocol.ts').Ok<T>
export interface ShareLoopsHttpRoutes {
  'GET /api/loops/passport': { response: Ok<{ passport: PassportView }>; errors: E }
  'GET /api/loops/wrapped': { query: { month?: string }; response: Ok<{ wrapped: WrappedView }>; errors: E | 'invalid_month' | 'loops_rate_limited' }
  'GET /api/loops/fame': { query: { id: string }; response: Ok<{ fame: FameView }>; errors: E | 'invalid_city' | 'loops_rate_limited' }
  'GET /api/loops/frontpage': { query: { id: string }; response: Ok<{ page: FrontPageView | null }>; errors: E | 'invalid_city' | 'loops_rate_limited' }
}
