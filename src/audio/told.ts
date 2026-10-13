// WHEN THE ONE-TIME "Sound is on" TOAST MAY SHOW: only when nothing else is asking for attention (the walkthrough, the settle-in
// offer, the coach's goal line, the scene's walking lesson, a dialog). It stays unsaid until then and is tried again at the next sound.
export interface Prompts { tour: boolean; settle: boolean; coach: boolean; lesson: boolean; dialog: boolean }

export const quietNow = (prompts: Prompts): boolean => !(prompts.tour || prompts.settle || prompts.coach || prompts.lesson || prompts.dialog)

/** What is on screen now (read from the page). */
export function promptsOnScreen(doc: Document): Prompts {
  // Drawn, not merely in the page: the walking lesson is kept in the DOM while it waits its own turn.
  const shown = (selector: string): boolean => [...(doc.querySelectorAll?.(selector) ?? [])].some((node) => node.getClientRects().length > 0)
  return { tour: shown('[data-tour-layer]'), settle: shown('[data-settle-entry]'), coach: shown('.life-coach'), lesson: shown('.scene-hint'), dialog: shown('dialog[open]') }
}
