/**
 * THE ENTRY VARIANTS: the one small table behind the entry page of a new visitor. Each row is an address an advert or a shared link can
 * point at (`/`, `/shops`, `/services`, `/games`, `/cities`, `/agents`, `/politics`, `/street`, `/visit`, `/detty`) with what that page says, what its first button does and where
 * the visitor ends up. The page (src/app/features/start/EntryPage.vue) and both hosts (server/path-meta.ts, for the link preview) read
 * this table and nothing else, so a new variant is a row, not a page. Plain data: no Vue, no registry, nothing a player typed.
 *
 *   {cities} and {countries} in a text are filled from the city catalogue (the page) or the registry (the hosts): no number is written here.
 *   A row with `place` also answers on the addresses under it (`/street/<city>/<place>`, `/visit/<city>`, src/paths.ts): its words take
 *   {place} ("Yaba, Lagos", or the city alone) and {city} from the city's own rules, never from the address, and the dive to that place
 *   plays behind the card (src/map3d/entry-dive.ts).
 *   A row with `december` (the visit) says those words instead of its `place` ones for Lagos, Accra and Abuja while Detty December is on
 *   (1 to 31 December, WAT: docs/DETTY-DECEMBER.md): `placeWords` decides, by date, on the page and both hosts.
 *   `lands`: what the first button does once the life exists. 'shop' opens My shop in the Services app with a kind preselected
 *   (src/paths.ts keeps that as the address's own intent); 'address' leaves it to the address (the Games app, the world map).
 */
export type EntryVariantId = 'home' | 'shops' | 'services' | 'games' | 'cities' | 'agents' | 'politics' | 'street' | 'visit' | 'detty'

export interface EntryTileSpec { icon: string; label: string }
export interface EntryAction { label: string; kind: 'play' | 'setup' | 'browse' | 'agent' | 'find' }
export interface EntryVariant {
  id: EntryVariantId
  /** The first is the address of the variant (its canonical); the rest are other ways to write it. */
  paths: readonly string[]
  /** The page's head, written by both hosts. Never over 155 characters for the description. */
  title: string
  description: string
  headline: string
  pitch: string
  tiles: readonly EntryTileSpec[]
  /** The picture on the card (a small WebP under /icons), or null; and the link-preview picture (a JPEG under /og). */
  image: string | null
  og: string
  primary: EntryAction
  secondary: readonly EntryAction[]
  /** For a setup variant: the kind of shop preselected in My shop. */
  category?: string
  /** The words of an address under this row that names a place ({place}, {city}). */
  place?: { title: string; description: string; headline: string; pitch: string }
  /** The `place` words of a Detty December city while the season is on ({city} as in `place`). */
  december?: { title: string; description: string; headline: string; pitch: string }
}

const TAIL = 'Free in your browser, no download.'

