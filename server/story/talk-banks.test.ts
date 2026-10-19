import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import { compileLocalTalkBank } from '../../scripts/talk-factory/local.ts'
import type { TalkBankV1 } from '../../scripts/talk-factory/bank.ts'
import { createTalkBankReader } from './talk-banks.ts'

const bytesOf = (value: unknown): Uint8Array => new TextEncoder().encode(JSON.stringify(value))
const hash = (value: Uint8Array): string => createHash('sha256').update(value).digest('hex')

function cityFiles(city: TalkBankV1['city'] = 'kano', change?: (pack: { schema: string; version: number; city: string; banks: { npc: string; venue: string; bank: TalkBankV1; evidence: ReturnType<typeof evidenceOf> }[] }) => void) {
  const evidence = evidenceOf(city)
  const bank = compileLocalTalkBank({ ...evidence, voice: 'plain', lang: 'en', phrases: [] })
  const pack = { schema: 'allworld-city-talk', version: 1, city, banks: [{ npc: evidence.npc.id, venue: evidence.venue.id, bank, evidence }] }
  change?.(pack)
  const bytes = bytesOf(pack), sha256 = hash(bytes), path = `/assets/talk-banks/${city}-${sha256}.json`
  const reference = { city, path, sha256, bytes: bytes.byteLength, banks: pack.banks.length }
  return { bytes, reference, npc: evidence.npc.id, venue: evidence.venue.id }
}

function evidenceOf(city: TalkBankV1['city']) {
  return {
    city: { id: city, name: city, source: 'fixture city' },
    npc: { id: `${city}-seller`, name: 'Amina', source: 'fixture regular' },
    venue: { id: `${city}-market`, name: 'Local Market', source: 'fixture venue' },
    facts: [{ id: 'npc-role', text: 'Market seller', source: 'fixture regular' }],
    phrasebook: [],
  }
}

test('reader is lazy and shares static city loading while preserving exact regular and venue identities', async () => {
  const files = cityFiles(), reads: string[] = []
  const reader = createTalkBankReader(async (path, cap) => {
    reads.push(path)
    if (path.endsWith('/index.json')) return bytesOf({ schema: 'allworld-talk-index', version: 1, cities: [files.reference] })
    assert.equal(path, files.reference.path); assert.equal(cap, files.bytes.byteLength)
    return files.bytes
  })
  assert.deepEqual(reads, [])
  const [ref, refAgain] = await Promise.all([reader.reference('kano'), reader.reference('kano')])
  assert.deepEqual(ref, refAgain)
  const [one, two] = await Promise.all([reader.load(ref, files.npc, files.venue), reader.load(ref, files.npc, files.venue)])
  assert.deepEqual(one, two)
  assert.equal(one.bank.city, 'kano'); assert.equal(one.evidence.venue.id, files.venue)
  assert.equal(reads.length, 2)
  await assert.rejects(reader.load(ref, files.npc, 'other-market'), /not at this venue/)
  await assert.rejects(reader.reference('accra'), /unavailable/)
})

test('changed city bytes fail their hash and a later successful read can retry', async () => {
  const files = cityFiles(); let packReads = 0
  const reader = createTalkBankReader(async path => {
    if (path.endsWith('/index.json')) return bytesOf({ schema: 'allworld-talk-index', version: 1, cities: [files.reference] })
    if (++packReads === 1) { const altered = files.bytes.slice(); altered[0] = 32; return altered }
    return files.bytes
  })
  const ref = await reader.reference('kano')
  await assert.rejects(reader.load(ref, files.npc, files.venue), /hash mismatch/)
  assert.equal((await reader.load(ref, files.npc, files.venue)).bank.npc, files.npc)
  assert.equal(packReads, 2)
})

test('index rejects path escape, extra fields and duplicate cities before reading a pack', async () => {
  const { reference } = cityFiles()
  const invalid = [
    { schema: 'allworld-talk-index', version: 1, cities: [{ ...reference, path: '/assets/talk-banks/../private.json' }] },
    { schema: 'allworld-talk-index', version: 1, cities: [{ ...reference, extra: true }] },
    { schema: 'allworld-talk-index', version: 1, cities: [reference, reference] },
  ]
  for (const value of invalid) {
    const reader = createTalkBankReader(async path => { assert.equal(path, '/assets/talk-banks/index.json'); return bytesOf(value) })
    await assert.rejects(reader.reference('kano'), /Invalid|Duplicate/)
  }
})

test('hash-valid packs still reject duplicate regulars and mismatched bank evidence', async () => {
  for (const change of [
    (pack: Parameters<NonNullable<Parameters<typeof cityFiles>[1]>>[0]) => { pack.banks.push(pack.banks[0]!) },
    (pack: Parameters<NonNullable<Parameters<typeof cityFiles>[1]>>[0]) => { pack.banks[0]!.evidence.venue.id = 'another-venue' },
  ]) {
    const files = cityFiles('kano', change)
    const reader = createTalkBankReader(async path => path.endsWith('/index.json')
      ? bytesOf({ schema: 'allworld-talk-index', version: 1, cities: [files.reference] }) : files.bytes)
    await assert.rejects(reader.load(await reader.reference('kano'), files.npc, files.venue), /duplicate|identity|venue|match/i)
  }
})

test('static city retention is bounded without retaining player conversation', async () => {
  const ids: TalkBankV1['city'][] = ['kano', 'accra', 'tokyo', 'paris', 'nairobi', 'lagos', 'london', 'cairo', 'abuja']
  const files = ids.map(city => cityFiles(city))
  const byPath = new Map(files.map(row => [row.reference.path, row.bytes]))
  const counts = new Map<string, number>()
  const reader = createTalkBankReader(async path => {
    if (path.endsWith('/index.json')) return bytesOf({ schema: 'allworld-talk-index', version: 1, cities: files.map(row => row.reference) })
    counts.set(path, (counts.get(path) ?? 0) + 1)
    const bytes = byPath.get(path); assert.ok(bytes); return bytes
  })
  for (const row of [...files, files[0]!]) await reader.load(await reader.reference(row.reference.city), row.npc, row.venue)
  assert.equal(counts.get(files[0]!.reference.path), 2)
  assert.equal(counts.get(files[1]!.reference.path), 1)
})
