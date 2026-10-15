// City works on the phone (docs/SMALLER-FEATURES.md): reading GET /api/world/works and the words for the card. Pure: no fetch, no Vue.
// Loaded only with the Gist app's works card, never at first paint.
export interface WorkActive { id: string; label: string; line: string; paid: number; cost: number; gifts: number }
export interface WorkDone { id: string; label: string; line: string; at: number }
export interface WorksAnswer { active: WorkActive | null; done: WorkDone[]; order: string[]; later: { id: string; label: string }[]; limits: { min: number; max: number; daily: number }; canOrder: boolean }

const text = (value: unknown, max: number): string => (typeof value === 'string' ? value.slice(0, max) : '')
const whole = (value: unknown): number => (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0)
const row = (value: unknown): Record<string, unknown> | null => (value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null)

export const worksPath = (city: string): string => `/api/world/works?id=${encodeURIComponent(city)}`

/** An answer read defensively; null when it is not one. */
export function readWorks(answer: unknown): WorksAnswer | null {
  const body = row(answer)
  if (!body || !Array.isArray(body.done) || !Array.isArray(body.order)) return null
  const active = row(body.active)
  const limits = row(body.limits)
  return {
    active: active && text(active.id, 20) ? { id: text(active.id, 20), label: text(active.label, 40), line: text(active.line, 120), paid: whole(active.paid), cost: Math.max(1, whole(active.cost)), gifts: whole(active.gifts) } : null,
    done: body.done.flatMap((item) => { const d = row(item); return d && text(d.id, 20) ? [{ id: text(d.id, 20), label: text(d.label, 40), line: text(d.line, 120), at: whole(d.at) }] : [] }),
    order: body.order.filter((id): id is string => typeof id === 'string').slice(0, 10),
    later: Array.isArray(body.later) ? body.later.flatMap((item) => { const l = row(item); return l && text(l.id, 20) ? [{ id: text(l.id, 20), label: text(l.label, 40) }] : [] }).slice(0, 10) : [],
    limits: { min: whole(limits?.min) || 100, max: whole(limits?.max) || 5000, daily: whole(limits?.daily) || 10000 },
    canOrder: row(body.you)?.canOrder === true,
  }
}
/** The bar's width, 0 to 100. */
export const percentOf = (work: Pick<WorkActive, 'paid' | 'cost'>): number => Math.max(0, Math.min(100, Math.floor((work.paid / work.cost) * 100)))
/** The gifts the buttons offer: the smallest, a middle one and the most, inside the limits and not past what is left. */
export function giftChoices(work: Pick<WorkActive, 'paid' | 'cost'>, limits: WorksAnswer['limits']): number[] {
  const left = Math.max(0, work.cost - work.paid)
  return [...new Set([limits.min * 5, limits.max / 2, limits.max].map((amount) => Math.min(amount, left)).filter((amount) => amount >= limits.min))]
}
/** The order with `id` moved to the front (what "do this next" sends). */
export const firstInOrder = (order: readonly string[], id: string): string[] => [id, ...order.filter((item) => item !== id)]
