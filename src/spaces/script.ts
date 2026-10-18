/**
 * OWNER: spaces
 * PLAYERS' OWN CODE IN A SPACE (docs/SPACES-3D.md, phase 4): what a script is, what it may ask the space to do, and the words it may
 * show. Pure: the server checks a saved script with `cleanScript`; the 3D screen checks every operation a running script sends with
 * `checkOp` before it touches anything. The script itself runs only in the sandbox (public/sandbox/space.js).
 *
 * Words. A script can show only the space's own lines (`lines`), which the server filters when the script is saved; a line may
 * hold up to four numbers, written {1}…{4}, filled from what the script passes. So everything a visitor reads was checked.
 */

export const SCRIPT = Object.freeze({
  /** The code, in characters. */
  code: 32_000,
  lines: 40,
  line: 120,
  /** Ticks a second sent to a running script. */
  hz: 30,
  /** How far a script may move a model from the plot (metres), how fast it may push. */
  reach: 60,
  push: 50,
  sounds: ['ding', 'pop', 'whoosh', 'cheer', 'buzz'] as const,
})
export type SoundName = (typeof SCRIPT.sounds)[number]

export interface SpaceScript { code: string; lines: string[] }

export type ScriptCheck = { ok: true; script: SpaceScript } | { ok: false; code: string; reason: string }
/** Check a script someone wants to save. `screen(text)` is the server's text filter (a refusal's words, or null). */
export function cleanScript(value: unknown, screen: (text: string) => string | null): ScriptCheck {
  const no = (code: string, reason: string): ScriptCheck => ({ ok: false, code, reason })
  if (!value || typeof value !== 'object') return no('invalid_script', 'The script could not be read.')
  const v = value as Record<string, unknown>
  if (typeof v['code'] !== 'string') return no('invalid_script', 'The script could not be read.')
  const code = v['code'].replace(/\r\n?/g, '\n')
  if (code.length > SCRIPT.code) return no('too_long', `A script may be at most ${SCRIPT.code.toLocaleString('en')} characters.`)
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(code)) return no('invalid_script', 'The script has characters that are not text.')
  const rawLines = Array.isArray(v['lines']) ? v['lines'] : []
  if (rawLines.length > SCRIPT.lines) return no('too_many_lines', `A space may have at most ${SCRIPT.lines} lines of words.`)
  const lines: string[] = []
  for (const [i, raw] of rawLines.entries()) {
    if (typeof raw !== 'string') return no('invalid_lines', 'The lines could not be read.')
    const line = raw.replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ').replace(/\s+/g, ' ').trim()
    if (!line) continue
    if (line.length > SCRIPT.line) return no('line_too_long', `Line ${i + 1} is longer than ${SCRIPT.line} characters.`)
    const refused = screen(line)
    if (refused) return no('line_blocked', `Line ${i + 1}: ${refused}`)
    lines.push(line)
  }
  return { ok: true, script: { code, lines } }
}

/** A line with its {1}…{4} filled from `values` (numbers only, at most two decimals). */
export function fillLine(line: string, values: readonly number[]): string {
  return line.replace(/\{([1-4])\}/g, (_, n: string) => { const v = values[Number(n) - 1]; return typeof v === 'number' && Number.isFinite(v) ? String(Math.round(v * 100) / 100) : '' })
}

/** An operation a running script asked for, as the space applies it. */
export type ScriptOp =
  | { op: 'move'; name: string; x: number; y: number; z: number }
  | { op: 'turn'; name: string; degrees: number }
  | { op: 'push'; name: string; x: number; y: number; z: number }
  | { op: 'color'; name: string; hex: string }
  | { op: 'show'; name: string; on: boolean }
  | { op: 'say'; text: string }
  | { op: 'score'; value: number }
  | { op: 'sound'; name: SoundName }

const finite = (value: unknown, limit: number): number | null => (typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit ? value : null)
/**
 * One operation from the sandbox, checked: a known object, numbers in range, a line of the space's own, a known sound. Anything
 * else is null and ignored.
 */
