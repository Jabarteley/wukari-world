#!/usr/bin/env node
// Assemble one city release in an app worktree from hosted factory runs (the manual steps every release helper repeated).
//
//   node scripts/geo/factory/assemble-release.mjs --app <app worktree> --base <branch> --new-branch <name> \
//     --runs cc=<runId>,cc=<runId>,... [--report <file.md>] [--main-merge] [--push] [--dry-run] [more flags: --help]
//
// The caller makes the worktree (git worktree add -b <new-branch> <app> origin/<base>) and runs `npm ci` or links node_modules.
// This script then, stopping at the first failure:
//   preflight -> fetch/merge -> download artifacts -> import-delivery.mjs -> cities:catalogue -> land components (check, regenerate
//   from the cached Natural Earth source when stale) -> build until the tree is stable -> typecheck -> size:download -> targeted
//   tests -> every delivered file < 3 MB -> report -> commit -> optional push.
// It only writes inside --app, in its own temp dir (deleted at the end) and to --report. It never touches another worktree, never
// forces a push, never prints credentials (gh keeps its own login; env values are never logged), never starts workflows or deploys.
import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, readdirSync, rmSync, statSync, statfsSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const REPO = 'kromate/joinallworld'
export const TRAILER = 'Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>'
export const FILE_LIMIT_BYTES = 3_000_000
export const DISK_FLOOR_BYTES = 8 * 1024 ** 3
export const DEFAULT_HEAP_MB = 6144
export const DEFAULT_LAND_SOURCE = join(homedir(), 'Documents/Allworld-notes/relay/astra-tools/travel-land-components/ne_10m_admin_0_countries.geojson')
export const LAND_SOURCE_BYTES = 13287234
export const MAX_BUILDS = 4
const HERE = dirname(fileURLToPath(import.meta.url))

const BOOLEAN_FLAGS = new Set(['main-merge', 'push', 'dry-run', 'replace', 'allow-refused', 'allow-nonsuccess', 'keep-dist', 'keep-tmp', 'slot', 'help'])
const VALUE_FLAGS = new Set(['app', 'base', 'new-branch', 'runs', 'report', 'cities', 'heap', 'land-source', 'repo', 'max-artifact-mb', 'tests-timeout'])

export const USAGE = `usage: assemble-release.mjs --app <app worktree> --base <branch> --new-branch <name> --runs cc=<runId>,cc=<runId>,... [options]
  --report <file.md>      write the Markdown report here (always written, also on failure; default: printed only)
  --main-merge            merge origin/main into the branch first (release step 1: the commit must contain current main)
  --push                  push HEAD to origin <new-branch> (fast-forward only, no force) after everything passed
  --dry-run               print the plan, change nothing (no git, gh, npm or file writes)
  --cities a,b            restrict the import to these city ids (passed to import-delivery.mjs)
  --replace               pass --replace to the importer (overwrite a city already in the app)
  --allow-refused         keep going with the cities the importer accepted when it refused others (default: restore and stop)
  --allow-nonsuccess      accept a run whose conclusion is not "success"
  --heap <MB>             NODE_OPTIONS --max-old-space-size for build/typecheck/tests (default ${DEFAULT_HEAP_MB}; kept if NODE_OPTIONS already sets it)
  --land-source <file>    pinned Natural Earth geojson (default ${DEFAULT_LAND_SOURCE})
  --slot                  use the heavy-slot npm scripts (build:slot, typecheck:slot) so only one heavy job runs at a time
  --keep-dist / --keep-tmp  do not delete app/dist / the temp download dir
  --tests-timeout <min>   kill the targeted tests after this many minutes and fail (default 120; a loaded Mac is slow, a hang must not be silent)
  --repo <owner/name>     default ${REPO}; --max-artifact-mb <n> default 250`

/** cc=runId,cc=runId -> [{cc, run}] (same cc twice is fine: two runs of one country). */
export function parseRuns(text) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('--runs needs cc=<runId>,cc=<runId>,...')
  const out = []
  for (const part of text.split(',').map((s) => s.trim()).filter(Boolean)) {
    const m = /^([a-z]{2})=(\d{6,})$/.exec(part)
    if (!m) throw new Error(`bad --runs entry "${part}": expected <two-letter lowercase country code>=<numeric run id>`)
    if (out.some((r) => r.cc === m[1] && r.run === m[2])) throw new Error(`--runs lists ${part} twice`)
    out.push({ cc: m[1], run: m[2] })
  }
  return out
}

const BRANCH = /^[A-Za-z0-9][A-Za-z0-9._\-/]*$/
const checkBranch = (name, flag) => {
  if (!BRANCH.test(name) || name.includes('..') || name.endsWith('/') || name.endsWith('.lock')) throw new Error(`${flag} "${name}" is not a plain branch name`)
}

