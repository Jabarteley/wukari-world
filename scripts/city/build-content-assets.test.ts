import assert from 'node:assert/strict'
import { readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { loadCityContentAsset } from '../../src/game/cities/content-asset.ts'
import { GENERATED_CITY_LOADERS } from '../../src/game/cities/loaders.generated.ts'
import { buildCityContentAssets, canonicalCityJson } from './build-content-assets.ts'

test('city JSON preserves authored object and array order and refuses values JSON would lose', () => {
  assert.equal(canonicalCityJson({ z: [2, { b: true, a: 'x' }], a: 1 }), '{"z":[2,{"b":true,"a":"x"}],"a":1}')
  for (const value of [{ missing: undefined }, { function: () => 1 }, { number: Infinity }, new Date(0)]) {
    assert.throws(() => canonicalCityJson(value), /JSON|finite/i)
  }
})

test('generator emits deterministic authenticated assets equal to every authored module', async (t) => {
  const folder = join(tmpdir(), `allworld-city-content-${process.pid}-${Date.now()}`)
  t.after(() => rm(folder, { recursive: true, force: true }))
  const first = await buildCityContentAssets({ outDir: join(folder, 'first'), manifestPath: join(folder, 'manifest.json'), typescriptPath: join(folder, 'manifest.ts') })
  const second = await buildCityContentAssets({ outDir: join(folder, 'second') })
  assert.deepEqual(first.rows, second.rows)
  assert.equal(first.rows.length, GENERATED_CITY_LOADERS.length)
  const source = new Map<string, Awaited<ReturnType<(typeof GENERATED_CITY_LOADERS)[number]>>>()
  for (const load of GENERATED_CITY_LOADERS) { const module = await load(); source.set(module.id, module) }
  for (const row of first.rows) {
    const bytes = new Uint8Array(await readFile(join(folder, 'first', row.path.split('/').at(-1)!)))
    const loaded = await loadCityContentAsset(row, async () => bytes)
    const module = source.get(row.id)
    assert.ok(module)
    assert.deepEqual(loaded.rules, module.rules, `${row.id} rules`)
    assert.deepEqual(loaded.content, await module.loadContent(), `${row.id} content`)
    assert.equal(canonicalCityJson(loaded), new TextDecoder().decode(bytes), `${row.id} canonical bytes`)
  }
  const manifest = JSON.parse(await readFile(join(folder, 'manifest.json'), 'utf8')) as { version: number; cities: unknown[] }
  assert.equal(manifest.version, 1)
  assert.deepEqual(manifest.cities, first.rows)
  assert.match(await readFile(join(folder, 'manifest.ts'), 'utf8'), /CITY_CONTENT_ASSETS/)
})
