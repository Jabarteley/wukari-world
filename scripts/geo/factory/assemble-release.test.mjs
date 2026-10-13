import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPlan, commitMessage, expandTests, formatPlan, parseArgs, parseBudgetLines, parseImporterOutput, parseRuns, parseTapTotals, TRAILER } from './assemble-release.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const script = join(here, 'assemble-release.mjs')
const base = ['--app', '/nonexistent/app', '--base', 'origin/claude/factory-20261012', '--new-branch', 'claude/release-k-20261013', '--runs', 'fr=38400000001,fi=38400000002']

test('--runs: pairs of country code and run id, duplicates and junk refused', () => {
  assert.deepEqual(parseRuns('fr=38400000001, fi=38400000002,fr=38400000003'), [{ cc: 'fr', run: '38400000001' }, { cc: 'fi', run: '38400000002' }, { cc: 'fr', run: '38400000003' }])
  for (const bad of ['', 'fr', 'FR=38400000001', 'fra=38400000001', 'fr=12', 'fr=abc123456', 'fr=38400000001,fr=38400000001']) assert.throws(() => parseRuns(bad), undefined, bad)
})

test('arguments: required flags, origin/ prefix stripped, new branch must not be main or the base', () => {
  const o = parseArgs([...base, '--main-merge', '--push', '--report', '/tmp/r.md', '--heap', '8192'])
  assert.equal(o.base, 'claude/factory-20261012')
  assert.equal(o['main-merge'], true)
  assert.equal(o.push, true)
  assert.equal(o.heap, 8192)
  assert.equal(o.repo, 'kromate/joinallworld')
  assert.deepEqual(o.runList.map((r) => r.cc), ['fr', 'fi'])
  for (const need of ['--app', '--base', '--new-branch', '--runs']) {
    const i = base.indexOf(need)
    assert.throws(() => parseArgs(base.filter((_, k) => k !== i && k !== i + 1)), new RegExp(need.slice(2)))
  }
  assert.throws(() => parseArgs([...base.slice(0, 5), 'main', ...base.slice(6)]), /new-branch/)
  assert.throws(() => parseArgs([...base.slice(0, 5), 'claude/factory-20261012', ...base.slice(6)]), /new-branch/)
  assert.throws(() => parseArgs([...base, '--bogus']), /unknown argument/)
  assert.throws(() => parseArgs([...base, '--report']), /needs a value/)
  assert.throws(() => parseArgs([...base, '--heap', '12']), /heap/)
  assert.throws(() => parseArgs([...base, '--report', '/nonexistent/app/report.md']), /outside the app/)
  assert.throws(() => parseArgs([...base, '--cities', 'Bad_Id']), /bad city id/)
})

test('plan: fixed order, merge and push steps only when asked', () => {
  const ids = (o) => buildPlan(parseArgs([...base, ...o])).map((s) => s.id)
  assert.deepEqual(ids([]), ['preflight', 'fetch', 'download', 'import', 'catalogue', 'land', 'build', 'typecheck', 'size', 'tests', 'sizes', 'commit', 'report', 'cleanup'])
  assert.deepEqual(ids(['--push']).slice(-2), ['push', 'cleanup'])
  const withMerge = buildPlan(parseArgs([...base, '--main-merge']))
  assert.ok(withMerge[1].commands.some((c) => c.includes('git merge --no-edit origin/main')))
  assert.ok(!buildPlan(parseArgs(base))[1].commands.some((c) => c.includes('merge')))
  const text = formatPlan(parseArgs(base), buildPlan(parseArgs(base)))
  assert.match(text, /^DRY RUN/)
  assert.match(text, /gh run download 38400000001 -R kromate\/joinallworld/)
  assert.match(text, /--max-old-space-size=6144/)
  assert.match(text, /npm run size:download/)
})

test('importer output rows are parsed', () => {
  const rows = parseImporterOutput([
    'app:        /x', '',
    'IMPORTED paris  [city-factory-fr-1targets-abc1234]  41 module files, receipts in world/playable-europe-rollout, 12 manifest hashes checked, machine status passed',
    'REFUSED  helsinki  [city-factory-fi-1targets-def5678]  already present in the app (city); pass --replace to overwrite', '', '1 imported, 1 refused'].join('\n'))
  assert.equal(rows.length, 2)
  assert.deepEqual(rows.map((r) => [r.id, r.ok, r.artifact]), [['paris', true, 'city-factory-fr-1targets-abc1234'], ['helsinki', false, 'city-factory-fi-1targets-def5678']])
  assert.match(rows[1].why, /already present/)
})

test('TAP totals take the last summary; budget lines keep status and measure', () => {
  assert.deepEqual(parseTapTotals('# tests 3\n# pass 3\n...\n# tests 4571\n# suites 10\n# pass 4570\n# fail 1\n# cancelled 0\n# skipped 2\n# todo 0\n'), { tests: 4571, suites: 10, pass: 4570, fail: 1, cancelled: 0, skipped: 2, todo: 0 })
  const b = parseBudgetLines([
    'Download budgets (src/budgets.ts)',
    'ok   STARTUP_RAW             610119  budget <= 615000  largest over 229 cities (lagos)',
    'OVER STARTUP_GZIP            223500  budget <= 223000  largest over 229 cities (lagos)',
    'n/a  BASE_BODY_BROTLI             -  budget <= 1  no file matches /x/'].join('\n'))
  assert.deepEqual(b.map((r) => [r.status, r.budget, r.measured]), [['ok', 'STARTUP_RAW', 610119], ['OVER', 'STARTUP_GZIP', 223500], ['n/a', 'BASE_BODY_BROTLI', null]])
})

