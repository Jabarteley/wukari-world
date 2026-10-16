import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { blenderBinary, fetchPack, licenceExcerpt, licenceTextSays } from './fetch-pack.ts'
import { storedZip, tinyGlb } from './fixtures.test-helper.ts'
import { manifestProblems } from './pack-types.ts'
import type { WantList } from './pack-types.ts'

const CC0_TEXT = 'Title line\n\nThanks to Someone\nLicense: (Creative Commons Zero, CC0)\nhttp://creativecommons.org/publicdomain/zero/1.0/\n'
const quiet = { sleep: async () => {}, now: () => new Date('2026-10-16T12:00:00Z') }

function fakeFetch(files: Record<string, Buffer | string>, seen: string[] = []): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = String(input)
    seen.push(url)
    const body = files[url]
    if (body === undefined) return new Response('missing', { status: 404 })
    return new Response(typeof body === 'string' ? body : new Uint8Array(body))
  }) as typeof fetch
}

async function inTemp<T>(run: (dir: string) => Promise<T>): Promise<T> {
  const dir = mkdtempSync(join(tmpdir(), 'aw-fetch-'))
  try { return await run(dir) } finally { rmSync(dir, { recursive: true, force: true }) }
}

test('licence words: CC0 and each CC BY version are told apart', () => {
  assert.equal(licenceTextSays(CC0_TEXT, 'CC0-1.0'), true)
  assert.equal(licenceTextSays(CC0_TEXT, 'CC-BY-4.0'), false)
  assert.equal(licenceTextSays('https://creativecommons.org/licenses/by/4.0/', 'CC-BY-4.0'), true)
  assert.equal(licenceTextSays('https://creativecommons.org/licenses/by/4.0/', 'CC-BY-3.0'), false)
  assert.equal(licenceTextSays('Creative Commons Attribution-NonCommercial', 'CC-BY-4.0'), false)
})

