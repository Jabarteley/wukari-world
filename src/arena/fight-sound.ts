/**
 * OWNER: games (real-time)
 * Fight's sound effects: short Web Audio blips made on the spot (no files). They follow the player's effects volume and mute
 * (src/audio/settings.ts). The context is created on the first tap or key press (browsers keep a page silent until then).
 */
import { soundLevel } from '../audio/levels.ts'

export interface FightSound { unlock(): void; swing(): void; hit(strong: boolean, blocked: boolean): void; jump(): void; ko(): void; bell(): void; close(): void }

export function createFightSound(): FightSound {
  let ctx: AudioContext | null = null
  const level = (): number => { try { return soundLevel('effects') } catch { return 0.5 } }
  function tone(freq: number, to: number, ms: number, type: OscillatorType, gain: number, delay = 0): void {
    const vol = level() * gain
    if (!ctx || vol <= 0.001) return
    const t = ctx.currentTime + delay, osc = ctx.createOscillator(), g = ctx.createGain()
    osc.type = type; osc.frequency.setValueAtTime(freq, t); osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + ms / 1000)
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000)
    osc.connect(g).connect(ctx.destination); osc.start(t); osc.stop(t + ms / 1000 + 0.02)
  }
  function noise(ms: number, gain: number, freq: number): void {
    const vol = level() * gain
    if (!ctx || vol <= 0.001) return
    const n = Math.floor(ctx.sampleRate * ms / 1000), buf = ctx.createBuffer(1, n, ctx.sampleRate), data = buf.getChannelData(0)
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n)
    const src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), g = ctx.createGain()
    filter.type = 'bandpass'; filter.frequency.value = freq; g.gain.value = vol
    src.buffer = buf; src.connect(filter).connect(g).connect(ctx.destination); src.start()
  }
  return {
    unlock() { try { ctx ??= new AudioContext(); if (ctx.state === 'suspended') void ctx.resume() } catch { ctx = null } },
    swing() { noise(90, 0.25, 1800) },
    hit(strong, blocked) { if (blocked) { tone(520, 300, 70, 'square', 0.12); return } tone(strong ? 120 : 190, 45, strong ? 170 : 110, 'sine', 0.5); noise(strong ? 120 : 70, strong ? 0.45 : 0.3, 900) },
    jump() { tone(260, 520, 120, 'triangle', 0.15) },
    ko() { tone(220, 55, 500, 'sawtooth', 0.3); noise(380, 0.4, 500) },
    bell() { tone(880, 880, 220, 'triangle', 0.25); tone(1320, 1320, 320, 'sine', 0.15, 0.04) },
    close() { try { void ctx?.close() } catch { /* ignore */ } ctx = null },
  }
}
