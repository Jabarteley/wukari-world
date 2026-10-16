import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { VERSIONS_FILE, readVersions, renderVersions, versionOf } from './versions.ts'
import { ASSET_VERSIONS } from '../../src/arena/asset-versions.generated.ts'
import { FIGHT_ASSETS } from '../../src/arena/fight-3d.ts'

test('a version is the first 10 hex of the sha256', () => {
  assert.equal(versionOf(new TextEncoder().encode('abc')), 'ba7816bf8f')
})
test('the generated file matches the model files', () => {
  assert.equal(readFileSync(VERSIONS_FILE, 'utf8'), renderVersions(readVersions()))
  assert.deepEqual({ ...ASSET_VERSIONS }, readVersions())
})
test('every Fight model URL carries its version', () => {
  const urls = [...FIGHT_ASSETS.fighters, FIGHT_ASSETS.ring]
  for (const url of urls) {
    const [path, query] = url.split('?')
    assert.match(query ?? '', /^v=[0-9a-f]{10}$/, url)
    assert.equal(query, `v=${ASSET_VERSIONS[path as string]}`)
  }
})
