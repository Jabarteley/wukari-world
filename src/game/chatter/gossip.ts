// Gossip: harmless true things a regular passes on from the game's own PUBLIC record (REALISM R3). Pure; no DOM, no network.
//
// THE RULE. A line is built only from the fields of PublicRecord below, and each of those is something the game already shows to everyone: a
// civic headline in the city's news, an event on the city's calendar, the sky, a shop the street can see, the board's leader. Nothing about
// a player's money, place, messages or whether they are online can be said here, because there is no field to say it from, and the test
// (gossip.test.ts) hands every builder a record with such fields added and fails if one of them comes out, and reads this file's source for
// the words that must never appear. A player's public deed may be named only where the game already shows it publicly (a result, an opening);
// nothing is ever said about a real person outside the game.
/** What may be passed on. Every member is optional: a regular says what the game has to say and nothing else. */
export interface PublicRecord {
  /** The latest city headlines (results, phases, the Governor's announcements), each as it was posted to everyone. */
  news?: readonly string[]
  /** An event on the city's own calendar in the next day or two. */
  event?: { title: string; where: string; when: string }
  /** The sky: rain is coming, or tomorrow's. */
  rain?: 'soon' | 'later' | 'tomorrow'
  /** A shop that opened, as the street list shows it. */
  shop?: { name: string; street: string }
  /** Which city tops this week's public board. */
  board?: { name: string; city: string }
  /** The office and the name its holder is elected under, as the public results show them. */
  office?: { title: string; holder: string }
  /** A neighbour's housewarming: only the street (never whose). */
  housewarming?: { street: string }
}

export interface Gossip { id: string; text: string }

const clip = (text: string, max: number): string => (text.length > max ? `${text.slice(0, max - 1)}…` : text)
const word = (value: unknown, max = 60): string | null => (typeof value === 'string' && value.trim().length > 1 ? clip(value.replace(/\s+/g, ' ').trim(), max) : null)

const RAIN: Record<NonNullable<PublicRecord['rain']>, string> = {
  soon: 'Look at that sky. It will rain before long, mark my words.',
  later: 'My knee says it will rain this evening. Carry something.',
  tomorrow: 'They say tomorrow will be wet. Plan your day well.',
}

/**
 * The lines that can be said from a record, in a stable order. Nothing is read from the record except the named members, and each is
 * shortened and checked as plain text; a member that is not a word is left out.
 */
export function gossipFrom(record: PublicRecord | null | undefined, cityName: string): Gossip[] {
  const out: Gossip[] = []
  const r = record ?? {}
  for (const [index, headline] of (Array.isArray(r.news) ? r.news : []).slice(0, 3).entries()) {
    const text = word(headline, 110)
    if (text) out.push({ id: `news-${index}`, text: `The news says: ${text}` })
  }
  const event = r.event, title = word(event?.title), where = word(event?.where), when = word(event?.when, 24)
  if (title && where && when) out.push({ id: 'event', text: `Have you heard? ${title} at ${where}, ${when}. I might go.` })
  if (r.rain === 'soon' || r.rain === 'later' || r.rain === 'tomorrow') out.push({ id: 'rain', text: RAIN[r.rain] })
  const shop = word(r.shop?.name), street = word(r.shop?.street)
  if (shop && street) out.push({ id: 'shop', text: `A new shop opened on ${street}: ${shop}. Go and see.` })
  const board = word(r.board?.name, 30), top = word(r.board?.city, 30)
  if (board && top) out.push({ id: 'board', text: `${top} is on top of this week's ${board} board. ${cityName === top ? 'Our own!' : 'We must try harder.'}` })
  const title2 = word(r.office?.title, 40), holder = word(r.office?.holder, 40)
  if (title2 && holder) out.push({ id: 'office', text: `Our ${title2} is ${holder}, as everybody knows.` })
  const warm = word(r.housewarming?.street)
  if (warm) out.push({ id: 'warming', text: `A neighbour is having a housewarming on ${warm}. Good food, I hope.` })
  return out
}