export function parseArgs(argv) {
  const o = { replace: false, 'main-merge': false, push: false, 'dry-run': false, 'allow-refused': false, 'allow-nonsuccess': false, 'keep-dist': false, 'keep-tmp': false, slot: false, help: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) throw new Error(`unexpected argument ${a}`)
    const name = a.slice(2)
    if (BOOLEAN_FLAGS.has(name)) o[name] = true
    else if (VALUE_FLAGS.has(name)) {
      const v = argv[++i]
      if (v === undefined || v.startsWith('--')) throw new Error(`${a} needs a value`)
      o[name] = v
    } else throw new Error(`unknown argument ${a}`)
  }
  if (o.help) return o
  for (const need of ['app', 'base', 'new-branch', 'runs']) if (!o[need]) throw new Error(`--${need} is required`)
  o.base = o.base.replace(/^origin\//, '')
  checkBranch(o.base, '--base')
  checkBranch(o['new-branch'], '--new-branch')
  if (o['new-branch'] === 'main' || o['new-branch'] === o.base) throw new Error('--new-branch must differ from main and from --base (never push the base)')
  o.runList = parseRuns(o.runs)
  o.app = resolve(o.app)
  if (o.report) {
    o.report = resolve(o.report)
    if (o.report === o.app || o.report.startsWith(o.app + sep)) throw new Error('--report must be outside the app worktree (it would dirty the tree)')
  }
  o.heap = o.heap === undefined ? DEFAULT_HEAP_MB : Number(o.heap)
  if (!Number.isInteger(o.heap) || o.heap < 1024 || o.heap > 65536) throw new Error('--heap must be a whole number of MB between 1024 and 65536')
  o.maxArtifactMb = o['max-artifact-mb'] === undefined ? 250 : Number(o['max-artifact-mb'])
  if (!(o.maxArtifactMb > 0)) throw new Error('--max-artifact-mb must be a positive number')
  o.testsTimeoutMin = o['tests-timeout'] === undefined ? 120 : Number(o['tests-timeout'])
  if (!(o.testsTimeoutMin > 0)) throw new Error('--tests-timeout must be a positive number of minutes')
  o.repo = o.repo ?? REPO
  if (!/^[\w.-]+\/[\w.-]+$/.test(o.repo)) throw new Error('--repo must look like owner/name')
  o.landSource = o['land-source'] ? resolve(o['land-source']) : DEFAULT_LAND_SOURCE
  if (o.cities !== undefined) {
    o.cityList = o.cities.split(',').map((s) => s.trim()).filter(Boolean)
    for (const id of o.cityList) if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error(`bad city id ${id} in --cities`)
  }
  return o
}

/** The test targets: [label, directory (non-recursive) or exact file, name filter]. Per-city tests of imported ids are added at run time. */
export const TEST_GROUPS = [
  { label: 'src/game/cities/*.test.ts', dir: 'src/game/cities' },
  { label: 'src/map3d/geo/*.test.ts', dir: 'src/map3d/geo' },
  { label: 'src/app/features/travel/*.test.ts', dir: 'src/app/features/travel' },
  { label: 'server/release.test.ts', file: 'server/release.test.ts' },
  { label: 'relief / stuck / generatedLinks tests (any folder under src, server)', find: /(?:relief|stuck|generatedlinks)[^/]*\.test\.ts$/i },
]

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.cache'])
function walk(dir, visit) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(join(dir, e.name), visit) } else if (e.isFile()) visit(join(dir, e.name))
  }
}

/** Resolve the test list against an app checkout (relative paths, sorted, de-duplicated). Throws when a group matches nothing. */
export function expandTests(app, cityIds = []) {
  const files = new Set()
  const groups = []
  for (const g of TEST_GROUPS) {
    const found = []
    if (g.dir) {
      const d = join(app, g.dir)
      if (existsSync(d)) for (const n of readdirSync(d)) if (n.endsWith('.test.ts') && statSync(join(d, n)).isFile()) found.push(`${g.dir}/${n}`)
    } else if (g.file) {
      if (existsSync(join(app, g.file))) found.push(g.file)
    } else {
      for (const top of ['src', 'server']) if (existsSync(join(app, top))) walk(join(app, top), (p) => { const r = relative(app, p).split(sep).join('/'); if (g.find.test(r)) found.push(r) })
    }
    if (!found.length) throw new Error(`test group "${g.label}" matches no file in ${app}`)
    found.sort()
    found.forEach((f) => files.add(f))
    groups.push({ label: g.label, count: found.length })
  }
  let perCity = 0
  for (const id of cityIds) {
    const d = join(app, 'src/game/cities', id)
    if (!existsSync(d)) continue
    for (const n of readdirSync(d).sort()) if (n.endsWith('.test.ts')) { files.add(`src/game/cities/${id}/${n}`); perCity++ }
  }
  if (cityIds.length) groups.push({ label: 'per-city tests of the imported cities', count: perCity })
  return { files: [...files].sort(), groups }
}

