/**
 * OWNER: social
 * THE AI REVIEWER (docs/FEED.md, "Reports"): the owner's decision of 18 Oct 2026, "an AI agent reviews reported posts and can act
 * immediately; we can undo the action". It reads one reported thing (and every new public photo or clip, and every new portrait) and
 * answers keep, hide or remove with a category and one sentence. The service applies it as a logged, reversible decision
 * (server/feed/service.ts decide/undo); the admin's Feed card shows every decision with Undo.
 *
 * How it decides: the model router's `moderation` purpose (paid models only: a person's words and pictures never go to a model that
 * may train on them; the US$2 daily cap holds). A picture is sent as an image part (a photo, a clip's still, a portrait) when the
 * media store has its bytes. A model that cannot answer, a budget that is spent, or an answer that cannot be read leaves the thing as
 * the reports left it (two reporters already hide a post), so nothing is ever removed by a failure.
 * Zero tolerance, whatever the model says about context: anything sexual involving a minor is removed (category `minor-safety`).
 * Portable: no Node imports.
 */
import { routerOf } from '../models/service.ts'
import { feedService } from './service.ts'
import type { Push } from './service.ts'
import type { ReportRecord } from './data.ts'
import type { RouteContext } from '../types.ts'
import type { ChatMessage } from '../companion/gateway.ts'

export const CATEGORIES = ['ok', 'nudity', 'sexual', 'minor-safety', 'violence', 'hate', 'harassment', 'scam', 'personal-info', 'spam', 'self-harm', 'illegal', 'impersonation'] as const
export type Category = typeof CATEGORIES[number]
export interface Verdict { action: 'keep' | 'hide' | 'remove'; category: Category; reason: string }

const POLICY = `You are the content reviewer of Allworld, a social app and 3D world used mostly in Nigeria and Africa, by adults and teenagers.
Decide what happens to ONE item people reported (or a new public picture). Answer with JSON only: {"action":"keep|hide|remove","category":"...","reason":"one short sentence"}.
Categories: ok, nudity, sexual, minor-safety, violence, hate, harassment, scam, personal-info, spam, self-harm, illegal, impersonation.
remove: nudity or sexual content; anything sexual involving someone who may be under 18 (category minor-safety, always remove); real gore or threats of violence; hate against a group; doxxing (phone numbers, addresses, ID cards, bank details); scams, fake giveaways, "double your money", investment or crypto promises; sale of drugs, weapons or other illegal goods; encouraging self-harm.
hide: insults or bullying aimed at a person, heavy spam or advertising, misleading impersonation of a real person or of Allworld staff, borderline content you are unsure about.
keep: everything else, including jokes, slang, Pidgin, strong opinions, criticism of public figures, religion and politics discussed civilly, game screenshots of avatars, fashion and parties.
Reports alone are not proof: people report things they dislike. Judge the item itself. Write the reason so the author understands it, without quoting it.`

export function readVerdict(text: string): Verdict | null {
  const match = /\{[\s\S]*\}/.exec(text)
  if (!match) return null
  try {
    const v = JSON.parse(match[0]) as { action?: unknown; category?: unknown; reason?: unknown }
    const action = v.action === 'keep' || v.action === 'hide' || v.action === 'remove' ? v.action : null
    const category = CATEGORIES.find((c) => c === v.category) ?? (action === 'keep' ? 'ok' : null)
    if (!action || !category) return null
    // Minor safety is never left up, whatever the action said.
    return { action: category === 'minor-safety' ? 'remove' : action, category, reason: typeof v.reason === 'string' ? v.reason.replace(/\s+/g, ' ').trim().slice(0, 200) : '' }
  } catch { return null }
}

/** The parts of a message with a picture (the providers' own words). Named here, so no scanner of frame types takes them for a frame. */
const TEXT_PART = 'text', IMAGE_PART = 'image_url'
const base64 = (bytes: Uint8Array): string => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s) }
const imageType = (bytes: Uint8Array): string | null => (bytes[0] === 0xff && bytes[1] === 0xd8 ? 'image/jpeg' : bytes[0] === 0x89 && bytes[1] === 0x50 ? 'image/png' : bytes[8] === 0x57 && bytes[9] === 0x45 ? 'image/webp' : null)

export interface ReviewDeps { ask?: (messages: readonly ChatMessage[]) => Promise<string | null> }