export function checkOp(raw: unknown, names: ReadonlySet<string>, lines: readonly string[], plot: { w: number; d: number }): ScriptOp | null {
  if (!Array.isArray(raw) || typeof raw[0] !== 'string') return null
  const [kind, a, b, c, d] = raw as unknown[]
  const named = typeof a === 'string' && names.has(a) ? a : null
  switch (kind) {
    case 'move': {
      const x = finite(b, plot.w + SCRIPT.reach), y = finite(c, SCRIPT.reach), z = finite(d, plot.d + SCRIPT.reach)
      return named && x !== null && y !== null && z !== null && x >= -SCRIPT.reach && z >= -SCRIPT.reach && y >= -5 ? { op: 'move', name: named, x, y, z } : null
    }
    case 'turn': { const deg = finite(b, 1e6); return named && deg !== null ? { op: 'turn', name: named, degrees: deg } : null }
    case 'push': {
      const x = finite(b, SCRIPT.push), y = finite(c, SCRIPT.push), z = finite(d, SCRIPT.push)
      return named && x !== null && y !== null && z !== null ? { op: 'push', name: named, x, y, z } : null
    }
    case 'color': return named && typeof b === 'string' && /^#[0-9a-f]{6}$/i.test(b) ? { op: 'color', name: named, hex: b.toLowerCase() } : null
    case 'show': return named && typeof b === 'boolean' ? { op: 'show', name: named, on: b } : null
    case 'say': {
      // By its number (0 is the first line) or by its exact words; numbers to fill it with follow.
      const index = typeof a === 'number' && Number.isInteger(a) ? a : typeof a === 'string' ? lines.indexOf(a) : -1
      const line = index >= 0 ? lines[index] : undefined
      if (line === undefined) return null
      const values = (raw as unknown[]).slice(2, 6).map((v) => finite(v, 1e9)).filter((v): v is number => v !== null)
      return { op: 'say', text: fillLine(line, values) }
    }
    case 'score': { const value = finite(a, 1e9); return value !== null ? { op: 'score', value } : null }
    case 'sound': return typeof a === 'string' && (SCRIPT.sounds as readonly string[]).includes(a) ? { op: 'sound', name: a as SoundName } : null
    default: return null
  }
}

/** Unique names for the placed models a script can find: a model's own name, "Chair 2" for the second, and so on. */
export function scriptNames(placements: readonly { k: string; name: string }[]): Map<string, string> {
  const byKey = new Map<string, string>(), seen = new Map<string, number>()
  for (const p of placements) {
    const base = p.name.trim() || 'Model', n = (seen.get(base) ?? 0) + 1
    seen.set(base, n)
    byKey.set(p.k, n === 1 ? base : `${base} ${n}`)
  }
  return byKey
}

/** Starter scripts: each shows one part of the API. `lines` are suggested words to go with it. */
export const TEMPLATES: readonly { id: string; title: string; code: string; lines: string[] }[] = Object.freeze([
  {
    id: 'spin', title: 'Spin a model',
    code: `// Turn the first model round and round.\nconst thing = space.all()[0]\nspace.on('tick', (dt) => {\n  if (thing) thing.turnBy(90 * dt)\n})\n`,
    lines: [],
  },
  {
    id: 'float', title: 'Float up and down',
    code: `// The first model floats gently, like it is under water.\nconst thing = space.all()[0]\nconst start = thing ? thing.y : 0\nspace.on('tick', (dt, t) => {\n  if (thing) thing.moveTo(thing.x, start + 0.25 + Math.sin(t * 2) * 0.25, thing.z)\n})\n`,
    lines: [],
  },
  {
    id: 'greet', title: 'Say hello when someone comes near',
    code: `// Line 0 is shown when the walker comes within 1.5 metres of a model.\nconst greeted = new Set()\nspace.on('tick', () => {\n  for (const thing of space.all()) {\n    const near = thing.distanceToWalker() < 1.5\n    if (near && !greeted.has(thing.name)) { greeted.add(thing.name); space.say(0); space.sound('ding') }\n    if (!near) greeted.delete(thing.name)\n  }\n})\n`,
    lines: ['Welcome! Make yourself at home.'],
  },
  {
    id: 'collect', title: 'A collecting game',
    code: `// Every loose model is a prize: walk into it to collect it. Line 0 shows the score.\nlet score = 0\nspace.on('tick', () => {\n  for (const thing of space.all()) {\n    if (!thing.loose || thing.distanceToWalker() > 0.9) continue\n    thing.hide()\n    thing.moveTo(thing.x, -4, thing.z)\n    score += 1\n    space.score(score)\n    space.say(0, score)\n    space.sound('pop')\n  }\n})\n`,
    lines: ['Collected {1}!'],
  },
  {
    id: 'bounce', title: 'Make loose models jump',
    code: `// Every two seconds, every loose model jumps.\nlet next = 2\nspace.on('tick', (dt, t) => {\n  if (t < next) return\n  next = t + 2\n  for (const thing of space.all()) if (thing.loose) thing.push(0, 3, 0)\n  space.sound('whoosh')\n})\n`,
    lines: [],
  },
])
