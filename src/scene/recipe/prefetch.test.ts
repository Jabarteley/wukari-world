import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import { KIT_PROP_IDS } from './contract.ts'
import { sha256 } from './pack.ts'
import type { RecipeCityPack } from './pack.ts'
import { startNeighborRecipePrefetch } from './prefetch.ts'

const digest = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex')
const KIT_BYTES = new TextEncoder().encode('kit!')

async function pack(city: string, heroBytes = new TextEncoder().encode(city)): Promise<RecipeCityPack> {
  const text = '{}\n', textBytes = new TextEncoder().encode(text), kitSha = digest(KIT_BYTES), heroSha = digest(heroBytes)
  const kit = {
    url: `/assets/scene-factory/kits/gulf-guinea-${kitSha}.glb`,
    measurement: {
      version: 1 as const, kind: 'kit' as const, id: 'gulf-guinea', sha256: kitSha, rawBytes: KIT_BYTES.length, brotliBytes: 1,
      triangles: KIT_PROP_IDS.length,
      parts: KIT_PROP_IDS.map(node => ({ node, triangles: 1, bounds: { min: [-1, 0, -1] as [number, number, number], max: [1, 1, 1] as [number, number, number] } })),
      atlas: { width: 1024 as const, height: 1024 as const, mimeType: 'image/webp' as const, sha256: 'a'.repeat(64) },
    },
  }
  const hero = {
    url: `/assets/scene-factory/heroes/${city}-${heroSha}.glb`,
    measurement: {
      version: 1 as const, kind: 'hero' as const, id: city, sha256: heroSha, rawBytes: heroBytes.length, brotliBytes: 1, triangles: 1,
      parts: [{ node: city, triangles: 1, bounds: { min: [-1, 0, -1] as [number, number, number], max: [1, 1, 1] as [number, number, number] } }],
    },
  }
  return { text, metadata: { schema: 'allworld-recipe-runtime', version: 1, city, region: 'gulf-guinea', recipeSha256: await sha256(textBytes), recipeBytes: textBytes.length,
    targetVenueIds: ['market'], assets: { kit, hero }, hostScenery: { market: { triangles: 1, meshes: 1, lights: 0 } } } }
}

function response(bytes: Uint8Array): Response {
  return new Response(new Uint8Array(bytes).buffer, { status: 200, headers: { 'content-length': String(bytes.length) } })
}

test('linked packs and exact immutable assets warm one city per idle turn', async () => {
  let city = 'alpha', changed = () => {}
  const idle: (() => void | Promise<void>)[] = [], loads: string[] = [], reads: { url: string; init?: RequestInit }[] = []
  const packs = new Map(await Promise.all(['beta', 'gamma'].map(async id => [id, await pack(id)] as const)))
  const stop = startNeighborRecipePrefetch({
    currentCity: () => city,
    onCityChange: refresh => { changed = refresh; return () => {} },
    idle: run => { idle.push(run) }, hold: () => false,
    neighbours: at => at === 'alpha' ? [{ to: 'beta' }, { to: 'beta' }, { to: 'future', status: 'coming' }, { to: 'gamma', status: 'open' }] : [],
    loadPack: async id => { loads.push(id); return packs.get(id) },
    fetcher: async (input, init) => {
      const url = String(input); reads.push({ url, init })
      const cityId = url.includes('/heroes/') ? url.split('/').at(-1)!.split('-').slice(0, -1).join('-') : null
      return response(cityId ? new TextEncoder().encode(cityId) : KIT_BYTES)
    },
  })
  assert.equal(idle.length, 1)
  await idle.shift()!()
  assert.deepEqual(loads, ['beta'])
  assert.equal(idle.length, 1)
  await idle.shift()!()
  assert.deepEqual(loads, ['beta', 'gamma'])
  assert.deepEqual(reads.map(row => row.url.includes('/kits/') ? 'kit' : row.url.includes('/beta-') ? 'beta' : 'gamma'), ['kit', 'beta', 'gamma'])
  assert.ok(reads.every(row => row.init?.cache === 'force-cache' && row.init.credentials === 'same-origin' && row.init.mode === 'same-origin' && row.init.redirect === 'error'))
  city = 'elsewhere'; changed(); stop()
})

test('a city change invalidates an in-flight pack queue before any stale asset request', async () => {
  let city = 'alpha', changed = () => {}, release: ((value: unknown) => void) | null = null
  const idle: (() => void | Promise<void>)[] = [], reads: string[] = []
  const beta = await pack('beta'), epsilon = await pack('epsilon')
  const stop = startNeighborRecipePrefetch({
    currentCity: () => city, onCityChange: refresh => { changed = refresh; return () => {} }, idle: run => { idle.push(run) }, hold: () => false,
    neighbours: at => at === 'alpha' ? [{ to: 'beta' }] : at === 'delta' ? [{ to: 'epsilon' }] : [],
    loadPack: id => id === 'beta' ? new Promise(resolve => { release = resolve }) : Promise.resolve(epsilon),
    fetcher: async input => { reads.push(String(input)); return response(String(input).includes('/kits/') ? KIT_BYTES : new TextEncoder().encode('epsilon')) },
  })
  const stale = idle.shift()!()
  city = 'delta'; changed(); release!(beta)
  await stale
  assert.deepEqual([...reads], [])
  assert.equal(idle.length, 1)
  await idle.shift()!()
  assert.deepEqual(reads.map(url => url.includes('/kits/') ? 'kit' : 'epsilon'), ['kit', 'epsilon'])
  stop()
})

