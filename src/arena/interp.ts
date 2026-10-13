/**
 * OWNER: games (real-time)
 * The client's view of time for a stream of server snapshots: a small jitter buffer.
 *
 * The server stamps each snapshot with its tick number `k` (one per 1000/hz ms). The browser records when each arrived. The
 * smallest (arrival − k·dt) seen is the best estimate of "tick 0 on my clock" (the fastest packet had the least delay); it
 * creeps up slowly so a clock that drifts, or a network that got slower for good, is followed. A frame is drawn for tick
 * `now/dt − delay`, a couple of ticks in the past, which is always between two snapshots that have already arrived:
 * smooth motion at 60 fps from 20 snapshots a second, and a late packet or two cost nothing. A tick that changed nothing is
 * never sent, so a gap in `k` simply means "no change in between".
 */
export interface Sample<S> { k: number; at: number; s: S }
export interface Picked<S> { a: S; b: S; /** 0..1 from a to b */ t: number; /** the tick drawn (fractional) */ tick: number }

export class Timeline<S> {
  private samples: Sample<S>[] = []
  private offset: number = Number.POSITIVE_INFINITY
  readonly dtMs: number
  readonly delayTicks: number
  private readonly keep: number
  constructor(dtMs: number, delayTicks = 2, keep = 12) { this.dtMs = dtMs; this.delayTicks = delayTicks; this.keep = keep }

  get length(): number { return this.samples.length }
  get last(): Sample<S> | undefined { return this.samples[this.samples.length - 1] }
  clear(): void { this.samples = []; this.offset = Number.POSITIVE_INFINITY }

  /** A snapshot arrived (`at` = performance.now()). Out-of-order and repeated ticks are ignored. */
  push(k: number, at: number, s: S): void {
    const last = this.last
    if (last && k <= last.k) return
    const candidate = at - k * this.dtMs
    this.offset = candidate < this.offset ? candidate : this.offset + (candidate - this.offset) * 0.02
    this.samples.push({ k, at, s })
    if (this.samples.length > this.keep) this.samples.shift()
  }

  /** The two snapshots around the moment to draw at `now`, and how far between them; null before the first snapshot. */
  pick(now: number): Picked<S> | null {
    const list = this.samples
    const first = list[0], last = list[list.length - 1]
    if (!first || !last) return null
    const tick = (now - this.offset) / this.dtMs - this.delayTicks
    if (tick <= first.k) return { a: first.s, b: first.s, t: 0, tick }
    if (tick >= last.k) return { a: last.s, b: last.s, t: 0, tick }
    for (let i = list.length - 1; i > 0; i--) {
      const b = list[i] as Sample<S>, a = list[i - 1] as Sample<S>
      if (tick >= a.k) return { a: a.s, b: b.s, t: (tick - a.k) / (b.k - a.k), tick }
    }
    return { a: first.s, b: first.s, t: 0, tick }
  }
}
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
