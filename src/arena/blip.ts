/**
 * OWNER: games (real-time)
 * One short rising "someone arrived" blip for lobbies, made with Web Audio (no file). Follows the effects volume and mute.
 */
import { soundLevel } from '../audio/levels.ts'

let ctx: AudioContext | null = null
export function joinBlip(): void {
  try {
    const vol = soundLevel('effects') * 0.25
    if (vol <= 0.001) return
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    const t = ctx.currentTime
    for (const [i, freq] of [660, 990].entries()) {
      const osc = ctx.createOscillator(), g = ctx.createGain()
      osc.type = 'triangle'; osc.frequency.value = freq
      g.gain.setValueAtTime(vol, t + i * 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.08 + 0.16)
      osc.connect(g).connect(ctx.destination); osc.start(t + i * 0.08); osc.stop(t + i * 0.08 + 0.2)
    }
  } catch { /* no audio */ }
}
