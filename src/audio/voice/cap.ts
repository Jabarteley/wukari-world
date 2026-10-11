// At most three voices sound at once, the nearest first. A speaker who talks again replaces their own last line; a newcomer takes the
// place of the farthest voice only when nearer than it; otherwise the newcomer is not heard. Pure: the caller says what time it is.

export const MAX_VOICES = 3
export interface Active { id: string; distance: number; until: number }
export interface Verdict { ok: boolean; /** The voice to fade out to make room. */ evict?: string }

export class Cap {
  private readonly active: Active[] = []
  /** Voices still sounding at `now`. */
  live(now: number): Active[] {
    for (let i = this.active.length - 1; i >= 0; i--) if ((this.active[i] as Active).until <= now) this.active.splice(i, 1)
    return [...this.active]
  }
  count(now: number): number { return this.live(now).length }
  admit(id: string, distance: number, now: number, until: number): Verdict {
    const list = this.live(now)
    const own = list.find(item => item.id === id)
    if (own) { Object.assign(own, { distance, until }); return { ok: true, evict: id } }
    if (list.length < MAX_VOICES) { this.active.push({ id, distance, until }); return { ok: true } }
    const farthest = list.reduce((far, item) => item.distance > far.distance ? item : far)
    if (distance >= farthest.distance) return { ok: false }
    this.active.splice(this.active.indexOf(farthest), 1)
    this.active.push({ id, distance, until })
    return { ok: true, evict: farthest.id }
  }
  release(id: string): void { const at = this.active.findIndex(item => item.id === id); if (at >= 0) this.active.splice(at, 1) }
  clear(): void { this.active.length = 0 }
}
