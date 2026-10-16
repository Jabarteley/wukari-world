// The cartridge manifest check (docs/CARTRIDGES.md): for every cartridge in src/arena/cartridges.ts, the entry is valid, every listed
// asset exists and has a licence, a CC BY asset's credit line is written in NOTICE.md, and (given a build) the lazy chunks the
// cartridge pulls in beyond the first download plus its assets stay under its brotli cap.
//
//   node --experimental-strip-types scripts/cartridge-check.ts               check ./dist as well as the manifests
//   node --experimental-strip-types scripts/cartridge-check.ts --no-dist     manifests and files only (no build needed)
//   node --experimental-strip-types scripts/cartridge-check.ts --dist path   another build output
//   node --experimental-strip-types scripts/cartridge-check.ts --dir examples/cartridge-sample
//       a cartridge folder that is not registered (a submission, the sample): its cartridge.ts (the entry) and rules.ts (the rules) and
//       the files it lists, with credits read from <dir>/NOTICE.md. No build is needed, so no size is measured; CI measures it once registered.
//
// Exits 1 when anything is wrong. Run after `npm run build`, like size:download (CI's build job, and `npm run check:fast`).
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { CARTRIDGES } from '../src/arena/cartridges.ts'
import { makeRng } from '../src/game/util.ts'
import type { RealtimeRules } from '../src/arena/rules.ts'
import { DEFAULT_CAP_BROTLI, validateCartridge } from '../src/arena/cartridge.ts'
import type { Cartridge } from '../src/arena/cartridge.ts'
import { closure, firstPaintFiles, readDist, sizeOf, startupFiles } from './download-budget.ts'
import type { Dist } from './download-budget.ts'

/** The files the checker looks at; the real one reads the disk, the tests give a map. */
export interface Source { root: string; read(path: string): Uint8Array | null; notice: string }

export const diskSource = (root: string): Source => ({
  root,
  read: (path) => (existsSync(join(root, path)) ? readFileSync(join(root, path)) : null),
  notice: existsSync(join(root, 'NOTICE.md')) ? readFileSync(join(root, 'NOTICE.md'), 'utf8') : '',
})