test('commit message: subject, run trailers and the Claude trailer last', () => {
  const m = commitMessage({ ids: ['paris', 'helsinki'], countries: ['fr', 'fi'], runs: [{ cc: 'fr', run: '38400000001' }, { cc: 'fi', run: '38400000002' }], heads: { 38400000001: 'a'.repeat(40), 38400000002: 'b'.repeat(40) }, startup: '1 / 2 / 3', landRegenerated: true, refused: [] })
  assert.match(m, /^Release: import 2 factory-passed cities in 2 countries \(paris helsinki\)\n/)
  assert.match(m, /Factory-Runs: fi=38400000002,fr=38400000001\n/)
  assert.match(m, /Factory-Cities: paris,helsinki\n/)
  assert.match(m, /Land components regenerated\./)
  assert.ok(m.trimEnd().endsWith(TRAILER))
})

test('expandTests resolves the named groups, adds per-city tests and refuses a group with no file', () => {
  const app = mkdtempSync(join(tmpdir(), 'assemble-test-app-'))
  try {
    const put = (rel) => { mkdirSync(dirname(join(app, rel)), { recursive: true }); writeFileSync(join(app, rel), '') }
    for (const f of ['src/game/cities/allCities.test.ts', 'src/game/cities/generatedLinks.test.ts', 'src/game/cities/paris/map.test.ts', 'src/game/cities/paris/journey.test.ts', 'src/game/cities/other/map.test.ts',
      'src/map3d/geo/atlas.test.ts', 'src/app/features/travel/travelModel.test.ts', 'server/release.test.ts', 'src/game/relief.test.ts', 'src/game/stuck.test.ts', 'src/app/features/relief/reliefComponents.test.ts', 'node_modules/x/stuck.test.ts']) put(f)
    const { files, groups } = expandTests(app, ['paris'])
    assert.ok(files.includes('src/game/cities/paris/map.test.ts') && files.includes('src/game/cities/paris/journey.test.ts'))
    assert.ok(!files.includes('src/game/cities/other/map.test.ts'), 'tests of cities that were not imported are not run')
    assert.ok(!files.some((f) => f.startsWith('node_modules')))
    assert.ok(files.includes('src/game/stuck.test.ts') && files.includes('src/app/features/relief/reliefComponents.test.ts') && files.includes('server/release.test.ts'))
    assert.equal(new Set(files).size, files.length)
    assert.equal(groups.length, 6)
    rmSync(join(app, 'server/release.test.ts'))
    assert.throws(() => expandTests(app), /server\/release\.test\.ts/)
  } finally { rmSync(app, { recursive: true, force: true }) }
})

const run = (args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' })

test('--dry-run with fake arguments prints the plan, exits 0 and creates nothing', () => {
  const before = readdirSync(existsSync('/private/tmp') ? '/private/tmp' : tmpdir()).filter((n) => n.startsWith('aw-assemble-')).length
  const r = run([...base, '--main-merge', '--push', '--report', '/nonexistent/out/report.md', '--dry-run'])
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /DRY RUN/)
  assert.match(r.stdout, /git push origin HEAD:refs\/heads\/claude\/release-k-20261013/)
  assert.match(r.stdout, /app exists: no/)
  assert.ok(!existsSync('/nonexistent'))
  const after = readdirSync(existsSync('/private/tmp') ? '/private/tmp' : tmpdir()).filter((n) => n.startsWith('aw-assemble-')).length
  assert.equal(after, before, 'no temp dir was left behind')
})

test('bad usage exits 2 with the usage text; --help exits 0', () => {
  const bad = run(['--app', '/x', '--base', 'b'])
  assert.equal(bad.status, 2)
  assert.match(bad.stderr, /--new-branch is required/)
  assert.match(bad.stderr, /usage: assemble-release/)
  assert.equal(run(['--help']).status, 0)
})

test('a real run against a path that is not an app stops at preflight with a clear message and changes nothing', () => {
  const dir = mkdtempSync(join(tmpdir(), 'assemble-test-empty-'))
  try {
    const r = run(['--app', dir, '--base', 'main', '--new-branch', 'claude/x', '--runs', 'fr=38400000001'])
    assert.equal(r.status, 1)
    assert.match(r.stderr, /FAIL at step "preflight": .* is not an app checkout/)
    assert.deepEqual(readdirSync(dir), [])
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('the internal time box kills the whole process group and exits 124; a quick command passes its exit code through', () => {
  const slow = spawnSync(process.execPath, [script, '--__timeboxed', '300', '--', '/bin/sh', '-c', 'sleep 30 & sleep 30'], { encoding: 'utf8' })
  assert.equal(slow.status, 124)
  const quick = spawnSync(process.execPath, [script, '--__timeboxed', '5000', '--', process.execPath, '-e', 'process.exit(3)'], { encoding: 'utf8' })
  assert.equal(quick.status, 3)
})
