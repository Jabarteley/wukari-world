// The location badge's check (docs/FEED.md): the device finds its city (and the local government it is inside), and the position never
// leaves it: no request is made, nothing is logged, and the answer is a city id and a name, and a local government's id and name, only.
import assert from 'node:assert/strict'
import test from 'node:test'
import { cityCatalogueEntry, loadCityNetwork } from '../../../game/cities/registry.ts'
import type { CityPackApi } from '../world/cityPack.ts'
import { IMPRECISE, NOT_NEAR, locateCity } from './locateCity.ts'

const at = (latitude: number, longitude: number, accuracy = 30): Pick<Geolocation, 'getCurrentPosition'> => ({ getCurrentPosition: (ok: PositionCallback) => ok({ coords: { latitude, longitude, accuracy } } as GeolocationPosition) })
const packs = (inside: string | null, has = true, sure = true): () => Promise<CityPackApi> => async () => ({ has: () => has, load: async (id) => ({ name: id }), resolve: (pack) => (pack.name === inside ? { id: 'nassarawa' as never, name: 'Nassarawa', sure } : null) })

function watched(): { calls: unknown[]; restore: () => void } {
  const calls: unknown[] = [], fetch0 = globalThis.fetch, log0 = console.log, warn0 = console.warn
  globalThis.fetch = (async (...args: unknown[]) => { calls.push(args); throw new Error('no requests') }) as typeof fetch
  console.log = (...args: unknown[]) => { calls.push(args) }; console.warn = console.log
  return { calls, restore: () => { globalThis.fetch = fetch0; console.log = log0; console.warn = warn0 } }
}

test('inside a city\'s boundary: that city and the local government it is in, and nothing else in the answer; no request, no log', async () => {
  await loadCityNetwork()
  const w = watched()
  try {
    const r = await locateCity({ geolocation: at(12.0, 8.52), packs: packs('kano') })
    assert.deepEqual(r, { kind: 'found', city: 'kano', name: 'Kano', lga: 'nassarawa', lgaName: 'Nassarawa' })
    assert.equal(/12|8\.52|lat|lon|accuracy/.test(JSON.stringify(r)), false, 'no position in the answer')
    assert.deepEqual(w.calls, [])
  } finally { w.restore() }
})

test('only the nearest local government (not surely inside one): the city alone', async () => {
  await loadCityNetwork()
  assert.deepEqual(await locateCity({ geolocation: at(12.0, 8.52), packs: packs('kano', true, false) }), { kind: 'found', city: 'kano', name: 'Kano' })
})

test('a city without boundaries counts within 25 km of its centre; far away there is no badge', async () => {
  const kaduna = cityCatalogueEntry('kaduna')!
  assert.equal((await locateCity({ geolocation: at(kaduna.lat + 0.1, kaduna.lon), packs: packs(null, false) })).kind, 'found')
  assert.deepEqual(await locateCity({ geolocation: at(kaduna.lat + 1, kaduna.lon), packs: packs(null, false) }), { kind: 'none', line: NOT_NEAR })
})

test('an imprecise fix, a refusal, or an insecure page gives nothing', async () => {
  assert.deepEqual(await locateCity({ geolocation: at(12.0, 8.52, 20000), packs: packs('kano') }), { kind: 'none', line: IMPRECISE })
  const denied = { getCurrentPosition: (_ok: PositionCallback, no?: PositionErrorCallback | null) => no?.({ code: 1 } as GeolocationPositionError) }
  assert.match((await locateCity({ geolocation: denied, packs: packs('kano') })).kind, /none/)
  assert.equal((await locateCity({ geolocation: at(12, 8.5), secure: false })).kind, 'none')
})
