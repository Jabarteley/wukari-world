/**
 * THE ENTRY VARIANTS: the one small table behind the entry page of a new visitor. Each row is an address an advert or a shared link can
 * point at (`/`, `/shops`, `/services`, `/games`, `/cities`, `/agents`) with what that page says, what its first button does and where
 * the visitor ends up. The page (src/app/features/start/EntryPage.vue) and both hosts (server/path-meta.ts, for the link preview) read
 * this table and nothing else, so a new variant is a row, not a page. Plain data: no Vue, no registry, nothing a player typed.
 *
 *   {cities} and {countries} in a text are filled from the city catalogue (the page) or the registry (the hosts): no number is written here.
 *   `lands`: what the first button does once the life exists. 'shop' opens My shop in the Services app with a kind preselected
 *   (src/paths.ts keeps that as the address's own intent); 'address' leaves it to the address (the Games app, the world map).
 */
export type EntryVariantId = 'home' | 'shops' | 'services' | 'games' | 'cities' | 'agents'

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
}

const TAIL = 'Free in your browser, no download.'

export const ENTRY_VARIANTS: readonly EntryVariant[] = Object.freeze([
  {
    id: 'home', paths: ['/'], title: 'Allworld: a digital world you can live in',
    description: 'A digital world to live in. Real cities across Africa, with more opening: work, travel, make friends and play. Free in your browser, no download.',
    headline: 'A digital world you can live in', pitch: '{cities} real cities across Africa, and more opening. Free, in your browser, no download.',
    tiles: [{ icon: 'pin', label: 'Live in a real city' }, { icon: 'earn', label: 'Work and earn' }, { icon: 'boutique', label: 'Open a shop for your real business' }, { icon: 'people', label: 'Friends, voice and games' }],
    image: null, og: '/og/allworld.jpg', primary: { label: 'Play now', kind: 'play' }, secondary: [{ label: 'Find my city', kind: 'find' }],
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
    description: 'Your own AI assistant can play Allworld for you: travel, work and eat. Agent characters are labelled. Coming soon. Free in your browser.',
    headline: 'Let your AI agent play Allworld', pitch: 'Your own AI assistant can read your life and take actions like travelling, working and eating. Agent connections are coming soon.',
    tiles: [{ icon: 'link', label: 'Your own agent, your own tools' }, { icon: 'person', label: 'Agent characters are labelled' }, { icon: 'lock', label: 'Disconnect any time' }, { icon: 'game', label: 'Same world as everyone' }],
    image: null, og: '/og/allworld.jpg', primary: { label: 'Play now', kind: 'play' }, secondary: [{ label: 'How agents will work', kind: 'agent' }],
  },
] satisfies readonly EntryVariant[])

/** The variant an address belongs to (query and trailing slash ignored), or null. */
export function variantOf(pathname: string): EntryVariant | null {
  const path = (pathname.split(/[?#]/, 1)[0] ?? '').replace(/\/+$/, '').toLowerCase() || '/'
  return ENTRY_VARIANTS.find((variant) => variant.paths.includes(path)) ?? null
}
/** Every address a variant answers on, except the home page. */
export const VARIANT_PATHS: readonly string[] = Object.freeze(ENTRY_VARIANTS.flatMap((variant) => variant.paths).filter((path) => path !== '/'))
/** A text with the live figures put in. */
export const withFigures = (text: string, figures: { cities: number; countries: number }): string => text.replace(/\{cities\}/g, String(figures.cities)).replace(/\{countries\}/g, String(figures.countries))
