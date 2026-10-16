// The cartridge manifest check (docs/CARTRIDGES.md): for every cartridge in src/arena/cartridges.ts, the entry is valid, every listed
// asset exists and has a licence, a CC BY asset's credit line is written in NOTICE.md, and (given a build) the lazy chunks the
// cartridge pulls in beyond the first download plus its assets stay under its brotli cap.
//
//   node --experimental-strip-types scripts/cartridge-check.ts               check ./dist as well as the manifests
//   node --experimental-strip-types scripts/cartridge-check.ts --no-dist     manifests and files only (no build needed)
//   node --experimental-strip-types scripts/cartridge-check.ts --dist path   another build output
//
// Exits 1 when anything is wrong. Run after `npm run build`, like size:download (CI's build job, and `npm run check:fast`).
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CARTRIDGES } from '../src/arena/cartridges.ts'
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

function main(): number {
  const args = process.argv.slice(2)
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const dir = resolve(root, args.includes('--dist') ? args[args.indexOf('--dist') + 1] ?? 'dist' : 'dist')
  const wantDist = !args.includes('--no-dist')
  if (wantDist && !existsSync(join(dir, 'index.html'))) { console.error(`No build at ${dir}: run \`npm run build\` first, or use --no-dist.`); return 2 }
  const { problems, lines } = checkCartridges(CARTRIDGES, diskSource(root), wantDist ? readDist(dir) : null)
  console.log(`Cartridges (${CARTRIDGES.length}): ${CARTRIDGES.map((c) => c.id).join(', ')}`)
  for (const line of lines) console.log(line)
  for (const problem of problems) console.error(`PROBLEM ${problem}`)
  return problems.length ? 1 : 0
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main()
