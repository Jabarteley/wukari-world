// "While you were away", the calm sheet: what happened in the city, who wrote, rent or bills, and one thing to do next.
// Pure, so it is tested without a browser. The words follow src/game/digest.ts: a fact and an opening, never a loss, a streak,
// a countdown or "we missed you". It reads only what the signed-in player already has loaded (their own inbox, their own
// notices, the public Hall of Records); of another player it names who wrote or gave, never what they said. It is not in
// src/game on purpose: only this lazy sheet uses it, and src/game is in the first download.
import type { RecordEntryView } from '../../../types/records.ts'
import type { Notice } from '../../../types/life.ts'
import type { SocialOverview } from '../../../types/social.ts'

/** A sheet is offered after this many hours away, the same as the card (src/game/digest.ts DIGEST.awayAfterHours). */
export const AWAY_SHEET_HOURS = 3
/** Public news per section: the rest is counted. */
export const AWAY_SHEET_NEWS = 4
/** Notice kinds that are about the city, not about the player. */
const CITY_NOTICE_KINDS: readonly string[] = ['gov', 'power']
/** Notice kinds about money owed. */
const BILL_NOTICE_KINDS: readonly string[] = ['rent-due', 'rent', 'rent-missed', 'loan', 'loan-missed']

export interface AwayLine { id: string; text: string; app?: string; params?: unknown }
export interface AwaySection { id: 'city' | 'people' | 'money'; title: string; lines: AwayLine[]; more: number }
export interface AwayNext { text: string; app: string; params?: unknown }
export interface AwaySheet { title: string; sub: string; sections: AwaySection[]; next: AwayNext | null }

export interface AwaySheetInput {
  /** Hours since the player was last seen (the growth hello). */
  hoursAway: number
  /** Server ms the player was last seen; entries and updates older than this are not "since you left". */
  since: number | null
  me: Pick<SocialOverview, 'friends' | 'requests' | 'conversations' | 'updates'> | null
  /** The player's own notices (view.social.notices). */
  notices?: readonly Pick<Notice, 'id' | 'kind' | 'text' | 'at'>[]
  /** Public record entries (the Hall of Records), newest first. */
  records?: readonly Pick<RecordEntryView, 'n' | 'at' | 'title'>[]
  /** Rent or loan instalments the balance will not cover (bank/bankModel.ts billsDue). */
  billsDue?: number
  /** Finished missions waiting to be collected. */
  claimable?: number
  /** An event on now, if there is one. */
  liveEvent?: { title: string; venueLabel: string } | null
}