/** Plan = ordered steps, each with the commands it would run (display strings). */
export function buildPlan(o) {
  const nodeOpt = `NODE_OPTIONS="$NODE_OPTIONS --max-old-space-size=${o.heap}"`
  const npmBuild = o.slot ? 'npm run build:slot' : 'npm run build'
  const npmTypecheck = o.slot ? 'npm run typecheck:slot' : 'npm run typecheck'
  const steps = []
  const add = (id, title, commands) => steps.push({ n: steps.length + 1, id, title, commands })
  add('preflight', 'Preflight: app is a clean, separate git worktree on --new-branch with node_modules; gh logged in; disk >= 8 GiB', [
    `git -C ${o.app} status --porcelain  (must be empty)`, `git -C ${o.app} branch --show-current  (must be ${o['new-branch']})`, 'gh auth status (exit code only)'])
  add('fetch', `Fetch origin/${o.base}${o['main-merge'] ? ' and origin/main, merge origin/main' : ''}; the branch must contain origin/${o.base}`, [
    `git fetch origin +refs/heads/${o.base}:refs/remotes/origin/${o.base}`, ...(o['main-merge'] ? ['git fetch origin +refs/heads/main:refs/remotes/origin/main', 'git merge --no-edit origin/main  (abort on conflict)'] : [])])
  add('download', 'Resolve and download the factory artifacts into a temp dir', o.runList.flatMap(({ cc, run }) => [
    `gh run view ${run} -R ${o.repo} --json headSha,status,conclusion`, `gh api repos/${o.repo}/actions/runs/${run}/artifacts  (name city-factory-${cc}-<N>targets-<sha>)`, `gh run download ${run} -R ${o.repo} -n <artifact> -D <tmp>/deliveries/<artifact>`]))
  add('import', 'Import the deliveries (verifies machine-holds, receipts and pinned hashes; refusals are reported)', [
    `node scripts/geo/factory/import-delivery.mjs --app ${o.app} --deliveries <tmp>/deliveries${o.cityList ? ` --cities ${o.cityList.join(',')}` : ''}${o.replace ? ' --replace' : ''}`])
  add('catalogue', 'Regenerate catalogue, loaders and routes', ['npm run cities:catalogue'])
  add('land', 'Land components: check, regenerate from the cached Natural Earth source when stale', [
    'npm run cities:land:check', `python3 -I scripts/city/build-land-components.py --source ${o.landSource} --catalogue src/game/cities/catalogue.generated.ts --out <tmp>/land-proof.json --typescript src/game/cities/land-components.generated.ts  (only when stale)`, 'npm run cities:land:check'])
  add('build', `Build until the tree stops changing (at least twice, at most ${MAX_BUILDS})`, [`${nodeOpt} ${npmBuild}`, `${nodeOpt} ${npmBuild}  (tree fingerprint must be equal)`])
  add('typecheck', 'Typecheck', [`${nodeOpt} ${npmTypecheck}`])
  add('size', 'Startup / download budgets (fails when any budget is exceeded)', ['npm run size:download'])
  add('tests', 'Targeted tests', [`${nodeOpt} node --experimental-strip-types --test --test-concurrency=1 --test-reporter=tap <files: ${TEST_GROUPS.map((g) => g.label).join('; ')}; src/game/cities/<id>/*.test.ts of imported ids>`])
  add('sizes', `Every delivered file and generated file < ${FILE_LIMIT_BYTES.toLocaleString('en-US')} bytes`, ['stat of src/game/cities/<id>/**, destination-detail recipe, world/<root>/{receipts,sources}/<id>.json, *.generated.ts'])
  add('commit', 'Commit with the standard trailer (idempotent: a Factory-Runs trailer already on the branch means the import is skipped)', ['git add -A', `git commit  (… ${TRAILER})`])
  add('report', o.report ? `Write the Markdown report to ${o.report}` : 'Print the Markdown report (no --report given)', [])
  if (o.push) add('push', `Push (fast-forward only, no force) HEAD to origin ${o['new-branch']}`, [`git push origin HEAD:refs/heads/${o['new-branch']}`])
  add('cleanup', 'Delete the temp download dir' + (o['keep-dist'] ? '' : ' and app/dist'), [])
  return steps
}

export function formatPlan(o, steps) {
  const lines = [`DRY RUN: nothing is executed or written.`, `app:        ${o.app}`, `base:       origin/${o.base}`, `new branch: ${o['new-branch']}`, `repo:       ${o.repo}`,
    `runs:       ${o.runList.map((r) => `${r.cc}=${r.run}`).join(', ')}`, `options:    ${['main-merge', 'push', 'replace', 'allow-refused', 'allow-nonsuccess', 'slot'].filter((k) => o[k]).join(' ') || '(none)'}  heap=${o.heap}MB`, '']
  for (const s of steps) { lines.push(`${String(s.n).padStart(2)}. ${s.title}`); for (const c of s.commands) lines.push(`      $ ${c}`) }
  return lines.join('\n')
}

/** Lines printed by import-delivery.mjs: IMPORTED|REFUSED <id>  [artifact]  why */
export function parseImporterOutput(text) {
  const rows = []
  for (const line of text.split('\n')) {
    const m = /^(IMPORTED|REFUSED)\s+(\S+)\s+\[([^\]]*)\]\s+(.*)$/.exec(line)
    if (m) rows.push({ ok: m[1] === 'IMPORTED', id: m[2], artifact: m[3], why: m[4].trim() })
  }
  return rows
}

/** Final `# tests N` ... lines of the TAP reporter (the last occurrence is the run total). */
export function parseTapTotals(text) {
  const totals = {}
  for (const key of ['tests', 'suites', 'pass', 'fail', 'cancelled', 'skipped', 'todo']) {
    const all = [...text.matchAll(new RegExp(`^# ${key} (\\d+)\\s*$`, 'gm'))]
    if (all.length) totals[key] = Number(all[all.length - 1][1])
  }
  return totals
}

/** Lines of `npm run size:download`: "ok   STARTUP_RAW   610119  budget ...". */
export function parseBudgetLines(text) {
  const rows = []
  for (const line of text.split('\n')) {
    const m = /^(ok\s|OVER|n\/a)\s+([A-Z_]+)\s+(\d+|-)\s+budget (.*)$/.exec(line)
    if (m) rows.push({ status: m[1].trim(), budget: m[2], measured: m[3] === '-' ? null : Number(m[3]), rest: m[4].trim() })
  }
  return rows
}

export function commitMessage({ ids, countries, runs, heads, startup, landRegenerated, refused }) {
  const subject = `Release: import ${ids.length} factory-passed ${ids.length === 1 ? 'city' : 'cities'} in ${countries.length} ${countries.length === 1 ? 'country' : 'countries'} (${ids.join(' ')})`
  const body = [`Factory runs ${runs.map((r) => `${r.cc} ${r.run} (head ${(heads[r.run] ?? '?').slice(0, 8)})`).join(', ')}, imported with import-delivery.mjs (assemble-release.mjs).`,
    `${landRegenerated ? 'Land components regenerated. ' : ''}${startup ? `Startup ${startup}.` : ''}`.trim(),
    refused.length ? `Not imported: ${refused.join(', ')}.` : ''].filter(Boolean).join('\n')
  return `${subject}\n\n${body}\n\nFactory-Runs: ${runs.map((r) => `${r.cc}=${r.run}`).sort().join(',')}\nFactory-Cities: ${ids.join(',')}\n\n${TRAILER}\n`
}

// ---------------------------------------------------------------------------------------------------------------------------
// Execution

class StepFailure extends Error {
  constructor(step, message, detail = '') { super(message); this.step = step; this.detail = detail }
}