test('connection holds are rechecked between cities and normal navigation resumes from a fresh queue', async () => {
  let city = 'alpha', held = false, changed = () => {}
  const idle: (() => void | Promise<void>)[] = [], loads: string[] = []
  const packs = new Map(await Promise.all(['beta', 'gamma', 'epsilon'].map(async id => [id, await pack(id)] as const)))
  const stop = startNeighborRecipePrefetch({
    currentCity: () => city, onCityChange: refresh => { changed = refresh; return () => {} }, idle: run => { idle.push(run) }, hold: () => held,
    neighbours: at => at === 'alpha' ? [{ to: 'beta' }, { to: 'gamma' }] : at === 'delta' ? [{ to: 'epsilon' }] : [],
    loadPack: async id => { loads.push(id); return packs.get(id) },
    fetcher: async input => {
      const url = String(input), name = url.includes('/heroes/') ? url.split('/').at(-1)!.split('-')[0]! : 'kit'
      if (name === 'beta') held = true
      return response(name === 'kit' ? KIT_BYTES : new TextEncoder().encode(name))
    },
  })
  await idle.shift()!()
  assert.deepEqual(loads, ['beta'])
  assert.equal(idle.length, 0)
  held = false; city = 'delta'; changed()
  await idle.shift()!()
  assert.deepEqual(loads, ['beta', 'epsilon'])
  stop()
})

test('oversized streams are cancelled and remain retryable on later navigation', async () => {
  let city = 'alpha', changed = () => {}, attempts = 0, cancelled = 0
  const idle: (() => void | Promise<void>)[] = [], beta = await pack('beta')
  const stop = startNeighborRecipePrefetch({
    currentCity: () => city, onCityChange: refresh => { changed = refresh; return () => {} }, idle: run => { idle.push(run) }, hold: () => false,
    neighbours: at => at === 'alpha' ? [{ to: 'beta' }] : [], loadPack: async () => beta,
    fetcher: async input => {
      attempts++
      if (attempts === 1) return new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(KIT_BYTES.length + 1)) }, cancel() { cancelled++ } }))
      return response(String(input).includes('/kits/') ? KIT_BYTES : new TextEncoder().encode('beta'))
    },
  })
  await idle.shift()!()
  assert.deepEqual([attempts, cancelled], [1, 1])
  city = 'delta'; changed(); city = 'alpha'; changed()
  await idle.shift()!()
  assert.equal(attempts, 3)
  stop()
})

test('failed HTTP and declared-length guards abort each speculative request before a retry', async () => {
  let city = 'alpha', changed = () => {}, attempt = 0
  const idle: (() => void | Promise<void>)[] = [], signals: AbortSignal[] = [], beta = await pack('beta')
  const stop = startNeighborRecipePrefetch({
    currentCity: () => city, onCityChange: refresh => { changed = refresh; return () => {} }, idle: run => { idle.push(run) }, hold: () => false,
    neighbours: at => at === 'alpha' ? [{ to: 'beta' }] : [], loadPack: async () => beta,
    fetcher: async (input, init) => {
      attempt++
      signals.push(init!.signal as AbortSignal)
      if (attempt === 1) return new Response(KIT_BYTES, { status: 503 })
      if (attempt === 2) return new Response(KIT_BYTES, { status: 200, headers: { 'content-length': String(KIT_BYTES.length + 1) } })
      return response(String(input).includes('/kits/') ? KIT_BYTES : new TextEncoder().encode('beta'))
    },
  })
  await idle.shift()!()
  assert.equal(signals[0]?.aborted, true)
  city = 'delta'; changed(); city = 'alpha'; changed(); await idle.shift()!()
  assert.equal(signals[1]?.aborted, true)
  city = 'delta'; changed(); city = 'alpha'; changed(); await idle.shift()!()
  assert.equal(attempt, 4)
  assert.ok(signals.every(signal => signal.aborted))
  stop()
})

test('stopping aborts an active request and detaches the city watcher', async () => {
  let detached = 0, started!: () => void
  const began = new Promise<void>(resolve => { started = resolve }), idle: (() => void | Promise<void>)[] = [], beta = await pack('beta')
  const stop = startNeighborRecipePrefetch({
    currentCity: () => 'alpha', onCityChange: () => () => { detached++ }, idle: run => { idle.push(run) }, hold: () => false,
    neighbours: () => [{ to: 'beta' }], loadPack: async () => beta,
    fetcher: async (_input, init) => {
      started()
      return new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }))
    },
  })
  const running = idle.shift()!()
  await began; stop(); await running
  assert.equal(detached, 1)
  assert.equal(idle.length, 0)
})
