import test from 'node:test'
import assert from 'node:assert/strict'
import { allCityLinks, loadAllCityRules, unloadCityNetworkForTest } from './registry.ts'

test('with the network in, loading city modules keeps the link list, and it equals a fresh build', async () => {
  const before = allCityLinks()
  await loadAllCityRules()
  const kept = allCityLinks()
  assert.equal(kept, before, 'a module that loads does not drop the cached links')
  // Dropping and restoring the network clears the cache: the next call builds the list again with every module loaded.
  unloadCityNetworkForTest().dispose()
  const fresh = allCityLinks()
  assert.notEqual(fresh, kept)
  assert.deepEqual(fresh, kept)
})
