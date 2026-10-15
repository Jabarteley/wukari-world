// The Pray action's rules without a browser (docs/PRAYERS.md). The panel (PrayRow.vue) is fetched only at a place of worship, so none of this is in
// the first download. A player is shown the notice BEFORE the box to write in; the server refuses a prayer sent without having been told (`notice: true`).
export const PRAY_MIN = 4
export const PRAY_MAX = 240
/** The words the panel shows if the server's own have not arrived (they are the same words). */
export const NOTICE = 'Prayers are read by the people who run Allworld.'

export type PrayStep = 'closed' | 'notice' | 'write' | 'sent'
/** The steps in order: closed, the notice, the box, sent. Only `continueFrom` moves past the notice, so the box cannot be reached unseen. */
export function nextStep(step: PrayStep, event: 'open' | 'continue' | 'sent' | 'close'): PrayStep {
  if (event === 'close') return 'closed'
  if (event === 'open') return step === 'closed' || step === 'sent' ? 'notice' : step
  if (event === 'continue') return step === 'notice' ? 'write' : step
  return step === 'write' ? 'sent' : step
}
/** Can this text be sent now? */
export function canSend(step: PrayStep, text: string, left: number, busy: boolean): boolean {
  const length = text.replace(/\s+/g, ' ').trim().length
  return step === 'write' && !busy && left > 0 && length >= PRAY_MIN && length <= PRAY_MAX
}
/** The body of the request: the notice flag is true only when the player has passed the notice step. */
export function prayerBody(step: PrayStep, text: string, venue: string): { text: string; notice: true; venue?: string } | null {
  if (step !== 'write') return null
  return { text: text.replace(/\s+/g, ' ').trim().slice(0, PRAY_MAX), notice: true, ...(venue ? { venue } : {}) }
}
/** Is this scene kind a place of worship (a church, a mosque, a shrine)? Faiths are treated alike. */
export const isWorship = (kind: unknown): boolean => kind === 'worship' || kind === 'shrine'
