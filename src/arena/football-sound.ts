/**
 * OWNER: games (real-time)
 * Football's sound effects: Web Audio synth, no files. They follow the player's effects volume and mute (src/audio/settings.ts via
 * levels.ts). The context is created on the first tap or key press (browsers keep a page silent until then).
 */
import { soundLevel } from '../audio/levels.ts'

export interface FootballSound { unlock(): void; kick(strong: boolean): void; tackle(): void; post(): void; save(): void; whistle(long?: boolean): void; goal(): void; close(): void }

export function createFootballSound(): FootballSound {
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
  /** Filtered noise with a gain envelope: attack to `peak` over `attackMs`, then fade to nothing by `ms`. */
  function noise(ms: number, gain: number, freq: number, attackMs = 4, delay = 0): void {
    const vol = level() * gain
    if (!ctx || vol <= 0.001) return
    const n = Math.floor(ctx.sampleRate * ms / 1000), buf = ctx.createBuffer(1, n, ctx.sampleRate), data = buf.getChannelData(0)
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1
    const t = ctx.currentTime + delay
    const src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), g = ctx.createGain()
    filter.type = 'bandpass'; filter.frequency.value = freq; filter.Q.value = 0.8
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attackMs / 1000); g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000)
    src.buffer = buf; src.connect(filter).connect(g).connect(ctx.destination); src.start(t)
  }
  return {
    unlock() { try { ctx ??= new AudioContext(); if (ctx.state === 'suspended') void ctx.resume() } catch { ctx = null } },
    kick(strong) { tone(strong ? 150 : 190, 60, 90, 'sine', 0.5); noise(strong ? 90 : 60, 0.3, 1400) },
    tackle() { noise(160, 0.35, 700); tone(110, 60, 120, 'sine', 0.35) },
    post() { tone(1250, 900, 220, 'triangle', 0.25); tone(1870, 1400, 160, 'sine', 0.12) },
    save() { noise(80, 0.3, 1000); tone(240, 140, 90, 'square', 0.1) },
    whistle(long = false) {
      const ms = long ? 650 : 280
      tone(2800, 2900, ms, 'square', 0.1); tone(3000, 3050, ms, 'square', 0.08, 0.02)
    },
    // The crowd: a roar that swells for a second and a half, with a short whistle on top.
    goal() { noise(1900, 0.5, 900, 700); noise(1700, 0.3, 1800, 600, 0.1); tone(2800, 2900, 360, 'square', 0.08, 0.05) },
    close() { try { void ctx?.close() } catch { /* ignore */ } ctx = null },
  }
}
