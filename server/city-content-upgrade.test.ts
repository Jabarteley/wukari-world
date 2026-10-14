import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { createLife } from '../src/life.ts'
import { installCityModuleLoader, loadCityContent, cachedCityContent } from '../src/game/cities/registry.ts'
import { loadHostCityModule } from '../src/game/cities/host-loaders.ts'
import { prepareSessionCities } from './city-content.ts'
import { createOnce } from './routes/once.ts'
import type { SessionRecord } from './types.ts'
import type { LifeState } from '../src/types/life.ts'
import type { ActionRequest } from '../src/types/protocol.ts'

test('old multi-city saves and receipts survive authenticated filesystem loading and a failed first read', async () => {
  const fixture = JSON.parse(await readFile(new URL('./testing/fixtures/city-content-upgrade.json', import.meta.url), 'utf8')) as {
    now: number; session: SessionRecord; expected: Record<string, LifeState>; request: ActionRequest
  }
  const before = JSON.stringify(fixture.session)
  const reads = new Map<string, number>()
  let unavailable = true
  installCityModuleLoader(id => loadHostCityModule(id, async path => {
    if (unavailable) throw new Error('unavailable')
    reads.set(path, (reads.get(path) ?? 0) + 1)
    return readFile(new URL(`../dist${path}`, import.meta.url))
  }))
  await assert.rejects(prepareSessionCities(fixture.session), { status: 503, code: 'city_content_unavailable' })
  assert.equal(JSON.stringify(fixture.session), before, 'failure changes no saved record or receipt')
  assert.equal(cachedCityContent('lagos'), null)
  unavailable = false
  await Promise.all([prepareSessionCities(fixture.session), loadCityContent('lagos'), loadCityContent('lagos')])
  assert.equal(reads.size, 2, 'only the two referenced cities are loaded')
  assert.ok([...reads.values()].every(count => count === 1), 'concurrent callers share each asset read')
  for (const [cityId, entry] of Object.entries(fixture.session.cities)) {
    assert.ok(entry)
    const previous = fixture.expected[cityId]
    assert.ok(previous)
    const expected = {
      ...previous,
      missions: { ...previous.missions, pending: [], grants: [], pendingSets: [] },
      achievements: { version: 1, trackingSince: fixture.now, progress: {}, earned: {}, pinned: [], displayed: null },
      episodes: { version: 1, trackingSince: fixture.now, runs: {}, mementos: {} },
      projects: { version: 2, trackingSince: fixture.now, proofs: {}, mementos: {} },
    }
    const rebuilt = createLife(entry.state, { cityId, now: fixture.now })
    assert.deepEqual(rebuilt, expected)
    assert.deepEqual(createLife(rebuilt, { cityId, now: fixture.now }), expected)
  }
  const receipts = createOnce({ now: () => fixture.now, windowMs: 86400000 })
  for (let attempt = 0; attempt < 2; attempt++) {
    assert.deepEqual(receipts.action(fixture.session, fixture.request, () => {
      throw new Error('A stored action must never run again')
    }), { ok: true, code: 'arrived', duplicate: true })
  }
  assert.equal(JSON.stringify(fixture.session), before, 'reconstruction leaves original records and receipts intact')
  assert.equal(cachedCityContent('abuja'), null)
})
