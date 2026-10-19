// AI agents as contacts, on this phone: the chats with them (each a few dozen lines) and the ones kept as contacts. The server keeps none of it
// (server/agents/contact.ts): the last lines of a chat are sent back with each new one so the answer follows the conversation. Lazy: only the
// AI agents screens and the chat import this. The pure functions take and return plain values; `agentBook` is the reactive copy the screens read.
import { reactive } from 'vue'
import type { OnlineAgent } from '../../../types/agents-http.ts'
import { dayLabel } from '../messages/messagesText.ts'

export const CHATS_KEY = 'aw.agentChats.v1', CONTACTS_KEY = 'aw.agentContacts.v1'
/** Lines kept per chat, chats kept, contacts kept, lines sent back with a new one. */
export const LINES_MAX = 40, CHATS_MAX = 30, CONTACTS_MAX = 60, HISTORY = 6

/** `me`: the person wrote it; `note`: the game's own words (asleep, help lines), never sent back. */
export interface ChatLine { me: boolean; text: string; at: number; note?: true }
export interface Chat { id: string; name: string; city: string; at: number; lines: ChatLine[] }
export interface Contact { id: string; name: string; city: string; at: number }

const isText = (value: unknown, max: number): value is string => typeof value === 'string' && value.length > 0 && value.length <= max
const isTime = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0

/** A stored value read back, keeping only what has the right shape. */
export function readChats(raw: string | null): Record<string, Chat> {
  const out: Record<string, Chat> = {}
  let parsed: unknown
  try { parsed = raw ? JSON.parse(raw) : null } catch { return out }
  if (!parsed || typeof parsed !== 'object') return out
  for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!isText(id, 120) || !value || typeof value !== 'object') continue
    const chat = value as Record<string, unknown>
    if (!isText(chat.name, 60) || typeof chat.city !== 'string' || !isTime(chat.at) || !Array.isArray(chat.lines)) continue
    const lines = chat.lines.flatMap((line: unknown): ChatLine[] => {
      if (!line || typeof line !== 'object') return []
      const l = line as Record<string, unknown>
      return isText(l.text, 600) && isTime(l.at) ? [{ me: l.me === true, text: l.text, at: l.at, ...(l.note === true ? { note: true as const } : {}) }] : []
    }).slice(-LINES_MAX)
    out[id] = { id, name: chat.name, city: chat.city, at: chat.at, lines }
  }
  return out
}
export function readContacts(raw: string | null): Contact[] {
  let parsed: unknown
  try { parsed = raw ? JSON.parse(raw) : [] } catch { return [] }
  if (!Array.isArray(parsed)) return []
  return parsed.flatMap((value: unknown): Contact[] => {
    if (!value || typeof value !== 'object') return []
    const c = value as Record<string, unknown>
    return isText(c.id, 120) && isText(c.name, 60) && typeof c.city === 'string' && isTime(c.at) ? [{ id: c.id, name: c.name, city: c.city, at: c.at }] : []
  }).slice(0, CONTACTS_MAX)
}

/** A line added to a chat (made when absent); the oldest chats beyond CHATS_MAX are dropped. */
export function addLine(chats: Record<string, Chat>, who: { id: string; name: string; city: string }, line: ChatLine): Record<string, Chat> {
  const was = chats[who.id]
  const next: Record<string, Chat> = { ...chats, [who.id]: { id: who.id, name: who.name, city: who.city, at: line.at, lines: [...(was?.lines ?? []), line].slice(-LINES_MAX) } }
  const ids = Object.keys(next)
  if (ids.length > CHATS_MAX) for (const id of ids.sort((a, b) => next[a]!.at - next[b]!.at).slice(0, ids.length - CHATS_MAX)) delete next[id]
  return next
}
/** The lines sent back with a new one: the last few, without the game's own notes. */
export const historyOf = (chat: Chat | undefined): { me: boolean; text: string }[] => (chat?.lines ?? []).filter((line) => !line.note).slice(-HISTORY).map((line) => ({ me: line.me, text: line.text.slice(0, 200) }))
/** Chats newest first. */
export const recentChats = (chats: Record<string, Chat>): Chat[] => Object.values(chats).sort((a, b) => b.at - a.at)
/** Keep or drop a contact; newest first. */
export function toggleContact(list: readonly Contact[], who: { id: string; name: string; city: string }, at: number): Contact[] {
  return list.some((c) => c.id === who.id) ? list.filter((c) => c.id !== who.id) : [{ id: who.id, name: who.name, city: who.city, at }, ...list].slice(0, CONTACTS_MAX)
}