export const ENTRY_VARIANTS: readonly EntryVariant[] = Object.freeze([
  {
    id: 'home', paths: ['/'], title: 'Allworld: a digital world you can live in',
    description: 'A digital world to live in. Real-world places to explore: work, travel, make friends and play. Free in your browser, no download.',
    headline: 'A digital world you can live in', pitch: '{cities} real-world places to explore. Free, in your browser, no download.',
    tiles: [{ icon: 'pin', label: 'Live in a real city' }, { icon: 'earn', label: 'Work and earn' }, { icon: 'boutique', label: 'Open a shop for your real business' }, { icon: 'people', label: 'Friends, voice and games' }],
    image: null, og: '/og/allworld.jpg', primary: { label: 'Play now', kind: 'play' }, secondary: [{ label: 'Find my street', kind: 'find' }],
  },
  {
    id: 'shops', paths: ['/shops', '/sell'], title: 'Open a free shop for your real business — Allworld',
    description: `Show your goods in a virtual shop. Customers visit by link and message you directly. Allworld never holds your money. ${TAIL}`,
    headline: 'Open a free shop for your real business', pitch: 'Show your goods in a virtual world. Customers visit your shop by link and message you directly. Allworld never holds your money.',
    tiles: [{ icon: 'boutique', label: 'Your own 3D shop' }, { icon: 'messages', label: 'Customers message you directly' }, { icon: 'bank', label: 'Allworld never holds your money' }, { icon: 'link', label: 'Share one link anywhere' }],
    image: '/icons/entry-shops.webp', og: '/og/entry-shops.jpg', primary: { label: 'Open my shop', kind: 'setup' }, secondary: [{ label: 'Browse shops', kind: 'browse' }, { label: 'Just play', kind: 'play' }], category: 'crafts',
  },
  {
    id: 'services', paths: ['/services'], title: 'List your services in a virtual office — Allworld',
    description: `A virtual office with your service menu and portfolio, for salons, tailors, repairs, photography, tutoring and more. ${TAIL}`,
    headline: 'List your services in a virtual office', pitch: 'Salon, tailoring, repairs, photography, tutoring, events, tech: a virtual office with your service menu and portfolio. Clients message you directly. Allworld never holds your money.',
    tiles: [{ icon: 'building', label: 'Your own virtual office' }, { icon: 'note', label: 'A service menu and a portfolio' }, { icon: 'messages', label: 'Clients message you directly' }, { icon: 'link', label: 'Share one link anywhere' }],
    image: '/icons/entry-services.webp', og: '/og/entry-services.jpg', primary: { label: 'List my services', kind: 'setup' }, secondary: [{ label: 'Browse services', kind: 'browse' }, { label: 'Just play', kind: 'play' }], category: 'salon',
  },
  {
    id: 'games', paths: ['/games'], title: 'Play chess, the daily word and more — Allworld',
    description: `Chess, Oro (a new word every day), Weave, Whot and penalties. Play against the computer or at a table with friends. ${TAIL}`,
    headline: 'Play with friends, by voice, in real places', pitch: 'Whot, Ayo, chess, Weave, penalties, a word a day and a gem hunt: at tables in real cities, with your friends on voice. Free, in your browser.',
    tiles: [{ icon: 'game', label: 'Whot, Ayo, chess and Weave' }, { icon: 'ball', label: 'Penalties and the gem hunt' }, { icon: 'mic', label: 'Talk to friends by voice' }, { icon: 'pin', label: 'Tables in real places' }],
    image: '/icons/entry-games.webp', og: '/og/entry-games.jpg', primary: { label: 'Play now', kind: 'play' }, secondary: [],
  },
  {
    id: 'cities', paths: ['/cities', '/world'], title: 'The map of the world — Allworld',
    description: `A digital universe of the whole world: {cities} real cities in {countries} countries are open now, more are coming. ${TAIL}`,
    headline: '{cities} real cities in {countries} countries', pitch: 'Pick a place, move in, work, travel by road and air, and make friends. More cities are opening all the time.',
    tiles: [{ icon: 'pin', label: 'Real streets, real places' }, { icon: 'plane', label: 'Travel between cities' }, { icon: 'home', label: 'Choose where you live' }, { icon: 'people', label: 'Friends in every city' }],
    image: '/icons/entry-cities.webp', og: '/og/entry-cities.jpg', primary: { label: 'Play now', kind: 'play' }, secondary: [{ label: 'Find my city', kind: 'find' }],
  },
  {
    id: 'agents', paths: ['/agents', '/ai'], title: 'Let your AI agent play Allworld',
    description: 'Your own AI assistant can play Allworld for you: travel, work and eat. Agent characters are labelled. Free in your browser.',
    headline: 'Let your AI agent play Allworld', pitch: 'Your own AI assistant can read your life and take actions like travelling, working and eating. Agents are labelled and ranked on their own league.',
    tiles: [{ icon: 'link', label: 'Your own agent, your own tools' }, { icon: 'person', label: 'Agent characters are labelled' }, { icon: 'lock', label: 'Disconnect any time' }, { icon: 'game', label: 'Same world as everyone' }],
    image: null, og: '/og/allworld.jpg', primary: { label: 'Play now', kind: 'play' }, secondary: [{ label: 'Connect an agent', kind: 'agent' }],
  },
  {
    // The politics advert (docs/POLITICS.md): one-week terms, a quorum per seat, real players' votes. Play opens the Politics panel.
    id: 'politics', paths: ['/politics'], title: 'Become governor of Lagos this week — Allworld',
    description: `One-week terms and real elections: run for office, start a party, pass laws. Fights and jail too. ${TAIL}`,
    headline: 'Become governor of Lagos this week', pitch: 'One-week terms. Real elections, decided by real players: run for a seat, start a party and pass laws. Fights and jail too.',
    tiles: [{ icon: 'ballot', label: 'Real elections every week' }, { icon: 'governor', label: 'Governor for one week' }, { icon: 'megaphone', label: 'Start a party' }, { icon: 'scales', label: 'Laws, fights and jail' }],
    image: null, og: '/og/card-election.png', primary: { label: 'Play now', kind: 'play' }, secondary: [],
  },
  {
    // A street of a real city (the street advert): the dive goes down to it behind the card, and Play puts the visitor there.
    id: 'street', paths: ['/street'], title: 'Walk your own street on Allworld',
    description: `Real cities, down to the street: walk yours, meet the people who live there and call your friends. ${TAIL}`,
    headline: 'Walk your own street', pitch: 'Real cities, down to the neighbourhood. Find yours, walk it, and meet the people who live there.',
    tiles: [{ icon: 'walk', label: 'Walk real streets' }, { icon: 'people', label: 'Meet the neighbours' }, { icon: 'home', label: 'Find a home there' }, { icon: 'phone', label: 'Call your friends' }],
    image: null, og: '/og/entry-cities.jpg', primary: { label: 'Play now', kind: 'play' }, secondary: [{ label: 'Find my street', kind: 'find' }],
    place: {
      title: 'Walk {place} on Allworld', description: `Walk the streets of {place}: meet the people who live there, find a home and call your friends. ${TAIL}`,
      headline: 'Walk {place}', pitch: 'Real streets, real neighbours. One tap on Play and you are there.',
    },
  },
  {
    // Visit home (the diaspora advert): the same street, for someone far away. The city's calls and people are as they already are.
    id: 'visit', paths: ['/visit'], title: 'Visit home from London — Allworld',
    description: `From London, Houston or Toronto: walk your family’s street tonight and call their character. ${TAIL}`,
    headline: 'Visit home from London', pitch: 'Or Houston, or Toronto: walk your family’s street tonight and call their character.',
    tiles: [{ icon: 'plane', label: 'Home, from anywhere' }, { icon: 'walk', label: 'Walk your family’s street' }, { icon: 'phone', label: 'Call their character' }, { icon: 'heart', label: 'Free, no download' }],
    image: null, og: '/og/entry-cities.jpg', primary: { label: 'Play now', kind: 'play' }, secondary: [{ label: 'Find my street', kind: 'find' }],
    place: {
      title: 'Visit {city} on Allworld', description: `From London, Houston or Toronto: walk your family’s street in {city} tonight and call their character. ${TAIL}`,
      headline: 'Visit home to {city}', pitch: 'Walk your family’s street tonight and call their character. One tap on Play and you are there.',
    },
    december: {
      title: 'Detty December in {city} — Allworld', description: `Home for December from anywhere: beach days, street parties, concerts and owambe Saturdays in {city}, 1 to 31 December. ${TAIL}`,
      headline: 'Detty December in {city}', pitch: 'Beach by day, parties by night, home for the season. One tap on Play and you are there.',
    },
  },
  {
    // The December season's own address (docs/DETTY-DECEMBER.md): Play opens the Events app on the season once the life exists.
    id: 'detty', paths: ['/detty'], title: 'Detty December in Allworld: Lagos, Accra and Abuja',
    description: `1 to 31 December in Lagos, Accra and Abuja: beach days, street parties, concerts and owambe Saturdays. ${TAIL}`,
    headline: 'Detty December in Allworld', pitch: 'Lagos, Accra and Abuja, 1 to 31 December: beach by day, parties by night, and a Returnee badge when you come home from abroad.',
    tiles: [{ icon: 'star', label: 'A night out every night' }, { icon: 'people', label: 'Owambe Saturdays' }, { icon: 'plane', label: 'Returnee badge from abroad' }, { icon: 'calendar', label: 'Something new every day' }],
    image: null, og: '/og/entry-cities.jpg', primary: { label: 'Play now', kind: 'play' }, secondary: [],
  },
] satisfies readonly EntryVariant[])