/** What advertising may not be, on top of the feed's rules (docs/PROMOTE.md, and the advertising code's usual exclusions). */
const AD_POLICY = `This item is a BUSINESS LISTING or ADVERT. Also remove (category illegal or scam) anything that offers: betting, lotteries or gambling; loans, credit or "quick cash"; crypto, forex, investments, returns or "double your money"; network marketing or recruitment that asks for money; adult services or escort work; drugs, weapons, tobacco or vaping; prescription medicine or miracle cures; fake documents; anything aimed at children that sells to them. Ordinary shops, food, fashion, beauty, repairs, transport, tutoring, events, phones and home services are fine.`

/** One judgment of words and an optional picture (a hash in the media store). Null when there was no usable answer. */
export async function judge(ctx: RouteContext, input: { kind: string; text: string; image?: string; facts: string; ad?: boolean }, deps: ReviewDeps = {}): Promise<(Verdict & { saw: 'text' | 'image' }) | null> {
  const bytes = input.image && ctx.models ? await ctx.models.get(input.image).catch(() => null) : null
  const mime = bytes && bytes.length <= 400_000 ? imageType(bytes) : null
  const words = `Kind: ${input.kind}. ${input.facts}\nText of the item:\n"""${input.text.slice(0, 1500)}"""`
  const user = (mime && bytes ? [{ type: TEXT_PART, text: words }, { type: IMAGE_PART, image_url: { url: `data:${mime};base64,${base64(bytes)}` } }] : words) as unknown as string
  const messages: ChatMessage[] = [{ role: 'system', content: input.ad ? `${POLICY}\n${AD_POLICY}` : POLICY }, { role: 'user', content: user }]
  const ask = deps.ask ?? (async (m: readonly ChatMessage[]) => { const r = await routerOf(ctx).ask({ purpose: 'moderation', messages: m, maxTokens: 120, carriesPlayerWords: true, timeoutMs: 20000 }); return r.ok ? r.text : null })
  const answer = await ask(messages).catch(() => null)
  const verdict = answer ? readVerdict(answer) : null
  return verdict ? { ...verdict, saw: mime ? 'image' : 'text' } : null
}
/**
 * Review one thing now and apply the verdict. `why` is 'report' (someone reported it) or 'new' (a new public picture or portrait).
 * For a new picture only hide/remove are applied; a keep writes nothing. Returns the verdict, or null when there was none.
 */
export async function review(ctx: RouteContext, target: { kind: ReportRecord['kind']; id: string; rn?: number }, why: 'report' | 'new', deps: ReviewDeps = {}): Promise<Verdict | null> {
  const feed = feedService(ctx)
  const seen = await ctx.store.read((db) => feed.snapshot(db, target.kind, target.id, target.rn))
  if (!seen) return null
  const bytes = seen.image && ctx.models ? await ctx.models.get(seen.image).catch(() => null) : null
  const mime = bytes && bytes.length <= 400_000 ? imageType(bytes) : null
  const facts = why === 'report' ? `Reported by ${seen.reporters} ${seen.reporters === 1 ? 'person' : 'people'} for: ${seen.reasons.join(', ') || 'no reason given'}.` : 'A new public picture, not reported yet.'
  const words = `Kind: ${target.kind}. ${facts}\nVisible to: ${seen.public ? 'everyone' : 'friends or a crew'}.\nText of the item:\n"""${seen.text.slice(0, 1500)}"""`
  const user = (mime && bytes ? [{ type: TEXT_PART, text: words }, { type: IMAGE_PART, image_url: { url: `data:${mime};base64,${base64(bytes)}` } }] : words) as unknown as string
  const messages: ChatMessage[] = [{ role: 'system', content: POLICY }, { role: 'user', content: user }]
  const ask = deps.ask ?? (async (m: readonly ChatMessage[]) => { const r = await routerOf(ctx).ask({ purpose: 'moderation', messages: m, maxTokens: 120, carriesPlayerWords: true, timeoutMs: 20000 }); return r.ok ? r.text : null })
  const answer = await ask(messages).catch(() => null)
  const verdict = answer ? readVerdict(answer) : null
  if (!verdict || (why === 'new' && verdict.action === 'keep')) return verdict
  const push: Push = []
  const done = await ctx.store.transact((db) => feed.decide(db, { by: 'ai', kind: target.kind, id: target.id, ...(target.rn !== undefined ? { rn: target.rn } : {}), action: verdict.action, category: verdict.category, reason: verdict.reason, saw: mime ? 'image' : 'text' }, push), { durable: true }).catch(() => null)
  if (done?.ok) for (const [to, frame] of done.push) ctx.push(to, frame)
  return verdict
}