/** A line of the chat on its way: shown at once as "Sending…", then kept, or "Not sent" with a Retry (like Messages' outbox). */
export interface Outgoing { id: string; text: string; status: 'sending' | 'failed'; reason?: string }
export type ChatRow =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'line'; key: string; line: ChatLine; /** The last of a run from one side: the time shows. */ tail: boolean }
  | { kind: 'out'; key: string; out: Outgoing }
/** A run is one side with no more than five minutes between lines and no day change. */
export const RUN_MS = 5 * 60000
/** The thread as drawn: day separators, the kept lines grouped into runs, then the lines still on their way. */
export function chatRows(lines: readonly ChatLine[], outgoing: readonly Outgoing[], now: number): ChatRow[] {
  const rows: ChatRow[] = []
  let day = ''
  const side = (line: ChatLine): string => (line.note ? 'note' : line.me ? 'me' : 'them')
  const joins = (a: ChatLine, b: ChatLine): boolean => side(a) === side(b) && side(a) !== 'note' && b.at - a.at <= RUN_MS && new Date(a.at).toDateString() === new Date(b.at).toDateString()
  for (const [index, line] of lines.entries()) {
    const key = new Date(line.at).toDateString()
    if (key !== day) { rows.push({ kind: 'day', key: `day:${key}`, label: dayLabel(line.at, now) }); day = key }
    const next = lines[index + 1]
    rows.push({ kind: 'line', key: `l:${index}`, line, tail: !next || !joins(line, next) })
  }
  if (outgoing.length && new Date(now).toDateString() !== day) rows.push({ kind: 'day', key: 'day:now', label: dayLabel(now, now) })
  for (const out of outgoing) rows.push({ kind: 'out', key: `o:${out.id}`, out })
  return rows
}
/** The chats whose name has the words typed (empty query: all), newest first. */
export const filterAgentChats = (chats: readonly Chat[], query: string): Chat[] => { const q = query.trim().toLowerCase(); return q ? chats.filter((chat) => chat.name.toLowerCase().includes(q)) : [...chats] }
/** A chat with an AI character as a row of the Messages list. */
export interface AiChatRow { kind: 'ai'; id: string; chat: Chat }
/** The Messages list with the AI chats in it, by time like any chat: pinned chats stay first, the AI chats (newest first) go in where their
 *  last line falls, and the ones older than every loaded chat come last. */
export function withAiChats<T extends { pinned?: boolean; last?: { at: number } | null }>(sorted: readonly T[], ai: readonly Chat[]): (T | AiChatRow)[] {
  const rows: (T | AiChatRow)[] = [], waiting = [...ai].sort((a, b) => b.at - a.at)
  for (const chat of sorted) {
    if (!chat.pinned) while (waiting.length && waiting[0]!.at > (chat.last?.at ?? 0)) { const next = waiting.shift()!; rows.push({ kind: 'ai', id: `ai:${next.id}`, chat: next }) }
    rows.push(chat)
  }
  for (const next of waiting) rows.push({ kind: 'ai', id: `ai:${next.id}`, chat: next })
  return rows
}
/** What a row says under the name: "Selling books · Balogun Market, Lagos", or the city alone. */
export function whereLine(agent: Pick<OnlineAgent, 'doing' | 'place' | 'cityName'>): string {
  const place = agent.place ? `${agent.place}, ${agent.cityName}` : agent.cityName
  return agent.doing ? `${agent.doing} · ${place}` : place
}

// ---- the copy the screens read, kept in localStorage -------------------------------------------------------------------------
const storage = (): Storage | null => { try { return globalThis.localStorage ?? null } catch { return null } }
const read = (key: string): string | null => { try { return storage()?.getItem(key) ?? null } catch { return null } }
const write = (key: string, value: unknown): void => { try { storage()?.setItem(key, JSON.stringify(value)) } catch { /* it is not kept */ } }

export const agentBook = reactive({ chats: readChats(read(CHATS_KEY)), contacts: readContacts(read(CONTACTS_KEY)) })
export function noteLine(who: { id: string; name: string; city: string }, line: ChatLine): void { agentBook.chats = addLine(agentBook.chats, who, line); write(CHATS_KEY, agentBook.chats) }
export function flipContact(who: { id: string; name: string; city: string }): boolean { agentBook.contacts = toggleContact(agentBook.contacts, who, Date.now()); write(CONTACTS_KEY, agentBook.contacts); return agentBook.contacts.some((c) => c.id === who.id) }
export const isContact = (id: string): boolean => agentBook.contacts.some((c) => c.id === id)
export function forgetChat(id: string): void { const next = { ...agentBook.chats }; delete next[id]; agentBook.chats = next; write(CHATS_KEY, next) }