/** The variant an address belongs to (query and trailing slash ignored), or null. An address under a row with a place is that row's. */
export function variantOf(pathname: string): EntryVariant | null {
  const path = (pathname.split(/[?#]/, 1)[0] ?? '').replace(/\/+$/, '').toLowerCase() || '/'
  const under = /^\/(street\/[a-z0-9-]{1,40}(\/[a-z0-9-]{1,40})?|visit\/[a-z0-9-]{1,40})$/.test(path) ? `/${path.split('/')[1]}` : path
  return ENTRY_VARIANTS.find((variant) => variant.paths.includes(under)) ?? null
}
/** A text of a row's `place` words with the place put in: {place} is "Yaba, Lagos" (or the city alone), {city} the city. */
export const withPlace = (text: string, place: { city: string; name: string | null }): string => text.replace(/\{place\}/g, place.name ? `${place.name}, ${place.city}` : place.city).replace(/\{city\}/g, place.city)
/**
 * Detty December's cities and month in West Africa Time: the rule of src/festivals/detty-dates.ts, written again here so that the entry page
 * and its chunk load nothing more (src/festivals/detty.test.ts keeps the two equal).
 */
export const DECEMBER_CITIES: readonly string[] = Object.freeze(['lagos', 'accra', 'abuja'])
const inDecember = (now: number): boolean => new Date(now + 3600000).getUTCMonth() === 11
/** The place words of a row for a city at time `now`: December's for a season city while Detty December is on, else the row's own. */
export const placeWords = (variant: EntryVariant, cityId: string | null | undefined, now: number): EntryVariant['place'] => (variant.december && DECEMBER_CITIES.includes(cityId ?? '') && inDecember(now) ? variant.december : variant.place)
/** Every address a variant answers on, except the home page. */
export const VARIANT_PATHS: readonly string[] = Object.freeze(ENTRY_VARIANTS.flatMap((variant) => variant.paths).filter((path) => path !== '/'))
/** A text with the live figures put in. */
export const withFigures = (text: string, figures: { cities: number; countries: number }): string => text.replace(/\{cities\}/g, String(figures.cities)).replace(/\{countries\}/g, String(figures.countries))
