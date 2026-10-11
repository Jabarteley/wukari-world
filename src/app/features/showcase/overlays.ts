// The things open on top of the Services app that Escape must close before it closes anything else: the photo viewer, for one.
// The app's key hook (ShowcaseApp.vue, called by the shell for Escape) closes the last one opened and says it handled the key,
// so the app itself stays open. Plain module state: only one Services app is ever open.
const stack: (() => void)[] = []

/** Register something Escape closes. Returns the function that forgets it again (called when it closes by any other way). */
export function pushOverlay(close: () => void): () => void {
  stack.push(close)
  return () => { const at = stack.lastIndexOf(close); if (at >= 0) stack.splice(at, 1) }
}
/** Close the most recent overlay. True when there was one (the key is handled). */
export function closeTopOverlay(): boolean {
  const top = stack.pop()
  if (!top) return false
  top()
  return true
}
export const overlayCount = (): number => stack.length
