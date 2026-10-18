/**
 * OWNER: spaces
 * RUNNING A SPACE'S SCRIPT (docs/SPACES-3D.md, phase 4), on the game page's side. The script itself runs in the sandbox frame
 * (public/sandbox/space.js: an opaque origin, its own strict policy, a worker it stops when a step overruns). This side starts it,
 * sends it a tick 30 times a second with where things are, and applies only the operations src/spaces/script.ts lets through.
 */
import { checkOp, SCRIPT, type ScriptOp, type SpaceScript } from '../script.ts'

export interface ScriptObject { name: string; x: number; y: number; z: number; ry: number; loose: boolean }
export interface ScriptHost {
  /** Where the named models are now. */
  objects(): ScriptObject[]
  walker(): { x: number; y: number; z: number; yaw: number }
  apply(op: ScriptOp): void
  /** The script stopped (an error, an endless loop) or reported an error it survived. */
  problem(message: string, stopped: boolean): void
}
export interface ScriptRunner { tick(dt: number): void; tap(name: string): void; stop(): void }

const SANDBOX = '/sandbox/space.html'

export function runScript(script: SpaceScript, plot: { w: number; d: number }, host: ScriptHost): ScriptRunner {
  const frame = document.createElement('iframe')
  frame.setAttribute('sandbox', 'allow-scripts')
  frame.setAttribute('aria-hidden', 'true')
  frame.setAttribute('tabindex', '-1')
  frame.title = 'Space script'
  frame.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden'
  frame.src = SANDBOX
  document.body.appendChild(frame)
  let ready = false, running = true, t = 0, acc = 0, opsThisSecond = 0, second = 0
  let events: { type: string; name?: string }[] = []
  const names = (): Set<string> => new Set(host.objects().map((o) => o.name))
  const post = (message: unknown): void => { frame.contentWindow?.postMessage(message, '*') }
  const onMessage = (event: MessageEvent): void => {
    if (event.source !== frame.contentWindow || !running) return
    const m = event.data as { type?: string; ops?: unknown[]; message?: unknown; reason?: unknown } | null
    if (!m || typeof m !== 'object') return
    if (m.type === 'ready' && !ready) {
      ready = true
      post({ type: 'start', code: script.code, objects: host.objects(), walker: host.walker() })
    } else if (m.type === 'ops' && Array.isArray(m.ops)) {
      const known = names()
      // A script can ask for at most this much a second, whatever it sends.
      if (Math.floor(t) !== second) { second = Math.floor(t); opsThisSecond = 0 }
      for (const raw of m.ops) {
        if (++opsThisSecond > 3000) break
        const op = checkOp(raw, known, script.lines, plot)
        if (op) host.apply(op)
      }
    } else if (m.type === 'error') host.problem(String(m.message ?? 'Your code has an error.').slice(0, 300), false)
    else if (m.type === 'stopped') { running = false; host.problem(String(m.reason ?? 'Your code stopped.').slice(0, 300), true) }
  }
  globalThis.addEventListener('message', onMessage)
  return {
    tick(dt) {
      if (!ready || !running) return
      t += dt; acc += dt
      if (acc < 1 / SCRIPT.hz) return
      const step = acc
      acc = 0
      post({ type: 'tick', dt: step, t, walker: host.walker(), objects: host.objects(), events })
      events = []
    },
    tap(name) { if (events.length < 20) events.push({ type: 'tap', name }) },
    stop() {
      running = false
      post({ type: 'stop' })
      globalThis.removeEventListener('message', onMessage)
      frame.remove()
    },
  }
}

/** A short sound for a script, made on the spot (no files): a few notes of a sine wave. */
let audio: AudioContext | null = null
const NOTES: Record<string, [number, number][]> = { ding: [[880, 0.12], [1320, 0.2]], pop: [[520, 0.06]], whoosh: [[220, 0.25]], cheer: [[523, 0.1], [659, 0.1], [784, 0.2]], buzz: [[110, 0.3]] }
export function playSound(name: string): void {
  try {
    audio ??= new AudioContext()
    let at = audio.currentTime
    for (const [freq, length] of NOTES[name] ?? []) {
      const osc = audio.createOscillator(), gain = audio.createGain()
      osc.type = name === 'buzz' ? 'sawtooth' : name === 'whoosh' ? 'triangle' : 'sine'
      osc.frequency.setValueAtTime(freq, at)
      if (name === 'whoosh') osc.frequency.exponentialRampToValueAtTime(880, at + length)
      gain.gain.setValueAtTime(0.0001, at)
      gain.gain.exponentialRampToValueAtTime(0.15, at + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + length)
      osc.connect(gain).connect(audio.destination)
      osc.start(at); osc.stop(at + length + 0.02)
      at += length
    }
  } catch { /* no sound on this device */ }
}
