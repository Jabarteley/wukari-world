import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { lstat, mkdir, mkdtemp, readFile, readdir, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import type { PreparedSceneWorld, SceneWorldPlanOptions } from './world.ts'
import { parseSceneInstallerCli, runSceneInstaller, type SceneInstallerDependencies } from './scenes.ts'

const digest = (value: string | Uint8Array): string => createHash('sha256').update(value).digest('hex')
const WORLD_MANIFEST = 'scripts/scene-factory/generated/world-manifest.json'

interface Fixture { root: string; current: { value: PreparedSceneWorld }; dependencies: SceneInstallerDependencies }

function scenePlan(revision: 'one' | 'two'): PreparedSceneWorld {
  const kit = Buffer.from('installer fixture regional kit')
  const hero = Buffer.from(`installer fixture hero ${revision}`)
  const city = 'fixture-city', region = 'niger-delta'
  const files = new Map<string, Buffer>([
    [`public/assets/scene-factory/kits/${region}-${digest(kit)}.glb`, kit],
    [`public/assets/scene-factory/heroes/${city}-${digest(hero)}.glb`, hero],
    [`scripts/scene-factory/generated/briefs/${city}.json`, Buffer.from(`{"brief":"${revision}"}\n`)],
    [`scripts/scene-factory/generated/recipes/${city}.json`, Buffer.from(`{"recipe":"${revision}"}\n`)],
    [`scripts/scene-factory/generated/manifests/${city}.json`, Buffer.from(`{"cityManifest":"${revision}"}\n`)],
    [`src/scene/recipe/cities/${city}.ts`, Buffer.from(`export default ${JSON.stringify(revision)}\n`)],
    ['src/scene/recipe/registry.generated.ts', Buffer.from(`export const revision = ${JSON.stringify(revision)}\n`)],
  ])
  const outputs = [...files.entries()].sort(([left], [right]) => left.localeCompare(right, 'en')).map(([path, bytes]) => ({ path, sha256: digest(bytes), bytes: bytes.length }))
  const manifest = Buffer.from(`${JSON.stringify({ schema: 'allworld-scene-world-manifest', version: 1, outputs }, null, 2)}\n`)
  files.set(WORLD_MANIFEST, manifest)
  return {
    files: [...files.entries()].sort(([left], [right]) => left.localeCompare(right, 'en')).map(([path, bytes]) => ({ path, bytes })),
    summary: { cities: 1, regions: 1, recipes: 1 }, manifestSha256: digest(manifest),
  }
}

async function fixture(t: test.TestContext, initial: PreparedSceneWorld = scenePlan('one')): Promise<Fixture> {
  const root = await mkdtemp(join(tmpdir(), 'scene-installer-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const current = { value: initial }
  let sequence = 0
  const dependencies: SceneInstallerDependencies = {
    prepare: async (options: SceneWorldPlanOptions) => {
      assert.deepEqual(options, {
        repoRoot: root,
        assetIndexPath: 'scripts/scene-factory/asset-index.json',
        hostSceneryPath: 'scripts/scene-factory/host-scenery.json',
      })
      return current.value
    },
    uniqueId: () => `fixture-${String(++sequence).padStart(8, '0')}`,
  }
  return { root, current, dependencies }
}

function options(fixture: Fixture, command: 'build' | 'check') {
  return { command, repoRoot: fixture.root } as const
}

function planned(plan: PreparedSceneWorld, path: string): Buffer {
  const file = plan.files.find(row => row.path === path)
  assert.ok(file)
  return file.bytes
}

async function installed(root: string, path: string): Promise<Buffer> {
  return readFile(join(root, ...path.split('/')))
}

async function writeInstalled(root: string, path: string, bytes: Uint8Array | string): Promise<void> {
  const target = join(root, ...path.split('/'))
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, bytes)
}

test('first install is atomic within owned paths and check compares read-only bytes', async t => {
  const f = await fixture(t), plan = f.current.value
  const built = await runSceneInstaller(options(f, 'build'), f.dependencies)
  assert.deepEqual(built, {
    command: 'build', planned: plan.files.length, written: plan.files.length, deleted: 0, unchanged: 0,
    manifestSha256: plan.manifestSha256,
  })
  for (const file of plan.files) assert.deepEqual(await installed(f.root, file.path), file.bytes)
  const manifestPath = join(f.root, ...WORLD_MANIFEST.split('/')), cityPath = join(f.root, 'src/scene/recipe/cities/fixture-city.ts')
  const before = await Promise.all([stat(manifestPath), stat(cityPath)])
  const checked = await runSceneInstaller(options(f, 'check'), f.dependencies)
  assert.deepEqual(checked, {
    command: 'check', planned: plan.files.length, written: 0, deleted: 0, unchanged: plan.files.length,
    manifestSha256: plan.manifestSha256,
  })
  const after = await Promise.all([stat(manifestPath), stat(cityPath)])
  assert.deepEqual(after.map(row => row.mtimeMs), before.map(row => row.mtimeMs))
  assert.deepEqual((await readdir(dirname(manifestPath))).filter(name => name.includes('.scene-install-')), [])
})

test('updated install accepts an already-matching partial output and deletes only verified obsolete assets', async t => {
  const first = scenePlan('one'), second = scenePlan('two'), f = await fixture(t, first)
  await runSceneInstaller(options(f, 'build'), f.dependencies)
  const oldHero = first.files.find(file => file.path.includes('/heroes/'))!, newHero = second.files.find(file => file.path.includes('/heroes/'))!
  assert.notEqual(oldHero.path, newHero.path)
  await writeInstalled(f.root, newHero.path, newHero.bytes)
  await writeFile(join(f.root, 'unrelated.keep'), 'preserve')
  f.current.value = second
  const result = await runSceneInstaller(options(f, 'build'), f.dependencies)
  assert.equal(result.deleted, 1)
  assert.ok(result.unchanged >= 2)
  await assert.rejects(lstat(join(f.root, ...oldHero.path.split('/'))), /ENOENT/)
  assert.deepEqual(await installed(f.root, newHero.path), newHero.bytes)
  assert.equal(await readFile(join(f.root, 'unrelated.keep'), 'utf8'), 'preserve')
  await runSceneInstaller(options(f, 'check'), f.dependencies)
})

test('foreign and tampered owned-path files refuse the whole update before mutation', async t => {
  await t.test('foreign file', async t => {
    const first = scenePlan('one'), second = scenePlan('two'), f = await fixture(t, first)
    await runSceneInstaller(options(f, 'build'), f.dependencies)
    const registryPath = 'src/scene/recipe/registry.generated.ts', registryBefore = await installed(f.root, registryPath)
    await writeInstalled(f.root, 'scripts/scene-factory/generated/recipes/foreign.json', '{"foreign":true}\n')
    f.current.value = second
    await assert.rejects(runSceneInstaller(options(f, 'build'), f.dependencies), /refusing foreign scene output before mutation/)
    assert.deepEqual(await installed(f.root, registryPath), registryBefore)
    const newHero = second.files.find(file => file.path.includes('/heroes/'))!
    await assert.rejects(lstat(join(f.root, ...newHero.path.split('/'))), /ENOENT/)
  })
  await t.test('tampered prior output', async t => {
    const first = scenePlan('one'), second = scenePlan('two'), f = await fixture(t, first)
    await runSceneInstaller(options(f, 'build'), f.dependencies)
    const recipePath = 'scripts/scene-factory/generated/recipes/fixture-city.json'
    await writeInstalled(f.root, recipePath, '{"tampered":true}\n')
    const manifestBefore = await installed(f.root, WORLD_MANIFEST)
    f.current.value = second
    await assert.rejects(runSceneInstaller(options(f, 'build'), f.dependencies), /refusing tampered scene output before mutation/)
    assert.deepEqual(await installed(f.root, WORLD_MANIFEST), manifestBefore)
    assert.equal(await installed(f.root, recipePath).then(bytes => bytes.toString('utf8')), '{"tampered":true}\n')
  })
})

test('a symlinked owned ancestor is refused without touching its external target', async t => {
  const f = await fixture(t), outside = await mkdtemp(join(tmpdir(), 'scene-installer-outside-'))
  t.after(() => rm(outside, { recursive: true, force: true }))
  await mkdir(join(f.root, 'public/assets'), { recursive: true })
  await symlink(outside, join(f.root, 'public/assets/scene-factory'))
  await assert.rejects(runSceneInstaller(options(f, 'build'), f.dependencies), /symlink ancestor/)
  assert.deepEqual(await readdir(outside), [])
  await assert.rejects(lstat(join(f.root, ...WORLD_MANIFEST.split('/'))), /ENOENT/)
})

test('check reports a missing planned output and performs no repair', async t => {
  const f = await fixture(t), missing = 'src/scene/recipe/cities/fixture-city.ts'
  await runSceneInstaller(options(f, 'build'), f.dependencies)
  const manifestPath = join(f.root, ...WORLD_MANIFEST.split('/')), before = await stat(manifestPath)
  await rm(join(f.root, ...missing.split('/')))
  await assert.rejects(runSceneInstaller(options(f, 'check'), f.dependencies), /installed scene output is missing or differs/)
  await assert.rejects(lstat(join(f.root, ...missing.split('/'))), /ENOENT/)
  assert.equal((await stat(manifestPath)).mtimeMs, before.mtimeMs)
})

test('plan and prior manifest identities are strict', async t => {
  await t.test('plan manifest output digest mismatch', async t => {
    const broken = scenePlan('one'), recipe = broken.files.find(file => file.path.includes('/recipes/'))!
    const first = recipe.bytes[0]
    assert.ok(first !== undefined)
    recipe.bytes[0] = first ^ 1
    const f = await fixture(t, broken)
    await assert.rejects(runSceneInstaller(options(f, 'build'), f.dependencies), /planned world manifest identity differs/)
    await assert.rejects(lstat(join(f.root, 'src')), /ENOENT/)
  })
  await t.test('installed manifest malformed', async t => {
    const first = scenePlan('one'), f = await fixture(t, first)
    await runSceneInstaller(options(f, 'build'), f.dependencies)
    await writeInstalled(f.root, WORLD_MANIFEST, '{"schema":"wrong"}\n')
    f.current.value = scenePlan('two')
    await assert.rejects(runSceneInstaller(options(f, 'build'), f.dependencies), /installed world manifest schema\/version is unsupported/)
  })
})

test('CLI accepts only build or check with an optional explicit repository root', () => {
  assert.deepEqual(parseSceneInstallerCli(['check', '--repo-root', '/tmp/repo']), { command: 'check', repoRoot: '/tmp/repo' })
  assert.throws(() => parseSceneInstallerCli(['build', '--repo-root']), /usage:/)
  assert.throws(() => parseSceneInstallerCli(['install']), /usage:/)
})