const tailOf = (path, n = 40) => { try { return readFileSync(path, 'utf8').split('\n').slice(-n).join('\n').trim() } catch { return '' } }
const sha256 = (text) => createHash('sha256').update(text).digest('hex')
const seconds = (ms) => `${(ms / 1000).toFixed(1)} s`
const say = (m) => console.log(m)

function makeRunner(o, tmp) {
  const env = { ...process.env }
  if (!/--max-old-space-size/.test(env.NODE_OPTIONS ?? '')) env.NODE_OPTIONS = `${env.NODE_OPTIONS ?? ''} --max-old-space-size=${o.heap}`.trim()
  let seq = 0
  /** Run a command with output in a log file; returns { code, log, text }. */
  const run = (label, cmd, args, { cwd = o.app, env: extra = {}, input, timeoutMs } = {}) => {
    const log = join(tmp, 'logs', `${String(++seq).padStart(2, '0')}-${label.replace(/[^\w.-]+/g, '_')}.log`)
    const fd = openSync(log, 'w')
    let result
    try { result = spawnSync(cmd, args, { cwd, env: { ...env, ...extra }, stdio: [input === undefined ? 'ignore' : 'pipe', fd, fd], input, maxBuffer: 1 << 30, timeout: timeoutMs, killSignal: 'SIGKILL' }) } finally { closeSync(fd) }
    if (result.error?.code === 'ETIMEDOUT') return { code: 124, timedOut: true, log, get text() { return readFileSync(log, 'utf8') } }
    if (result.error) return { code: 127, log, text: `${cmd}: ${result.error.message}` }
    return { code: result.status ?? 1, log, get text() { return readFileSync(log, 'utf8') } }
  }
  /** Capture stdout (small outputs) without a log file. */
  const out = (cmd, args, { cwd = o.app } = {}) => {
    const r = spawnSync(cmd, args, { cwd, env, encoding: 'utf8', maxBuffer: 1 << 28 })
    return { code: r.error ? 127 : r.status ?? 1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' }
  }
  return { run, out, env }
}

/** The tree as git would commit it right now, without touching the real index: a tree hash from a scratch index. */
function treeFingerprint(o, tmp, R) {
  const idx = join(tmp, 'fp-index')
  rmSync(idx, { force: true })
  const e = { GIT_INDEX_FILE: idx }
  const read = R.run('fp-read-tree', 'git', ['read-tree', 'HEAD'], { env: e })
  if (read.code) throw new StepFailure('build', 'git read-tree failed while fingerprinting the tree', tailOf(read.log))
  const add = R.run('fp-add', 'git', ['add', '-A'], { env: e })
  if (add.code) throw new StepFailure('build', 'git add failed while fingerprinting the tree', tailOf(add.log))
  const w = spawnSync('git', ['write-tree'], { cwd: o.app, env: { ...R.env, ...e }, encoding: 'utf8' })
  if (w.status) throw new StepFailure('build', 'git write-tree failed while fingerprinting the tree', w.stderr)
  return w.stdout.trim()
}

function deliveredFiles(app, ids) {
  const files = new Set()
  const add = (rel) => { if (existsSync(join(app, rel)) && statSync(join(app, rel)).isFile()) files.add(rel) }
  for (const id of ids) {
    const d = join(app, 'src/game/cities', id)
    if (existsSync(d)) walk(d, (p) => files.add(relative(app, p).split(sep).join('/')))
    add(`scripts/geo/destination-detail/${id}.ts`)
    const world = join(app, 'world')
    if (existsSync(world)) for (const root of readdirSync(world)) if (/^playable-/.test(root)) for (const kind of ['receipts', 'sources']) add(`world/${root}/${kind}/${id}.json`)
  }
  const cities = join(app, 'src/game/cities')
  if (existsSync(cities)) for (const n of readdirSync(cities)) if (n.endsWith('.generated.ts')) add(`src/game/cities/${n}`)
  return [...files].sort()
}

export function renderReport(S) {
  const L = []
  const ok = S.status === 'PASS'
  L.push(`# Release assembly: ${S.opts['new-branch']} (${S.status}${ok ? '' : ` at step "${S.failedStep}"`})`, '',
    `- App: \`${S.opts.app}\``, `- Base: \`origin/${S.opts.base}\` ${S.baseSha ? `(${S.baseSha.slice(0, 8)})` : ''}, new branch \`${S.opts['new-branch']}\`${S.headSha ? `, HEAD ${S.headSha}` : ''}`,
    `- Started ${S.started}; ${S.steps.length} steps; tool \`assemble-release.mjs\`${S.opts['main-merge'] ? '; origin/main merged' : ''}`, '')
  if (!ok) L.push('## Failure', '', `Step **${S.failedStep}**: ${S.failure}`, '', ...(S.failureDetail ? ['```', S.failureDetail.slice(-6000), '```', ''] : []))
  L.push('## Factory runs', '', '| country | run | head SHA | status | conclusion | artifact |', '|---|---|---|---|---|---|')
  for (const r of S.runs) L.push(`| ${r.cc} | ${r.run} | ${r.headSha ?? '?'} | ${r.status ?? '?'} | ${r.conclusion ?? '?'} | ${r.artifact ?? '?'} |`)
  L.push('', '## Import', '')
  if (S.skippedImport) L.push(`Import skipped: the branch already carries these runs (Factory-Runs trailer). Cities: ${S.importedIds.join(', ') || 'none'}.`, '')
  if (S.importRows.length) { L.push('| city | result | detail |', '|---|---|---|'); for (const r of S.importRows) L.push(`| ${r.id} | ${r.ok ? 'IMPORTED' : 'REFUSED'} | ${r.why.replace(/\|/g, '\\|')} |`) }
  else if (!S.skippedImport) L.push('No import rows.')
  L.push('', `Imported ${S.importedIds.length}; refused ${S.importRows.filter((r) => !r.ok).length}.`, '')
  L.push('## Regeneration', '', `- cities:catalogue: ${S.catalogue ?? 'not run'}`, `- land components: ${S.land ?? 'not run'}`, `- build: ${S.build ?? 'not run'}`, `- typecheck: ${S.typecheck ?? 'not run'}`, '')
  L.push('## Startup budgets (npm run size:download)', '')
  if (S.budgets?.length) { L.push('| status | budget | measured | limit |', '|---|---|---|---|'); for (const b of S.budgets) L.push(`| ${b.status} | ${b.budget} | ${b.measured ?? '-'} | ${b.rest.replace(/\|/g, '\\|').slice(0, 90)} |`) } else L.push('not measured')
  L.push('', '## Tests', '')
  if (S.tests) {
    L.push(`${S.tests.files} files; tests ${S.tests.totals.tests ?? '?'}, pass ${S.tests.totals.pass ?? '?'}, fail ${S.tests.totals.fail ?? '?'}, skipped ${S.tests.totals.skipped ?? 0}, cancelled ${S.tests.totals.cancelled ?? 0}. NODE_OPTIONS max-old-space-size ${S.opts.heap} MB, --test-concurrency=1.`, '')
    for (const g of S.tests.groups) L.push(`- ${g.label}: ${g.count} file(s)`)
  } else L.push('not run')
  L.push('', `## File sizes (limit ${FILE_LIMIT_BYTES.toLocaleString('en-US')} bytes)`, '')
  if (S.sizes) { L.push(`${S.sizes.count} delivered/generated files checked; largest:`, ''); for (const f of S.sizes.largest) L.push(`- ${f.bytes.toLocaleString('en-US')}  ${f.path}${f.bytes >= FILE_LIMIT_BYTES ? '  OVER' : ''}`) } else L.push('not run')
  L.push('', '## Steps', '', '| # | step | result | time |', '|---|---|---|---|')
  for (const s of S.steps) L.push(`| ${s.n} | ${s.id} | ${s.result} | ${s.time} |`)
  L.push('', '## Commit and push', '', `- commit: ${S.commit ?? 'none'}`, `- push: ${S.pushed ?? 'not requested'}`, '')
  return L.join('\n')
}

function main(argv) {
  const o = parseArgs(argv)
  if (o.help) { say(USAGE); return 0 }
  const plan = buildPlan(o)
  if (o['dry-run']) {
    say(formatPlan(o, plan))
    say(`\napp exists: ${existsSync(o.app) ? 'yes' : 'no (only needed for a real run)'}; land source exists: ${existsSync(o.landSource) ? 'yes' : 'no'}`)
    if (existsSync(o.app)) { try { const t = expandTests(o.app); say(`test files resolved now: ${t.files.length} (${t.groups.map((g) => `${g.count}`).join(' + ')})`) } catch (e) { say(`test list: ${e.message}`) } }
    return 0
  }

  const S = { opts: o, status: 'FAIL', started: new Date().toISOString(), steps: [], runs: o.runList.map((r) => ({ ...r })), importRows: [], importedIds: [], skippedImport: false, baseSha: '', headSha: '', failedStep: '', failure: '', failureDetail: '' }
  const tmpRoot = existsSync('/private/tmp') ? '/private/tmp' : tmpdir()
  const tmp = mkdtempSync(join(tmpRoot, 'aw-assemble-'))
  mkdirSync(join(tmp, 'logs'))
  mkdirSync(join(tmp, 'deliveries'))
  const R = makeRunner(o, tmp)
  const git = (...args) => R.out('git', ['-C', o.app, ...args])
  const stepList = new Map(plan.map((s) => [s.id, s]))
  let current = ''
  const begin = (id) => { current = id; S.steps.push({ n: stepList.get(id).n, id, result: 'running', time: '', t0: Date.now() }); say(`[${stepList.get(id).n}/${plan.length}] ${stepList.get(id).title}`) }
  const end = (result = 'ok') => { const s = S.steps[S.steps.length - 1]; s.result = result; s.time = seconds(Date.now() - s.t0) }
  const fail = (message, detail = '') => { throw new StepFailure(current, message, detail) }
  const must = (r, message) => { if (r.code) fail(`${message} (exit ${r.code}); log tail below`, tailOf(r.log, 60)) }
  let landRegenerated = false

  try {
    // 1 preflight
    begin('preflight')
    if (!existsSync(join(o.app, 'package.json')) || !existsSync(join(o.app, 'src/game/cities'))) fail(`${o.app} is not an app checkout (package.json or src/game/cities missing)`)
    const top = git('rev-parse', '--show-toplevel')
    if (top.code || resolve(top.stdout.trim()) !== o.app) fail(`${o.app} is not the top of a git worktree (git says "${top.stdout.trim()}")`)
    const wt = git('worktree', 'list', '--porcelain')
    const first = /^worktree (.+)$/m.exec(wt.stdout)?.[1]
    if (first && resolve(first) === o.app) fail(`${o.app} is the main checkout; the app must be a separate worktree on ${o['new-branch']}`)
    const branch = git('branch', '--show-current').stdout.trim()
    if (branch !== o['new-branch']) fail(`the app is on branch "${branch || '(detached)'}", expected ${o['new-branch']}: make the worktree with git worktree add -b ${o['new-branch']} <path> origin/${o.base}`)
    const dirty = git('status', '--porcelain').stdout.trim()
    if (dirty) fail('the app tree is not clean; commit or discard first', dirty.split('\n').slice(0, 30).join('\n'))
    if (!existsSync(join(o.app, 'node_modules/vite'))) fail('node_modules is missing in the app (run npm ci there, or link an existing node_modules); this script never installs')
    if (!existsSync(o.landSource) || statSync(o.landSource).size !== LAND_SOURCE_BYTES) say(`  note: land source ${o.landSource} missing or not ${LAND_SOURCE_BYTES} bytes; only a problem if regeneration is needed`)
    const auth = R.run('gh-auth', 'gh', ['auth', 'status'])
    if (auth.code) fail('gh is not logged in (gh auth status failed); this script never prints or reads tokens')
    const fs = statfsSync(tmpRoot)
    if (fs.bavail * fs.bsize < DISK_FLOOR_BYTES) fail(`less than 8 GiB free under ${tmpRoot}`)
    end()

    // 2 fetch / merge
    begin('fetch')
    must(R.run('fetch-base', 'git', ['fetch', 'origin', `+refs/heads/${o.base}:refs/remotes/origin/${o.base}`]), `git fetch origin ${o.base} failed`)
    S.baseSha = git('rev-parse', `origin/${o.base}`).stdout.trim()
    if (o['main-merge']) {
      must(R.run('fetch-main', 'git', ['fetch', 'origin', '+refs/heads/main:refs/remotes/origin/main']), 'git fetch origin main failed')
      const merge = R.run('merge-main', 'git', ['-C', o.app, 'merge', '--no-edit', '-m', `Merge origin/main into ${o['new-branch']}`, '-m', TRAILER, 'origin/main'], { env: { GIT_MERGE_AUTOEDIT: 'no' } })
      if (merge.code) { const files = git('diff', '--name-only', '--diff-filter=U').stdout.trim(); git('merge', '--abort'); fail('merging origin/main conflicts; merge aborted, tree restored', `conflicting files:\n${files}\n${tailOf(merge.log, 20)}`) }
    }
    if (git('merge-base', '--is-ancestor', `origin/${o.base}`, 'HEAD').code !== 0) fail(`HEAD does not contain origin/${o.base} (${S.baseSha.slice(0, 8)}); recreate the worktree from origin/${o.base} or rebase it`)
    end()

    // idempotency: a Factory-Runs trailer on the branch means this import is already committed
    const wanted = o.runList.map((r) => `${r.cc}=${r.run}`).sort().join(',')
    const logText = git('log', `origin/${o.base}..HEAD`, '--format=%B%x00').stdout
    const prior = logText.split('\0').find((m) => new RegExp(`^Factory-Runs: ${wanted}$`, 'm').test(m))
    if (prior) { S.skippedImport = true; S.importedIds = (/^Factory-Cities: (.*)$/m.exec(prior)?.[1] ?? '').split(',').filter(Boolean) }

    // 3 download
    begin('download')
    for (const r of S.runs) {
      const v = R.out('gh', ['run', 'view', r.run, '-R', o.repo, '--json', 'headSha,status,conclusion'])
      if (v.code) fail(`gh run view ${r.run} failed`, v.stderr.slice(-500))
      const j = JSON.parse(v.stdout)
      Object.assign(r, { headSha: j.headSha, status: j.status, conclusion: j.conclusion })
      if (S.skippedImport) continue
      if (!/^[0-9a-f]{40}$/.test(j.headSha ?? '')) fail(`run ${r.run} has no head SHA`)
      if (j.status !== 'completed') fail(`run ${r.run} is ${j.status}, not completed`)
      if (j.conclusion !== 'success' && !o['allow-nonsuccess']) fail(`run ${r.run} concluded "${j.conclusion}" (pass --allow-nonsuccess to import what it did deliver)`)
      const a = R.out('gh', ['api', `repos/${o.repo}/actions/runs/${r.run}/artifacts`, '--paginate', '--jq', '.artifacts[] | [.name, .expired, .size_in_bytes] | @tsv'])
      if (a.code) fail(`listing artifacts of run ${r.run} failed`, a.stderr.slice(-500))
      const rows = a.stdout.split('\n').filter(Boolean).map((l) => l.split('\t'))
      const re = new RegExp(`^city-factory-${r.cc}-\\d+targets-[0-9a-f]{7,40}$`)
      const hits = rows.filter(([name, expired]) => re.test(name) && expired !== 'true')
      if (hits.length !== 1) fail(`run ${r.run}: expected exactly one live artifact city-factory-${r.cc}-<N>targets-<sha>, found ${hits.length}`, `artifacts of the run:\n${rows.map((x) => `${x[0]} expired=${x[1]} bytes=${x[2]}`).join('\n') || '(none)'}`)
      const [name, , bytes] = hits[0]
      if (Number(bytes) > o.maxArtifactMb * 1024 * 1024) fail(`artifact ${name} is ${(Number(bytes) / 1048576).toFixed(0)} MB, over --max-artifact-mb ${o.maxArtifactMb}`)
      if (existsSync(join(tmp, 'deliveries', name))) fail(`artifact ${name} is named by two runs`)
      r.artifact = name
      say(`  ${r.cc}: run ${r.run} head ${j.headSha.slice(0, 8)} artifact ${name} (${(Number(bytes) / 1048576).toFixed(1)} MB)`)
      must(R.run(`download-${r.cc}`, 'gh', ['run', 'download', r.run, '-R', o.repo, '-n', name, '-D', join(tmp, 'deliveries', name)], { cwd: tmp }), `gh run download ${r.run} failed`)
    }
    if (S.skippedImport) say('  already imported on this branch: downloads skipped'); end(S.skippedImport ? 'skipped' : 'ok')

    // 4 import
    begin('import')
    if (S.skippedImport) { end('skipped') } else {
      const args = [join(HERE, 'import-delivery.mjs'), '--app', o.app, '--deliveries', join(tmp, 'deliveries')]
      if (o.cityList) args.push('--cities', o.cityList.join(','))
      if (o.replace) args.push('--replace')
      const imp = R.run('import', process.execPath, args, { cwd: HERE })
      S.importRows = parseImporterOutput(imp.text)
      S.importedIds = S.importRows.filter((r) => r.ok).map((r) => r.id)
      const refused = S.importRows.filter((r) => !r.ok)
      // The tree was clean at the start, so putting these three paths back to HEAD removes exactly what the importer wrote.
      const restore = () => { for (const p of ['src/game/cities', 'scripts/geo/destination-detail', 'world']) { git('checkout', 'HEAD', '--', p); git('clean', '-fdq', '--', p) } }
      if (imp.code === 2 || !S.importRows.length) { restore(); fail('import-delivery.mjs failed before importing anything; tree restored', tailOf(imp.log, 30)) }
      if (refused.length && !o['allow-refused']) { restore(); fail(`${refused.length} refused, ${S.importedIds.length} would import: ${refused.map((r) => `${r.id} (${r.why})`).join('; ')}. Tree restored; fix the delivery or pass --allow-refused to import the rest`, tailOf(imp.log, 30)) }
      if (!S.importedIds.length) { restore(); fail('nothing was imported', tailOf(imp.log, 30)) }
      say(`  imported ${S.importedIds.length}: ${S.importedIds.join(' ')}${refused.length ? `; refused ${refused.length}: ${refused.map((r) => r.id).join(' ')}` : ''}`)
      end()
    }

    // 5 catalogue
    begin('catalogue')
    must(R.run('catalogue', 'npm', ['run', 'cities:catalogue']), 'npm run cities:catalogue failed')
    S.catalogue = 'regenerated'
    end()

    // 6 land components
    begin('land')
    const pkg = JSON.parse(readFileSync(join(o.app, 'package.json'), 'utf8'))
    if (!pkg.scripts?.['cities:land:check']) { S.land = 'this app has no cities:land:check; skipped'; end('skipped') } else {
      let check = R.run('land-check', 'npm', ['run', '-s', 'cities:land:check'])
      if (check.code === 0) S.land = 'current (check passed, nothing regenerated)'
      else {
        say('  land components stale: regenerating from the cached Natural Earth source')
        if (!existsSync(o.landSource)) fail(`land components are stale and the pinned source is missing: ${o.landSource}`)
        if (statSync(o.landSource).size !== LAND_SOURCE_BYTES) fail(`${o.landSource} is not the pinned ${LAND_SOURCE_BYTES}-byte Natural Earth file`)
        const script = join(o.app, 'scripts/city/build-land-components.py')
        if (!existsSync(script)) fail('scripts/city/build-land-components.py is missing in the app')
        const py = R.run('land-regen', 'python3', ['-I', script, '--source', o.landSource, '--catalogue', 'src/game/cities/catalogue.generated.ts', '--out', join(tmp, 'land-proof.json'), '--typescript', 'src/game/cities/land-components.generated.ts'])
        must(py, 'build-land-components.py failed')
        landRegenerated = true
        check = R.run('land-check-2', 'npm', ['run', '-s', 'cities:land:check'])
        must(check, 'cities:land:check still fails after regeneration')
        S.land = `regenerated (${tailOf(py.log, 2).replace(/\s+/g, ' ').slice(0, 300)})`
      }
      end()
    }

    // 7 build until stable
    begin('build')
    const buildArgs = o.slot ? ['run', 'build:slot'] : ['run', 'build']
    let previous = ''
    let stableAt = 0
    for (let i = 1; i <= MAX_BUILDS; i++) {
      say(`  build ${i}`)
      must(R.run(`build-${i}`, 'npm', buildArgs), `npm run build (#${i}) failed`)
      const fp = treeFingerprint(o, tmp, R)
      if (i >= 2 && fp === previous) { stableAt = i; break }
      previous = fp
    }
    if (!stableAt) fail(`the tree still changes after ${MAX_BUILDS} builds: a generated file is not reproducible`, git('status', '--short').stdout.split('\n').slice(0, 40).join('\n'))
    S.build = `stable: build ${stableAt} left the tree identical to build ${stableAt - 1}`
    end()

    // 8 typecheck
    begin('typecheck')
    must(R.run('typecheck', 'npm', ['run', o.slot ? 'typecheck:slot' : 'typecheck']), 'typecheck failed')
    S.typecheck = 'passed'
    end()

    // 9 size:download
    begin('size')
    const size = R.run('size-download', 'npm', ['run', 'size:download'])
    S.budgets = parseBudgetLines(size.text)
    const startupRows = S.budgets.filter((b) => b.budget.startsWith('STARTUP_'))
    if (startupRows.length < 3) fail('size:download printed no STARTUP_* budget lines; cannot confirm the startup numbers', tailOf(size.log, 40))
    S.startup = `${startupRows.map((b) => b.measured?.toLocaleString('en-US')).join(' / ')} (raw / gzip / brotli)`
    const over = S.budgets.filter((b) => b.status === 'OVER')
    if (size.code || over.length) fail(`BUDGET EXCEEDED: ${over.map((b) => `${b.budget} ${b.measured}`).join(', ') || `size:download exit ${size.code}`}`, tailOf(size.log, 40))
    say(`  startup ${S.startup}`)
    end()

    // 10 tests
    begin('tests')
    const { files, groups } = expandTests(o.app, S.importedIds)
    const t = R.run('tests', process.execPath, [fileURLToPath(import.meta.url), '--__timeboxed', String(o.testsTimeoutMin * 60_000), '--', process.execPath, '--experimental-strip-types', '--test', '--test-concurrency=1', '--test-reporter=tap', ...files])
    const totals = parseTapTotals(t.text)
    S.tests = { files: files.length, groups, totals }
    if (t.code === 124) fail(`the targeted tests ran longer than --tests-timeout ${o.testsTimeoutMin} min and were killed (tests finished so far: ${totals.tests ?? (t.text.match(/^(?:not )?ok \d+/gm) ?? []).length}); the machine may be loaded, rerun with a larger --tests-timeout`, tailOf(t.log, 30))
    if (t.code || totals.tests === undefined || (totals.fail ?? 0) > 0 || (totals.cancelled ?? 0) > 0) fail(`tests failed (exit ${t.code}; tests ${totals.tests ?? '?'}, fail ${totals.fail ?? '?'})`, tailOf(t.log, 60))
    say(`  ${totals.pass}/${totals.tests} tests pass in ${files.length} files`)
    end()

    // 11 file sizes
    begin('sizes')
    const list = deliveredFiles(o.app, S.importedIds).map((p) => ({ path: p, bytes: statSync(join(o.app, p)).size })).sort((a, b) => b.bytes - a.bytes)
    S.sizes = { count: list.length, largest: list.slice(0, 8) }
    const big = list.filter((f) => f.bytes >= FILE_LIMIT_BYTES)
    if (big.length) fail(`${big.length} file(s) at or over ${FILE_LIMIT_BYTES.toLocaleString('en-US')} bytes`, big.map((f) => `${f.bytes} ${f.path}`).join('\n'))
    end()

    // 12 commit (before the report so the report can name the commit)
    begin('commit')
    const dirtyNow = git('status', '--porcelain').stdout.trim()
    if (!dirtyNow) { S.commit = 'nothing to commit (already committed)'; end('skipped') } else {
      const message = S.skippedImport
        ? `Regenerate catalogue, land components and content assets (${o['new-branch']})\n\nFactory-Runs: ${wanted}\nFactory-Cities: ${S.importedIds.join(',')}\n\n${TRAILER}\n`
        : commitMessage({ ids: S.importedIds, countries: [...new Set(S.importRows.filter((r) => r.ok).map((r) => S.runs.find((x) => x.artifact === r.artifact)?.cc ?? r.id))], runs: S.runs, heads: Object.fromEntries(S.runs.map((r) => [r.run, r.headSha])), startup: S.startup, landRegenerated, refused: S.importRows.filter((r) => !r.ok).map((r) => r.id) })
      must(R.run('git-add', 'git', ['add', '-A']), 'git add failed')
      const msgFile = join(tmp, 'commit-message.txt')
      writeFileSync(msgFile, message)
      must(R.run('git-commit', 'git', ['commit', '-q', '-F', msgFile]), 'git commit failed')
      S.commit = git('rev-parse', 'HEAD').stdout.trim()
      end()
    }
    S.headSha = git('rev-parse', 'HEAD').stdout.trim()

    // 13 report (in finally) and 14 push
    begin('report'); end('written at the end')
    if (o.push) {
      begin('push')
      if (git('merge-base', '--is-ancestor', `origin/${o.base}`, 'HEAD').code) fail('HEAD no longer contains the base; not pushing')
      const push = R.run('push', 'git', ['push', 'origin', `HEAD:refs/heads/${o['new-branch']}`])
      if (push.code) fail('push refused (not a fast-forward, or no access); nothing was forced', tailOf(push.log, 20))
      S.pushed = `pushed ${S.headSha.slice(0, 8)} to origin/${o['new-branch']}`
      end()
    }
    S.status = 'PASS'
  } catch (e) {
    if (e instanceof StepFailure) { S.failedStep = e.step; S.failure = e.message; S.failureDetail = e.detail; const last = S.steps[S.steps.length - 1]; if (last && last.result === 'running') { last.result = 'FAILED'; last.time = seconds(Date.now() - last.t0) } } else { S.failedStep = current || 'internal'; S.failure = `unexpected error: ${e.message}`; S.failureDetail = e.stack ?? '' }
  } finally {
    S.headSha = S.headSha || (existsSync(o.app) ? git('rev-parse', 'HEAD').stdout.trim() : '')
    const text = renderReport(S)
    if (o.report) { try { mkdirSync(dirname(o.report), { recursive: true }); writeFileSync(o.report, text); say(`report: ${o.report}`) } catch (e) { say(`could not write the report: ${e.message}`) } } else say(`\n${text}`)
    if (!o['keep-tmp']) rmSync(tmp, { recursive: true, force: true }); else say(`temp kept: ${tmp}`)
    if (!o['keep-dist'] && existsSync(join(o.app, 'dist'))) rmSync(join(o.app, 'dist'), { recursive: true, force: true })
  }
  if (S.status === 'PASS') { say(`PASS: ${S.importedIds.length} cities, HEAD ${S.headSha.slice(0, 8)}${S.startup ? `, startup ${S.startup}` : ''}`); return 0 }
  console.error(`FAIL at step "${S.failedStep}": ${S.failure}`)
  return 1
}

/** Internal: run a command in its own process group and kill the whole group after <ms> (node --test leaves children behind). Exit 124 on timeout. */
function timeboxed(ms, cmd, args) {
  const child = spawn(cmd, args, { stdio: 'inherit', detached: true })
  const timer = setTimeout(() => { try { process.kill(-child.pid, 'SIGKILL') } catch { /* already gone */ } console.error(`killed after ${ms} ms`); process.exit(124) }, ms)
  child.on('exit', (code, signal) => { clearTimeout(timer); process.exit(code ?? (signal ? 1 : 0)) })
  child.on('error', (e) => { clearTimeout(timer); console.error(e.message); process.exit(127) })
}

if (process.argv[2] === '--__timeboxed' && process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const sep2 = process.argv.indexOf('--', 4)
  timeboxed(Number(process.argv[3]), process.argv[sep2 + 1], process.argv.slice(sep2 + 2))
} else if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { process.exitCode = main(process.argv.slice(2)) } catch (e) { console.error(`assemble-release: ${e.message}\n\n${USAGE}`); process.exitCode = 2 }
}
