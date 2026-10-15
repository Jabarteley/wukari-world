// Partition the existing npm test corpus across hosted runners without changing its globs or concurrency.
import { globSync, readFileSync, statSync } from 'node:fs'
import { spawn } from 'node:child_process'

const prefix = 'node --experimental-strip-types --test --test-concurrency=1 '
const groups = { game: 'src/', host: 'server/', tooling: 'scripts/' }
// Five files are slower than everything else in `src/` together, so each gets a job of its own (the game job ran out of its 25 minutes with them):
// the full economy simulation (all starts and strategies, about 14 minutes), the contracts of every playable city (about 20, in two jobs),
// every route of every open city with its skip (about 5), a homeward quote for every pair of cities (about 6) and the dead-end search over
// 26,000 lives (about 19, in two jobs: STUCK_PART splits its per-city samples). A job may run only some tests of its file (`names`).
interface Alone { readonly file: string; readonly names?: readonly string[]; readonly env?: Readonly<Record<string, string>> }
const CONTRACTS = 'every playable city is covered by the shared city contracts'
const alone: Record<string, Alone> = {
  economy: { file: 'src/game/economy.test.ts' },
  'cities-1': { file: 'src/game/cities/allCities.test.ts', names: [CONTRACTS] },
  'cities-2': { file: 'src/game/cities/allCities.test.ts', names: ['every generated city passes', 'open city footprints', 'every public venue uses a scene', 'every playable city exposes', 'each playable city can settle'] },
  routes: { file: 'src/game/cities/combinedRules.test.ts' },
  homeward: { file: 'src/game/relief.test.ts' },
  'stuck-1': { file: 'src/game/stuck.test.ts', env: { STUCK_PART: '1/2' } },
  'stuck-2': { file: 'src/game/stuck.test.ts', env: { STUCK_PART: '2/2' } },
}
// The rest of src/ is about 975 files and over 25 minutes in one job, so it runs as GAME_SHARDS jobs (game-1 ... game-3): sorted, file n goes to shard n mod 3.
const GAME_SHARDS = 3
// The Worker tests (`npm run test:edge`, deploy/*.test.ts) take 12 to 17 minutes on a hosted runner, near the 25-minute limit: they run as EDGE_SHARDS
// jobs (edge-1, edge-2), the biggest files first, each file to the shard with the fewer bytes so far.
const EDGE_SHARDS = 2
const EDGE_GLOB = 'deploy/*.test.ts'
const edgeShard = (shard: number): string[] => {
  const manifestScripts = record(manifest) && record(manifest.scripts) ? manifest.scripts : {}
  if (typeof manifestScripts['test:edge'] !== 'string' || !manifestScripts['test:edge'].includes(`"${EDGE_GLOB}"`)) throw new Error('The npm test:edge command changed; review the hosted Worker test plan.')
  const sizes = globSync(EDGE_GLOB).map((file) => ({ file, bytes: statSync(file).size })).sort((a, b) => b.bytes - a.bytes || a.file.localeCompare(b.file))
  const loads = Array.from({ length: EDGE_SHARDS }, () => 0), mine: string[] = []
  for (const { file, bytes } of sizes) { const lightest = loads.indexOf(Math.min(...loads)); loads[lightest]! += bytes; if (lightest === shard - 1) mine.push(file) }
  return mine.sort()
}
const edgeShardOf = (name: string): number | null => { const found = /^edge-([1-9])$/.exec(name); return found && Number(found[1]) <= EDGE_SHARDS ? Number(found[1]) : null }
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const manifest: unknown = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const script = record(manifest) && record(manifest.scripts) ? manifest.scripts.test : null
if (typeof script !== 'string' || !script.startsWith(prefix)) throw new Error('The npm test command changed; review the complete hosted test plan.')
const suffix = script.slice(prefix.length)
const tokens = suffix.match(/"(?:[^"\\]|\\.)*"/g) ?? []
if (!tokens.length || tokens.join(' ') !== suffix) throw new Error('The npm test glob arguments changed; review the complete hosted test plan.')
const patterns = tokens.map(token => {
  const pattern: unknown = JSON.parse(token)
  if (typeof pattern !== 'string') throw new Error('Every npm test argument must be a glob string.')
  return pattern
})
const plan: Record<keyof typeof groups, string[]> = { game: [], host: [], tooling: [] }
for (const name of ['game', 'host', 'tooling'] as const) plan[name] = patterns.filter(pattern => pattern.startsWith(groups[name]))
if (Object.values(plan).flat().length !== patterns.length || Object.values(plan).some(group => !group.length)) throw new Error('Every npm test glob must belong to exactly one nonempty hosted partition.')

