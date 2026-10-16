// The asset budget: every pack under public/assets/packs/ against its caps, from the files themselves (not the manifest's word).
//
//   node --experimental-strip-types scripts/assets/budget.ts [--json]
//
// Fails (exit 1) and says why when any of these is wrong:
//   - a manifest is malformed (pack-types.ts manifestProblems), lists a file that is missing or of another size, or a file in the
//     pack folder is not listed;
//   - a model is unprepared, or draws more triangles than the cap for its kind (CAPS: 3,000 a character, 1,500 a prop or car),
//     or its manifest triangle count is not what the file draws;
//   - a texture (embedded or a shared file) is over 1024 px on a side;
//   - the brotli (quality 11) size of every file tagged with a game, summed over all packs, is over 1.5 MB (the cartridge cap,
//     DEFAULT_CAP_BROTLI in the cartridge contract). Licence texts and untagged files do not count.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, posix, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { brotliCompressSync, constants } from 'node:zlib'
import { glbImages, glbJson, imageSize, trianglesOf } from './glb.ts'
import { CAPS, GAMES, MAX_TEXTURE_PX, manifestProblems, packPath } from './pack-types.ts'
import type { Game, Manifest, ModelKind } from './pack-types.ts'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const GAME_BUDGET_BYTES = 1_500_000

export const brotliSize = (b: Uint8Array): number => brotliCompressSync(b, { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: b.length } }).length

/** A pack as read from disk (or made up by a test): its manifest and every file in its folder by relative name. */
export interface PackFiles { pack: string; manifest: Manifest; files: Map<string, Buffer> }
export interface GameSize { game: Game; files: number; rawBytes: number; brotliBytes: number; budget: number; ok: boolean }
export interface BudgetReport { problems: string[]; games: GameSize[] }

const isModel = (kind: string): kind is ModelKind => Object.hasOwn(CAPS, kind)

/** Every problem across the packs, and the brotli size per game. Pure. */
export function checkBudget(packs: readonly PackFiles[], budget = GAME_BUDGET_BYTES): BudgetReport {
  const problems: string[] = []
  const totals = new Map<Game, { files: number; raw: number; brotli: number }>(GAMES.map((g) => [g, { files: 0, raw: 0, brotli: 0 }]))
  for (const { pack, manifest, files } of packs) {
    const say = (text: string): void => { problems.push(`${pack}: ${text}`) }
    const bad = manifestProblems(manifest, pack)
    for (const text of bad) say(text)
    if (bad.length) continue
    const listed = new Set<string>()
    for (const a of manifest.assets) {
      const name = a.path.slice(packPath(pack, '').length)
      listed.add(name)
      const bytes = files.get(name)
      if (!bytes) { say(`${name} is listed but missing`); continue }
      if (bytes.length !== a.bytes) say(`${name}: manifest says ${a.bytes} bytes, file has ${bytes.length}`)
      if (a.temporary) { say(`${name} is a fetched texture prepare.ts has not folded in yet`); continue }
      if (isModel(a.kind)) {
        if (!a.prepared) say(`${name} is not prepared (run prepare.ts)`)
        let json
        try { json = glbJson(bytes) } catch (error) { say(`${name}: ${error instanceof Error ? error.message : String(error)}`); continue }
        const triangles = trianglesOf(json)
        if (triangles > CAPS[a.kind]) say(`${name}: ${triangles} triangles, over the ${CAPS[a.kind]} cap for a ${a.kind}`)
        if (triangles !== a.triangles) say(`${name}: manifest says ${String(a.triangles)} triangles, file draws ${triangles}`)
        for (const img of glbImages(bytes)) {
          if (img.uri !== undefined) {
            const ref = posix.normalize(decodeURIComponent(img.uri))
            if (ref.startsWith('..') || posix.isAbsolute(ref) || /^[a-z]+:/i.test(img.uri)) say(`${name}: image ${img.uri} must be a file in the pack`)
            else if (!files.has(ref)) say(`${name}: image ${img.uri} is missing`)
            else if (!manifest.assets.some((x) => x.path === packPath(pack, ref) && x.game === a.game)) say(`${name}: image ${ref} must be listed for the same game`)
          } else if (Math.max(img.width, img.height) > MAX_TEXTURE_PX) say(`${name}: texture ${img.width}x${img.height} is over ${MAX_TEXTURE_PX} px`)
        }
      } else if (a.kind === 'texture') {
        try {
          const [w, h] = imageSize(bytes)
          if (Math.max(w, h) > MAX_TEXTURE_PX) say(`${name}: texture ${w}x${h} is over ${MAX_TEXTURE_PX} px`)
        } catch { say(`${name}: not a PNG, JPEG or WebP image`) }
      }
      if (a.game && a.kind !== 'licence') {
        const t = totals.get(a.game)!
        t.files++
        t.raw += bytes.length
        t.brotli += brotliSize(bytes)
      }
    }
    for (const name of files.keys()) if (name !== 'manifest.json' && !listed.has(name)) say(`${name} is in the folder but not in manifest.json`)
  }
  const games = GAMES.map((game) => {
    const t = totals.get(game)!
    return { game, files: t.files, rawBytes: t.raw, brotliBytes: t.brotli, budget, ok: t.brotli <= budget }
  })
  for (const g of games) if (!g.ok) problems.push(`${g.game}: ${g.brotliBytes} bytes brotli, over the ${budget} budget`)
  return { problems, games }
}

function filesUnder(dir: string): Map<string, Buffer> {
  const out = new Map<string, Buffer>()
  const walk = (d: string): void => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, e.name)
      if (e.isDirectory()) walk(full)
      else if (statSync(full).isFile()) out.set(relative(dir, full).split('\\').join('/'), readFileSync(full))
    }
  }
  walk(dir)
  return out
}

/** Every pack folder under `packsDir` with its manifest and files. A folder without manifest.json is an error. */
export function readPacks(packsDir: string): PackFiles[] {
  if (!existsSync(packsDir)) return []
  return readdirSync(packsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).sort((a, b) => a.name.localeCompare(b.name)).map((d) => {
    const dir = join(packsDir, d.name)
    if (!existsSync(join(dir, 'manifest.json'))) throw new Error(`${d.name}: no manifest.json`)
    return { pack: d.name, manifest: JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')) as Manifest, files: filesUnder(dir) }
  })
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const packs = readPacks(join(repo, 'public', 'assets', 'packs'))
  const report = checkBudget(packs)
  if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 2))
  else {
    for (const p of packs) {
      const models = p.manifest.assets.filter((a) => isModel(a.kind))
      console.log(`${p.pack.padEnd(26)} ${p.manifest.assets.length} files, ${models.length} models, ${models.reduce((n, a) => n + (a.triangles ?? 0), 0)} triangles in all, ${p.manifest.assets.reduce((n, a) => n + a.bytes, 0)} bytes`)
    }
    for (const g of report.games) console.log(`${g.ok ? 'ok  ' : 'OVER'} ${g.game.padEnd(9)} ${String(g.files).padStart(3)} files  raw ${String(g.rawBytes).padStart(8)}  brotli ${String(g.brotliBytes).padStart(8)} / ${g.budget}`)
    for (const p of report.problems) console.error(`PROBLEM ${p}`)
  }
  if (report.problems.length) process.exit(1)
}
