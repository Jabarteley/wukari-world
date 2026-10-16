// The cartridge checker, against small in-memory builds and file sets.
import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { checkCartridges, checkDir, checkRules, cartridgeFiles, diskSource, measureCartridge } from './cartridge-check.ts'
import { fileURLToPath } from 'node:url'
import type { Source } from './cartridge-check.ts'
// The sample cartridge's own tests (determinism, exact replay, bad input) run with these: `npm test` has no glob for examples/.
import '../examples/cartridge-sample/rules.test.ts'
import { CARTRIDGES } from '../src/arena/cartridges.ts'
import { CARTRIDGE_CONTRACT, defineCartridge } from '../src/arena/cartridge.ts'
import type { Cartridge, CartridgeAsset } from '../src/arena/cartridge.ts'
import type { Dist } from './download-budget.ts'

const enc = (text: string): Uint8Array => new TextEncoder().encode(text)
const noise = (n: number): Uint8Array => new Uint8Array(randomBytes(n))
const base = CARTRIDGES[0]!
const entry = (assets: CartridgeAsset[] = [], cap?: number): Cartridge => defineCartridge({ ...base, contract: CARTRIDGE_CONTRACT, manifest: { entry: 'FightGame', assets, ...(cap ? { cap } : {}) } })
const source = (files: Record<string, Uint8Array> = {}, notice = ''): Source => ({ root: '.', read: (p) => files[p] ?? null, notice })
// A build: the page, its entry chunk, the cartridge chunk importing a shared chunk (already in the first download) and a lazy one of its own.
const build = (extra: Record<string, Uint8Array> = {}): Dist => new Map<string, Uint8Array>(Object.entries({
  'index.html': enc('<script type="module" src="/assets/app-aaaaaaa.js"></script>'),
  'assets/app-aaaaaaa.js': enc('import"./engine-bbbbbbb.js";'),
  'assets/engine-bbbbbbb.js': noise(5000),
  'assets/FightGame-ccccccc.js': enc('import{x}from"./engine-bbbbbbb.js";import"./fight-ddddddd.js";'),
  'assets/FightGame-ccccccc.css': enc('.a{color:red}'),
  'assets/fight-ddddddd.js': noise(3000),
  'assets/other-eeeeeee.js': noise(9000),
  ...extra,
}))

test('the real manifests are valid and every listed asset is in the repository', () => {
  assert.deepEqual(checkCartridges(CARTRIDGES, diskSource(fileURLToPath(new URL('..', import.meta.url))), null).problems, [])
})

test('the chunks a screen loads later (a 3D view, three.js) count against the cap with what they import', () => {
  const dist = build({ 'assets/view3d-1111111.js': enc('import"./three-2222222.js";'), 'assets/three-2222222.js': noise(4000) })
  const files = cartridgeFiles(dist, 'FightGame', ['view3d'])!.sort()
  assert.ok(files.includes('assets/view3d-1111111.js') && files.includes('assets/three-2222222.js') && !files.some((f) => f.startsWith('assets/engine-')))
  assert.equal(cartridgeFiles(dist, 'FightGame', ['missing']), null, 'a lazy chunk that is not there is a stale manifest')
})

test('a cartridge counts its own lazy chunks and stylesheet, not the first download and not other chunks', () => {
  const files = cartridgeFiles(build(), 'FightGame')!.sort()
  assert.deepEqual(files, ['assets/FightGame-ccccccc.css', 'assets/FightGame-ccccccc.js', 'assets/fight-ddddddd.js'])
  assert.equal(cartridgeFiles(build(), 'Nothing'), null)
  assert.equal(cartridgeFiles(build({ 'assets/FightGame-fffffff.js': enc('x') }), 'FightGame'), null, 'two entry chunks are ambiguous')
})

test('a cartridge over its cap is a problem; under it is ok', () => {
  const m = measureCartridge(build(), source(), entry())!
  assert.ok(m.total > 3000 && m.total < 4000, String(m.total))
  assert.deepEqual(checkCartridges([entry([], m.total)], source(), build()).problems, [])
  const over = checkCartridges([entry([], m.total - 1)], source(), build())
  assert.match(over.problems.join(), /over its cap/); assert.match(over.lines[0]!, /^OVER/)
  assert.match(checkCartridges([entry()], source(), new Map(build()) as Dist).lines[0]!, /^ok/)
})

test('assets count toward the cap and must exist', () => {
  const asset: CartridgeAsset = { path: 'public/assets/arena/ring.glb', licence: 'CC0', source: 'https://example.org/ring' }
  assert.match(checkCartridges([entry([asset])], source(), null).problems.join(), /does not exist/)
  const files = { 'public/assets/arena/ring.glb': noise(20000) }
  assert.deepEqual(checkCartridges([entry([asset])], source(files), build()).problems, [])
  const m = measureCartridge(build(), source(files), entry([asset]))!
  assert.ok(m.assetBrotli > 19000)
  assert.match(checkCartridges([entry([asset], 10000)], source(files), build()).problems.join(), /over its cap/)
})

