// Partition the existing npm test corpus across hosted runners without changing its globs or concurrency.
import { globSync, readFileSync } from 'node:fs'
import { spawn } from 'node:child_process'

const prefix = 'node --experimental-strip-types --test --test-concurrency=1 '
const groups = { game: 'src/', host: 'server/', tooling: 'scripts/' }
// Two files are slower than everything else in `src/` together, so each gets a job of its own (the game job ran out of its 25 minutes with them):
// the full economy simulation (all starts and strategies, about 14 minutes) and the contracts of every playable city (about 10).
const alone = { economy: 'src/game/economy.test.ts', cities: 'src/game/cities/allCities.test.ts' }
type Suite = keyof typeof groups | keyof typeof alone
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

const aloneOwner = new Map<string, string>(Object.entries(alone).map(([name, path]) => [path, name]))
const ownership = new Map<string, string>()
for (const [name, globs] of Object.entries(plan)) {
  for (const file of new Set(globs.flatMap(pattern => globSync(pattern)))) {
    if (ownership.has(file)) throw new Error(`Test file belongs to multiple partitions: ${file}`)
    ownership.set(file, aloneOwner.get(file) ?? name)
  }
}
for (const [path, name] of aloneOwner) if (ownership.get(path) !== name) throw new Error(`The slow file ${path} is not in the npm test inventory.`)
// What each partition runs: its globs; the files that run alone; and for the game partition every other file of src/.
const files = (name: Suite): string[] => name === 'economy' || name === 'cities' ? [alone[name]] : name === 'game' ? [...ownership].filter(([, owner]) => owner === 'game').map(([file]) => file).sort() : plan[name]
const complete = new Set(patterns.flatMap(pattern => globSync(pattern)))
if (!complete.size || complete.size !== ownership.size || [...complete].some(file => !ownership.has(file))) throw new Error('Hosted partitions do not cover the complete npm test file inventory.')

const selected = process.argv[2]
if (selected === '--plan' && process.argv.length === 3) {
  const names: Suite[] = ['game', 'host', 'tooling', 'economy', 'cities']
  process.stdout.write(JSON.stringify({ totalFiles: complete.size, partitions: Object.fromEntries(names.map(name => [name, { globs: name === 'economy' || name === 'cities' ? [alone[name]] : plan[name], files: [...ownership.values()].filter(owner => owner === name).length }])) }, null, 2) + '\n')
} else {
  if (process.argv.length !== 3 || (selected !== 'game' && selected !== 'host' && selected !== 'tooling' && selected !== 'economy' && selected !== 'cities')) throw new Error('Choose game, host, tooling, economy, cities, or --plan.')
  const child = spawn(process.execPath, ['--experimental-strip-types', '--test', '--test-concurrency=1', ...files(selected)], { stdio: 'inherit' })
  const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'] as const
  for (const signal of signals) process.on(signal, () => child.kill(signal))
  child.on('error', error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1 })
  child.on('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0) })
}
