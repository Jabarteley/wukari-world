export interface Disposable { dispose(): void }
/** One current resource; a late loader can never replace a newer selection. */
export function resourceSlot() {
  let revision = 0, current: Disposable | null = null, closed = false
  return {
    async replace<T extends Disposable>(load: (isCurrent: () => boolean) => Promise<T>): Promise<T | null> {
      const own = ++revision
      current?.dispose(); current = null
      if (closed) return null
      const isCurrent = () => !closed && own === revision
      const next = await load(isCurrent)
      if (!isCurrent()) { next.dispose(); return null }
      current = next
      return next
    },
    clear() { ++revision; current?.dispose(); current = null },
    dispose() { closed = true; ++revision; current?.dispose(); current = null },
  }
}