const stemOf = (name: string): string => name.replace(/^assets\//, '').replace(/-[\w-]{7}\.[a-z0-9]+$/i, '')

export interface Measured { files: string[]; chunkBrotli: number; assetBrotli: number; total: number }

/** The lazy chunks a cartridge's entry pulls in that are not in the first download, with their stylesheets, in `dist`; null when the entry chunk is not (exactly once) there. */
export function cartridgeFiles(dist: Dist, entry: string, lazy: readonly string[] = []): string[] | null {
  const roots = [...dist.keys()].filter((name) => stemOf(name) === entry && name.endsWith('.js'))
  if (roots.length !== 1) return null
  for (const stem of lazy) { const found = [...dist.keys()].filter((name) => stemOf(name) === stem && name.endsWith('.js')); if (found.length !== 1) return null; roots.push(found[0] as string) }
  const loaded = startupFiles(dist, 'lagos') ?? firstPaintFiles(dist)
  const js = [...closure(dist, roots)].filter((name) => !loaded.has(name))
  const stems = new Set(js.map(stemOf))
  const css = [...dist.keys()].filter((name) => name.endsWith('.css') && stems.has(stemOf(name)) && !loaded.has(name))
  return [...js, ...css]
}

export function measureCartridge(dist: Dist, source: Source, c: Cartridge): Measured | null {
  const files = cartridgeFiles(dist, c.manifest.entry, c.manifest.lazy ?? [])
  if (!files) return null
  const chunkBrotli = files.reduce((sum, name) => sum + sizeOf(dist.get(name) as Uint8Array).brotli, 0)
  const assetBrotli = c.manifest.assets.reduce((sum, a) => {
    const data = dist.get(a.path.replace(/^public\//, '')) ?? source.read(a.path)
    return sum + (data ? sizeOf(data).brotli : 0)
  }, 0)
  return { files, chunkBrotli, assetBrotli, total: chunkBrotli + assetBrotli }
}

/** Every problem found, as sentences naming the cartridge; empty when all is well. `dist` null skips the size check. */
export function checkCartridges(cartridges: readonly Cartridge[], source: Source, dist: Dist | null): { problems: string[]; lines: string[] } {
  const problems: string[] = [], lines: string[] = []
  const ids = new Set<string>()
  for (const c of cartridges) {
    const say = (text: string): void => { problems.push(`${c.id}: ${text}`) }
    if (ids.has(c.id)) say('listed twice')
    ids.add(c.id)
    for (const text of validateCartridge(c)) say(text)
    for (const a of c.manifest.assets) {
      if (!source.read(a.path)) say(`asset ${a.path} does not exist`)
      if (a.licence === 'CC-BY' && a.attribution?.trim() && !source.notice.includes(a.attribution.trim())) say(`the credit line of ${a.path} is not written in NOTICE.md`)
    }
    if (!dist) continue
    const cap = c.manifest.cap ?? DEFAULT_CAP_BROTLI
    const m = measureCartridge(dist, source, c)
    if (!m) { say(`no single lazy chunk named ${[c.manifest.entry, ...(c.manifest.lazy ?? [])].join(' or ')} in the build (manifest.entry or lazy is stale)`); continue }
    const over = m.total > cap
    lines.push(`${over ? 'OVER' : 'ok  '} ${c.id.padEnd(10)} ${String(m.total).padStart(8)} / ${cap} brotli  (${m.files.length} chunk files ${m.chunkBrotli}, ${c.manifest.assets.length} assets ${m.assetBrotli})`)
    if (over) say(`weighs ${m.total} bytes brotli, over its cap of ${cap}`)
  }
  return { problems, lines }
}

/** What is wrong with a cartridge's rules against its entry (docs/CARTRIDGES.md, "The contract"); empty when fine. Plays a short match with the bots twice. */
export function checkRules(c: Cartridge, rules: RealtimeRules<any, any, any>): string[] {
  const bad: string[] = []
  const say = (text: string): void => { bad.push(`${c.id}: ${text}`) }
  if (rules.id !== c.id) say(`rules.id is "${rules.id}", the entry says "${c.id}"`)
  if (rules.label !== c.name) say(`rules.label "${rules.label}" is not the entry's name "${c.name}"`)
  if (!Number.isInteger(rules.hz) || rules.hz < 1 || rules.hz > 30) say('hz must be a whole number 1..30')
  if (!(rules.seats.min >= 1 && rules.seats.max >= rules.seats.min)) say('seats must be { min, max } with 1 <= min <= max')
  for (const name of ['start', 'parseInput', 'idle', 'step', 'outcome', 'snapshot', 'bot', 'forfeit'] as const) if (typeof rules[name] !== 'function') say(`rules.${name} is missing`)
  if (bad.length) return bad
  try {
    rules.parseInput({ nonsense: 'x'.repeat(5000) })
    say('parseInput accepted junk: it must throw ArenaInputError for anything it does not understand')
  } catch { /* refused, as it must be */ }
  for (const seats of new Set([rules.seats.min, rules.seats.max])) {
    const run = (): string[] => {
      const rng = makeRng(`check-${c.id}`), state = rules.start(seats, rng, defaultOptions(rules))
      const snaps: string[] = []
      for (let tick = 0; tick < rules.hz * 120 && rules.outcome(state) === null; tick++) {
        const inputs = Array.from({ length: seats }, (_, seat) => rules.bot(state, seat, rng))
        rules.step(state, inputs, rng)
        snaps.push(JSON.stringify(rules.snapshot(state)))
      }
      return snaps
    }
    const a = run(), b = run()
    if (a.join('|') !== b.join('|')) say(`${seats} seats: two runs from one seed differ: the rules are not deterministic`)
    if (Math.max(0, ...a.map((s) => s.length)) >= 400) say(`${seats} seats: a snapshot is over about 300 bytes`)
    if (!a.length) say(`${seats} seats: nothing was played`)
  }
  return bad
}
const defaultOptions = (rules: RealtimeRules<any, any, any>): Record<string, unknown> => Object.fromEntries(Object.entries(rules.options).map(([name, spec]) => [name, (spec as { default: unknown }).default]))

/** Check a folder that is not in the registry: its entry, its rules and its files. */
export async function checkDir(root: string, dir: string): Promise<{ problems: string[]; lines: string[] }> {
  const abs = resolve(root, dir)
  const missing = ['cartridge.ts', 'rules.ts'].filter((f) => !existsSync(join(abs, f)))
  if (missing.length) return { problems: [`${dir}: missing ${missing.join(' and ')}`], lines: [] }
  const entry = (await import(pathToFileURL(join(abs, 'cartridge.ts')).href)) as { cartridge?: Cartridge }
  const rules = ((await import(pathToFileURL(join(abs, 'rules.ts')).href)) as { default?: RealtimeRules<any, any, any> }).default
  const cartridge = entry.cartridge
  if (!cartridge) return { problems: [`${dir}/cartridge.ts must export \`cartridge\` (defineCartridge(...))`], lines: [] }
  if (!rules) return { problems: [`${dir}/rules.ts must default-export the RealtimeRules`], lines: [] }
  const source: Source = { ...diskSource(root), notice: existsSync(join(abs, 'NOTICE.md')) ? readFileSync(join(abs, 'NOTICE.md'), 'utf8') : '' }
  const clash = CARTRIDGES.some((c) => c.id === cartridge.id) ? [`${cartridge.id}: the id is already a cartridge of the game`] : []
  const found = [...checkCartridges([cartridge], source, null).problems, ...clash, ...checkRules(cartridge, rules)]
  return { problems: found, lines: [`${found.length ? 'FAIL' : 'ok  '} ${cartridge.id.padEnd(10)} manifest, ${cartridge.manifest.assets.length} assets and rules (no build: size is measured once it is registered)`] }
}

async function main(): Promise<number> {
  const args = process.argv.slice(2)
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  if (args.includes('--dir')) {
    const dir = args[args.indexOf('--dir') + 1]
    if (!dir || dir.startsWith('--')) { console.error('--dir needs a folder, like examples/cartridge-sample'); return 2 }
    const { problems, lines } = await checkDir(root, dir)
    for (const line of lines) console.log(line)
    for (const problem of problems) console.error(`PROBLEM ${problem}`)
    return problems.length ? 1 : 0
  }
  const dir = resolve(root, args.includes('--dist') ? args[args.indexOf('--dist') + 1] ?? 'dist' : 'dist')
  const wantDist = !args.includes('--no-dist')
  if (wantDist && !existsSync(join(dir, 'index.html'))) { console.error(`No build at ${dir}: run \`npm run build\` first, or use --no-dist.`); return 2 }
  const { problems, lines } = checkCartridges(CARTRIDGES, diskSource(root), wantDist ? readDist(dir) : null)
  console.log(`Cartridges (${CARTRIDGES.length}): ${CARTRIDGES.map((c) => c.id).join(', ')}`)
  for (const line of lines) console.log(line)
  for (const problem of problems) console.error(`PROBLEM ${problem}`)
  return problems.length ? 1 : 0
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await main()