const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`
const cut = (lines: AwayLine[], max: number): { lines: AwayLine[]; more: number } => ({ lines: lines.slice(0, max), more: Math.max(0, lines.length - max) });
const firstName = (name: string): string => String(name ?? '').trim().split(/\s+/)[0] || 'Someone'

/** Public city news since the player left: city notices first, then the newest public records. */
export function cityLines(input: Pick<AwaySheetInput, 'since' | 'notices' | 'records'>): AwayLine[] {
  const since = input.since ?? 0, lines: AwayLine[] = []
  for (const notice of input.notices ?? []) if (CITY_NOTICE_KINDS.includes(notice.kind) && notice.at >= since) lines.push({ id: `notice:${notice.id}`, text: notice.text, app: notice.kind === 'gov' ? 'governor' : undefined })
  for (const entry of input.records ?? []) if (entry.at >= since) lines.push({ id: `record:${entry.n}`, text: entry.title, app: 'politics', params: { tab: 'records' } })
  return lines
}

/** People: who wrote (names and counts, never text), friend requests, gifts. Only the player's own inbox is read. */
export function peopleLines(me: AwaySheetInput['me'], since: number | null): AwayLine[] {
  if (!me) return []
  const after = since ?? 0, lines: AwayLine[] = []
  for (const request of me.requests.in) lines.push({ id: `friend:${request.id}`, text: `${firstName(request.name)} would like to be friends`, app: 'people' })
  const unread = me.conversations.filter((conv) => conv.unread && !conv.muted)
  if (unread.length === 1 && unread[0]) lines.push({ id: `chat:${unread[0].id}`, text: unread[0].kind === 'dm' ? `${firstName(unread[0].name)} wrote to you` : `${unread[0].name} has something new`, app: 'messages', params: { conv: unread[0].id } })
  else if (unread.length > 1) lines.push({ id: 'chats', text: `${plural(unread.length, 'chat')} with something new`, app: 'messages' })
  const names = new Map(me.friends.map((friend) => [friend.id, friend.name]))
  const gifts = me.updates.filter((update) => update.kind === 'transfer' && update.at >= after && update.data?.from)
  for (const gift of gifts.slice(0, 3)) lines.push({ id: `gift:${gift.id}`, text: `${firstName(names.get(gift.data?.from ?? '') ?? '')} sent you a gift`, app: 'statement' })
  if (gifts.length > 3) lines.push({ id: 'gifts', text: `${gifts.length - 3} more gifts from friends`, app: 'statement' })
  return lines
}

/** Money: rent or an instalment the balance will not cover, from the player's own notices. */
export function moneyLines(input: Pick<AwaySheetInput, 'notices' | 'billsDue'>): AwayLine[] {
  const lines: AwayLine[] = []
  const bill = [...(input.notices ?? [])].reverse().find((notice) => BILL_NOTICE_KINDS.includes(notice.kind))
  if (bill) lines.push({ id: `bill:${bill.id}`, text: bill.text, app: 'bank' })
  else if (input.billsDue) lines.push({ id: 'bills', text: input.billsDue === 1 ? 'A bill is ready to be paid' : `${input.billsDue} bills are ready to be paid`, app: 'bank' })
  return lines
}

/** The one thing to suggest: something owed, then a person, then a prize, then an event, then a calm default. */
export function nextThing(input: AwaySheetInput, sections: readonly AwaySection[]): AwayNext | null {
  const has = (id: AwaySection['id']): AwayLine | undefined => sections.find((section) => section.id === id)?.lines[0]
  const money = has('money'), person = has('people')
  if (money) return { text: 'Look at the Bank', app: 'bank' }
  if (person) return { text: person.app === 'people' ? 'Answer the friend request' : person.app === 'statement' ? 'See the gift in your statement' : 'Read your messages', app: person.app ?? 'messages', params: person.params }
  if (input.claimable) return { text: `Collect ${plural(input.claimable, 'finished mission')}`, app: 'missions' }
  if (input.liveEvent) return { text: `Join ${input.liveEvent.title}`, app: 'events' }
  return sections.length ? { text: 'Pick one thing for today in Missions', app: 'missions' } : null
}

const hoursWord = (hours: number): string => (hours >= 48 ? `${Math.floor(hours / 24)} days` : hours >= 24 ? 'a day' : `${Math.max(1, Math.floor(hours))} hour${Math.floor(hours) === 1 ? '' : 's'}`)

/** The sheet for a returning player, or null: not away long enough, or nothing to say. */
export function buildAwaySheet(input: AwaySheetInput): AwaySheet | null {
  if (!Number.isFinite(input.hoursAway) || input.hoursAway < AWAY_SHEET_HOURS) return null
  const sections: AwaySection[] = []
  const add = (id: AwaySection['id'], title: string, lines: AwayLine[], max: number): void => { if (lines.length) sections.push({ id, title, ...cut(lines, max) }) }
  add('city', 'In the city', cityLines(input), AWAY_SHEET_NEWS)
  add('people', 'Your people', peopleLines(input.me, input.since), AWAY_SHEET_NEWS)
  add('money', 'Money', moneyLines(input), 2)
  if (!sections.length) return null
  return { title: 'While you were away', sub: `${hoursWord(input.hoursAway)} passed. Here is what is new. Nothing was taken from you.`, sections, next: nextThing(input, sections) }
}
