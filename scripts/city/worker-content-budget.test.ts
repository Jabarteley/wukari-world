import assert from 'node:assert/strict'
import { mkdtemp, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import test from 'node:test'
import { CITY_CONTENT_ASSETS } from '../../src/game/cities/content-assets.generated.ts'
import { GENERATED_CITY_CATALOGUE_ROWS } from '../../src/game/cities/catalogue.generated.ts'

const require = createRequire(import.meta.url)
const { build } = require('esbuild') as typeof import('esbuild')

test('the Worker contains city references under 500 bytes each and no city payload or packed dictionary', async t => {
  const folder = await mkdtemp(join(tmpdir(), 'city-worker-budget-'))
  t.after(() => rm(folder, { recursive: true, force: true }))
  const outfile = join(folder, 'worker.mjs')
  const built = await build({
    entryPoints: ['deploy/cloudflare-worker.js'], outfile, bundle: true, minifyWhitespace: true, minifySyntax: true,
    format: 'esm', platform: 'neutral', external: ['cloudflare:workers'], metafile: true,
  })
  const cityIds = new Set(CITY_CONTENT_ASSETS.map(row => row.id))
  const forbidden = Object.keys(built.metafile.inputs).filter(path => {
    const city = /\/cities\/([^/]+)\//.exec(path)?.[1]
    return (city !== undefined && cityIds.has(city)) || path.endsWith('/words/data/dictionary.ts')
  })
  assert.deepEqual(forbidden, [], 'authored city directories and packed dictionary must stay outside the Worker')
  const bytes = (await stat(outfile)).size
  assert.ok(bytes < 4_000_000, `Worker is ${bytes} bytes (the release guard's limit, scripts/guard-joinallworld-package.mjs)`)
  assert.equal(CITY_CONTENT_ASSETS.length, GENERATED_CITY_CATALOGUE_ROWS.length)
  const costs = CITY_CONTENT_ASSETS.map(row => {
    const catalogue = GENERATED_CITY_CATALOGUE_ROWS.find(city => city[0] === row.id)
    assert.ok(catalogue)
    const bytes = Buffer.byteLength(JSON.stringify(row)) + Buffer.byteLength(JSON.stringify(catalogue)) + 2
    assert.ok(bytes < 500, `${row.id} adds ${bytes} compiled catalogue/manifest bytes`)
    return bytes
  })
  console.log(`Worker: ${bytes} bytes; ${costs.length} cities; maximum compiled city reference: ${Math.max(...costs)} bytes; mean: ${Math.ceil(costs.reduce((sum, bytes) => sum + bytes, 0) / costs.length)} bytes`)
})