test('a CC BY asset needs its credit line in NOTICE.md; a missing licence or a stale entry chunk is reported', () => {
  const credit = 'Ring by Ada, CC BY 4.0'
  const asset: CartridgeAsset = { path: 'public/a.glb', licence: 'CC-BY', source: 'https://example.org/a', attribution: credit }
  const files = { 'public/a.glb': noise(100) }
  assert.match(checkCartridges([entry([asset])], source(files, 'nothing here'), null).problems.join(), /NOTICE\.md/)
  assert.deepEqual(checkCartridges([entry([asset])], source(files, `- ${credit}`), null).problems, [])
  assert.match(checkCartridges([entry([{ ...asset, licence: undefined as never }])], source(files), null).problems.join(), /licence/)
  assert.match(checkCartridges([entry()], source(), new Map([['index.html', enc('')]])).problems.join(), /is stale/)
  assert.match(checkCartridges([entry(), entry()], source(), null).problems.join(), /listed twice/)
})

// ---- the sample cartridge and folders that are not registered (--dir) ----------------------------------------------------------------
const repo = fileURLToPath(new URL('..', import.meta.url))
const SAMPLE = 'examples/cartridge-sample'
const at = (path: string): string => new URL(`../${path}`, import.meta.url).href

test('the sample cartridge passes the checker and is not registered in the game', async () => {
  const { problems } = await checkDir(repo, SAMPLE)
  assert.deepEqual(problems, [])
  assert.ok(!CARTRIDGES.some((c) => c.id === 'tug'), 'the sample must stay out of the registry')
})

/** A folder in the temp directory with a cartridge.ts that imports the sample's rules, with `entry` as its manifest. */
function submission(entry: string, rules = `export { default } from '${at(SAMPLE + '/rules.ts')}'`): string {
  const dir = mkdtempSync(join(tmpdir(), 'cartridge-'))
  mkdirSync(join(dir, 'assets'))
  writeFileSync(join(dir, 'cartridge.ts'), `import { CARTRIDGE_CONTRACT, defineCartridge } from '${at('src/arena/cartridge.ts')}'\nexport const cartridge = defineCartridge({ contract: CARTRIDGE_CONTRACT, id: 'tug', name: 'Tug', blurb: 'x', rev: 1, venues: ['arcade'], modes: { alone: 'live', friends: 'live', community: 'planned', matchmaking: 'planned', agents: 'planned' }, reads: ['identity'], writes: ['result'], manifest: { entry: 'TugGame', assets: [], ...${entry} } })\n`)
  writeFileSync(join(dir, 'rules.ts'), rules)
  return dir
}

test('a broken manifest in a submitted folder fails the checker, from the command line too', async () => {
  const bad = submission(`{ assets: [{ path: 'nowhere/ghost.glb', licence: 'GPL', source: '' }, { path: '/etc/passwd', licence: 'CC0', source: 'x' }], cap: 99_000_000 }`)
  try {
    const found = (await checkDir(repo, bad)).problems.join('\n')
    assert.match(found, /does not exist/); assert.match(found, /no valid licence/); assert.match(found, /has no source/); assert.match(found, /inside the repository/); assert.match(found, /manifest\.cap/)
    const run = spawnSync(process.execPath, ['--experimental-strip-types', join(repo, 'scripts/cartridge-check.ts'), '--dir', bad], { encoding: 'utf8' })
    assert.equal(run.status, 1); assert.match(run.stderr, /PROBLEM/)
    assert.equal(spawnSync(process.execPath, ['--experimental-strip-types', join(repo, 'scripts/cartridge-check.ts'), '--dir', SAMPLE], { cwd: repo, encoding: 'utf8' }).status, 0)
  } finally { rmSync(bad, { recursive: true, force: true }) }
})

test('a folder missing its rules, or a CC BY asset without its credit, is refused', async () => {
  const dir = submission('{}')
  try {
    rmSync(join(dir, 'rules.ts'))
    assert.match((await checkDir(repo, dir)).problems.join(), /missing rules\.ts/)
    const credited = submission(`{ assets: [{ path: '${SAMPLE}/assets/rope.svg', licence: 'CC-BY', source: 'https://example.org/a', attribution: 'Rope by Ada, CC BY 4.0' }] }`)
    try {
      assert.match((await checkDir(repo, credited)).problems.join(), /NOTICE\.md/)
      writeFileSync(join(credited, 'NOTICE.md'), '- Rope by Ada, CC BY 4.0\n')
      assert.deepEqual((await checkDir(repo, credited)).problems, [])
    } finally { rmSync(credited, { recursive: true, force: true }) }
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('rules that are not deterministic, do not refuse junk or do not match the entry are reported', async () => {
  const sample = (await import(at(SAMPLE + '/rules.ts'))).default
  const c = (await import(at(SAMPLE + '/cartridge.ts'))).cartridge
  assert.deepEqual(checkRules(c, sample), [])
  assert.match(checkRules(c, { ...sample, bot: () => (Math.random() < 0.5 ? 1 : 0) }).join(), /not deterministic/)
  assert.match(checkRules(c, { ...sample, parseInput: (raw: unknown) => raw }).join(), /accepted junk/)
  assert.match(checkRules(c, { ...sample, id: 'other' }).join(), /rules\.id/)
  assert.match(checkRules(c, { ...sample, hz: 60 }).join(), /hz/)
  assert.match(checkRules(c, { ...sample, snapshot: () => 'x'.repeat(500) }).join(), /over about 300 bytes/)
})
