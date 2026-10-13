/**
 * OWNER: games (real-time)
 * Race sounds: an engine hum that follows the car's speed, countdown beeps, bump, boost and finish blips, all made on the spot
 * with Web Audio (no files). They follow the player's effects volume and mute (src/audio/settings.ts). The context is created on
 * the first tap or key press.
 */
import { soundLevel } from '../audio/levels.ts'

export interface RaceSound { unlock(): void; engine(speed01: number, gas: boolean, on: boolean, gain?: number): void; beep(go: boolean): void; bump(): void; boost(): void; finish(): void; close(): void }

export function createRaceSound(): RaceSound {
  let ctx: AudioContext | null = null
  let hum: OscillatorNode | null = null, hum2: OscillatorNode | null = null, humGain: GainNode | null = null
  const level = (): number => { try { return soundLevel('effects') } catch { return 0.5 } }
  function tone(freq: number, to: number, ms: number, type: OscillatorType, gain: number, delay = 0): void {
    const vol = level() * gain
    if (!ctx || vol <= 0.001) return
    const t = ctx.currentTime + delay, osc = ctx.createOscillator(), g = ctx.createGain()
    osc.type = type; osc.frequency.setValueAtTime(freq, t); osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + ms / 1000)
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000)
    osc.connect(g).connect(ctx.destination); osc.start(t); osc.stop(t + ms / 1000 + 0.02)
  }
  function startHum(): void {
    if (!ctx || hum) return
    hum = ctx.createOscillator(); hum2 = ctx.createOscillator(); humGain = ctx.createGain()
    hum.type = 'sawtooth'; hum2.type = 'square'; hum.frequency.value = 60; hum2.frequency.value = 30
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520
    humGain.gain.value = 0
    hum.connect(lp); hum2.connect(lp); lp.connect(humGain).connect(ctx.destination); hum.start(); hum2.start()
  }
  return {
    unlock() { try { ctx ??= new AudioContext(); if (ctx.state === 'suspended') void ctx.resume(); startHum() } catch { ctx = null } },
    engine(speed01, gas, on, gain = 1) {
      if (!ctx || !hum || !hum2 || !humGain) return
      const t = ctx.currentTime, s = Math.max(0, Math.min(1.6, speed01))
      hum.frequency.setTargetAtTime(55 + s * 120 + (gas ? 14 : 0), t, 0.08); hum2.frequency.setTargetAtTime(27 + s * 60, t, 0.08)
      humGain.gain.setTargetAtTime(on ? level() * (0.05 + s * 0.05) * gain : 0, t, 0.1)
    },
    beep(go) { tone(go ? 880 : 440, go ? 880 : 440, go ? 420 : 160, 'square', go ? 0.2 : 0.16) },
    bump() { tone(150, 50, 140, 'sawtooth', 0.35) },
    boost() { tone(300, 900, 260, 'sawtooth', 0.16) },
    finish() { tone(660, 660, 140, 'triangle', 0.25); tone(880, 880, 140, 'triangle', 0.25, 0.14); tone(1100, 1100, 320, 'triangle', 0.25, 0.28) },
    close() { try { hum?.stop(); hum2?.stop(); void ctx?.close() } catch { /* ignore */ } ctx = null; hum = hum2 = null; humGain = null },
  }
}