test('a licence excerpt keeps only the named lines', () => {
  const text = licenceExcerpt(Buffer.from(CC0_TEXT), [[1, 1], [4, 5]]).toString()
  assert.match(text, /^Title line\nLicense: \(Creative Commons Zero, CC0\)\nhttp:\/\/creativecommons\.org\/publicdomain\/zero\/1\.0\//)
  assert.doesNotMatch(text, /Someone/)
  assert.throws(() => licenceExcerpt(Buffer.from(CC0_TEXT), [[4, 40]]), /not in the file/)
})

test('github: files from a pinned commit, the licence checked, everything recorded', () => inTemp(async (outRoot) => {
  const glb = tinyGlb()
  const raw = 'https://raw.githubusercontent.com/Maker/Pack/0123456789abcdef0123456789abcdef01234567/'
  const seen: string[] = []
  const want: WantList = { pack: 'pack', name: 'Pack', kind: 'github', page: 'https://github.com/Maker/Pack', author: 'Maker', licenceId: 'CC0-1.0', repo: 'Maker/Pack', ref: '0123456789abcdef0123456789abcdef01234567', licenceLines: [[1, 1], [4, 5]], want: [{ from: 'Characters/gltf/Hero One.glb', as: 'hero.glb', game: 'fight', kind: 'character' }] }
  const m = await fetchPack(want, { ...quiet, outRoot, fetchFn: fakeFetch({ [`${raw}LICENSE.txt`]: CC0_TEXT, [`${raw}Characters/gltf/Hero%20One.glb`]: glb }, seen) })
  assert.deepEqual(seen, [`${raw}LICENSE.txt`, `${raw}Characters/gltf/Hero%20One.glb`])
  assert.equal(m.fetched, '2026-10-16')
  const hero = m.assets.find((a) => a.path === 'public/assets/packs/pack/hero.glb')!
  assert.equal(hero.licence, 'CC0')
  assert.equal(hero.source, 'https://github.com/Maker/Pack')
  assert.equal(hero.from, 'Characters/gltf/Hero One.glb')
  assert.equal(hero.bytes, glb.length)
  assert.match(hero.sourceSha256!, /^[0-9a-f]{64}$/)
  assert.doesNotMatch(readFileSync(join(outRoot, 'pack', 'LICENSE.txt'), 'utf8'), /Someone/)
  assert.deepEqual(JSON.parse(readFileSync(join(outRoot, 'pack', 'manifest.json'), 'utf8')), m)
  // Unprepared models only lack their final triangle count, which prepare.ts writes.
  assert.deepEqual(manifestProblems(m, 'pack'), [])
}))

test('github: a licence that does not say what the want list claims stops the fetch', () => inTemp(async (outRoot) => {
  const raw = 'https://raw.githubusercontent.com/Maker/Pack/0123456789abcdef0123456789abcdef01234567/'
  const want: WantList = { pack: 'pack', name: 'Pack', kind: 'github', page: 'https://github.com/Maker/Pack', author: 'Maker', licenceId: 'CC0-1.0', repo: 'Maker/Pack', ref: '0123456789abcdef0123456789abcdef01234567', want: [] }
  await assert.rejects(fetchPack(want, { ...quiet, outRoot, fetchFn: fakeFetch({ [`${raw}LICENSE.txt`]: 'All rights reserved.' }) }), /does not state CC0-1\.0; refusing/)
  await assert.rejects(fetchPack({ ...want, ref: 'main' }, { ...quiet, outRoot }), /40-hex commit/)
}))

test('an archive: only the wanted files and the textures they point at are kept', () => inTemp(async (outRoot) => {
  const zip = storedZip({ 'License.txt': CC0_TEXT, 'Models/a.glb': tinyGlb(), 'Models/b.glb': tinyGlb(), 'Previews/a.png': 'png' })
  const want: WantList = { pack: 'kit', name: 'Kit', kind: 'kenney', page: 'https://kenney.example/kit', author: 'Kenney', licenceId: 'CC0-1.0', want: [{ from: 'Models/a.glb', as: 'a.glb', game: 'race', kind: 'prop' }] }
  const m = await fetchPack(want, { ...quiet, outRoot, archive: zip })
  assert.deepEqual(m.assets.map((a) => a.path.split('/').pop()), ['LICENSE.txt', 'a.glb'])
  assert.equal(m.assets[0]!.kind, 'licence')
  await assert.rejects(fetchPack({ ...want, want: [{ from: 'Models/c.glb', as: 'c.glb', game: 'race', kind: 'prop' }] }, { ...quiet, outRoot, archive: zip }), /is not in the archive/)
}))

test('own: each item is built by its Blender script and recorded as ours', () => inTemp(async (outRoot) => {
  const calls: string[][] = []
  const blender = (script: string, out: string, args: string[] = []): Buffer => { calls.push([script, ...args]); const b = tinyGlb(); writeFileSync(out, b); return b }
  const want: WantList = { pack: 'mine', name: 'Mine', kind: 'own', page: 'https://example.org/scripts', author: 'Allworld', licenceId: 'AGPL-3.0-or-later', want: [{ blender: { script: 'ring' }, as: 'ring.glb', game: 'fight', kind: 'prop' }, { blender: { script: 'goal', args: ['--width', '7.32'] }, as: 'goal.glb', game: 'football', kind: 'prop' }] }
  const m = await fetchPack(want, { ...quiet, outRoot, blender })
  assert.deepEqual(calls, [['ring'], ['goal', '--width', '7.32']])
  assert.deepEqual(m.assets.map((a) => [a.licence, a.source, a.made]), [['ours', 'Allworld', 'scripts/assets/blender/ring.py'], ['ours', 'Allworld', 'scripts/assets/blender/goal.py']])
  assert.equal(m.assets.some((a) => a.kind === 'licence'), false)
  await assert.rejects(fetchPack({ ...want, licenceId: 'CC0-1.0' }, { ...quiet, outRoot, blender }), /own packs are always ours/)
}))

test('the Blender binary comes from BLENDER first', () => {
  assert.equal(blenderBinary({ BLENDER: '/opt/blender/blender' }), '/opt/blender/blender')
})