// A file that runs in more than one job (allCities, stuck) is owned in the table by its first job; a game file is owned by `game` and run by a shard.
const aloneFiles = new Set(Object.values(alone).map(({ file }) => file))
const ownership = new Map<string, string>()
for (const [name, globs] of Object.entries(plan)) {
  for (const file of new Set(globs.flatMap(pattern => globSync(pattern)))) {
    if (ownership.has(file)) throw new Error(`Test file belongs to multiple partitions: ${file}`)
    ownership.set(file, aloneFiles.has(file) ? (Object.entries(alone).find(([, job]) => job.file === file)![0]) : name)
  }
}
for (const { file } of Object.values(alone)) if (!ownership.has(file)) throw new Error(`The slow file ${file} is not in the npm test inventory.`)
const gameFiles = (): string[] => [...ownership].filter(([, owner]) => owner === 'game').map(([file]) => file).sort()
const isAlone = (name: string): boolean => Object.hasOwn(alone, name)
const shardOf = (name: string): number | null => { const found = /^game-([1-9])$/.exec(name); return found && Number(found[1]) <= GAME_SHARDS ? Number(found[1]) : null }
const complete = new Set(patterns.flatMap(pattern => globSync(pattern)))
if (!complete.size || complete.size !== ownership.size || [...complete].some(file => !ownership.has(file))) throw new Error('Hosted partitions do not cover the complete npm test file inventory.')

const selected = process.argv[2]
if (selected === '--plan' && process.argv.length === 3) {
  const shards = Object.fromEntries(Array.from({ length: GAME_SHARDS }, (_, n) => [`game-${n + 1}`, gameFiles().filter((_, index) => index % GAME_SHARDS === n).length]))
  const edges = Object.fromEntries(Array.from({ length: EDGE_SHARDS }, (_, n) => [`edge-${n + 1}`, edgeShard(n + 1).length]))
  const partitions = Object.fromEntries(Object.entries(plan).map(([name, globs]) => [name, { globs, files: [...ownership.values()].filter(owner => owner === name).length }]))
  process.stdout.write(JSON.stringify({ totalFiles: complete.size, partitions, game_shards: shards, edge_shards: edges, jobs_for_slow_files: alone }, null, 2) + '\n')
} else {
  const shard = selected === undefined ? null : shardOf(selected), edge = selected === undefined ? null : edgeShardOf(selected)
  const job = selected !== undefined && isAlone(selected) ? alone[selected] : undefined
  if (process.argv.length !== 3 || selected === undefined || (shard === null && edge === null && job === undefined && selected !== 'host' && selected !== 'tooling')) {
    throw new Error(`Choose game-1 ... game-${GAME_SHARDS}, edge-1 ... edge-${EDGE_SHARDS}, host, tooling, ${Object.keys(alone).join(', ')}, or --plan.`)
  }
  const chosen = job ? [job.file] : edge !== null ? edgeShard(edge) : shard !== null ? gameFiles().filter((_, index) => index % GAME_SHARDS === shard - 1) : plan[selected as keyof typeof groups]
  const only = (job?.names ?? []).flatMap(name => ['--test-name-pattern', name])
  const child = spawn(process.execPath, ['--experimental-strip-types', '--test', '--test-concurrency=1', ...only, ...chosen], { stdio: 'inherit', env: { ...process.env, ...job?.env } })
  const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'] as const
  for (const signal of signals) process.on(signal, () => child.kill(signal))
  child.on('error', error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1 })
  child.on('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0) })
}
