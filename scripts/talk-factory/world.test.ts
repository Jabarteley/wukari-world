import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test, { type TestContext } from 'node:test'
import { parseTalkBankEvidence, validateTalkBank, type HumanPhrasebookEntryV1 } from './bank.ts'
import type { TalkDraftBindingV1 } from './draft.ts'
import type { TalkDraftInputsPlanV1 } from './inputs.ts'
import { compileLocalTalkBank } from './local.ts'
import {
  prepareTalkWorld, runTalkWorldInstaller,
  type PreparedTalkWorld, type TalkWorldDependencies,
} from './world.ts'

function digest(value: Uint8Array | string): string { return createHash('sha256').update(value).digest('hex') }

const PHRASEBOOKS: Record<string, HumanPhrasebookEntryV1[]> = {
  ha: [{ lang: 'ha', text: 'Sannu!', gloss: 'Hello!', source: { kind: 'human', citation: 'Fixture Hausa source', contributor: 'Fixture contributor' } }],
  tw: [{ lang: 'tw', text: 'Meda wo ase (Medaase)', gloss: 'Thank you', source: { kind: 'human', citation: 'Fixture Twi source', contributor: 'Fixture contributor' } }],
  ja: [{ lang: 'ja', text: 'ありがとうございます', gloss: 'Thank you.', source: { kind: 'human', citation: 'Fixture Japanese source', contributor: 'Fixture contributor' } }],
}

async function writeFixtureRepo(root: string): Promise<void> {
  const phraseDirectory = join(root, 'scripts/talk-factory/phrasebooks')
  await mkdir(phraseDirectory, { recursive: true })
  await mkdir(join(root, 'scripts/scene-factory'), { recursive: true })
  const regions = {
    schema: 'allworld-scene-region-registry', version: 1,
    regions: [
      { id: 'gulf-guinea', cityIds: ['accra'] },
      { id: 'americas-oceania', cityIds: ['jakarta'] },
      { id: 'sahel-north', cityIds: ['kano'] },
    ],
  }
  await writeFile(join(root, 'scripts/scene-factory/regions.json'), JSON.stringify(regions))
  const entries = []
  for (const lang of ['ha', 'ja', 'tw']) {
    const file = `${lang}.json`, bytes = Buffer.from(JSON.stringify(PHRASEBOOKS[lang]))
    await writeFile(join(phraseDirectory, file), bytes)
    entries.push({ lang, file, sha256: digest(bytes) })
  }
  await writeFile(join(phraseDirectory, 'manifest.json'), JSON.stringify({ version: 1, status: 'beta', entries }))
  for (const file of ['bank.ts', 'draft.ts', 'inputs.ts', 'local.ts', 'world.ts']) {
    await writeFile(join(root, `scripts/talk-factory/${file}`), `fixture source ${file}\n`)
  }
}

function binding(city: string, npc: string, phrasebook: HumanPhrasebookEntryV1[], phrases: { lang: string; text: string }[]): TalkDraftBindingV1 {
  const unsafe = city === 'jakarta'
  const cityName = city === 'accra' ? 'Accra' : city === 'kano' ? 'Kano' : 'Jakarta'
  const venueName = unsafe ? 'J.CO Donuts & Coffee' : `${cityName} Market`
  return {
    city: { id: city, name: cityName, source: `fixture:${city}:city` },
    npc: { id: npc, name: npc === 'a-guide' ? 'Ada Guide' : 'Zed Guide', source: `fixture:${city}:npc` },
    venue: { id: `${city}-market`, name: venueName, source: `fixture:${city}:venue` },
    voice: 'plain', lang: 'en',
    facts: [
      { id: 'npc-role', text: 'Local guide', source: `fixture:${city}:role` },
      { id: 'venue-target-square', text: 'Market square', source: `fixture:${city}:target` },
      { id: 'city-food-1', text: 'rice', source: `fixture:${city}:food` },
      { id: 'city-known-for-1', text: 'public art', source: `fixture:${city}:culture` },
      { id: 'city-place-name-1', text: venueName, source: `fixture:${city}:place` },
      { id: 'city-place-kind-1', text: unsafe ? 'buka' : 'market', source: `fixture:${city}:place` },
    ],
    phrasebook: structuredClone(phrasebook), phrases: structuredClone(phrases),
  }
}

function extractor(options: Parameters<TalkWorldDependencies['extractInputs']>[0]): Promise<TalkDraftInputsPlanV1> {
  const city = String(options.cityId), region = String(options.region)
  const phrasebook = structuredClone(options.phrasebook) as HumanPhrasebookEntryV1[]
  const phrases = structuredClone(options.phrases) as { lang: string; text: string }[]
  const npcIds = city === 'accra' ? ['z-guide', 'a-guide'] : ['z-guide']
  const bindings = npcIds.map(npc => binding(city, npc, phrasebook, phrases))
  return Promise.resolve({
    cityId: city, region,
    cityBrief: { inputSha256: digest(`brief:${city}`), contentSha256: digest(`content:${city}`) },
    sourceHashes: [{ path: `src/fixture/${city}.json`, sha256: digest(`source:${city}`) }],
    requestHashes: npcIds.map(npcId => ({ npcId, sha256: digest(`request:${city}:${npcId}`) })),
    inputSha256: digest(`input:${city}:${region}:${JSON.stringify(phrasebook)}:${JSON.stringify(phrases)}`),
    counts: {
      regulars: bindings.length, bindings: bindings.length,
      facts: bindings.reduce((sum, row) => sum + row.facts.length, 0),
      phrasebookEntries: phrasebook.length, selectedPhrasesPerBinding: phrases.length,
      preparedRequests: bindings.length, preparedPromptBytes: 100 * bindings.length,
    },
    bindings,
  })
}

function dependencies(overrides: Partial<TalkWorldDependencies> = {}): TalkWorldDependencies {
  return {
    readFile,
    extractInputs: extractor,
    compileBank: value => compileLocalTalkBank(value),
    validateBank: (bank, evidence) => validateTalkBank(bank, evidence),
    parseEvidence: evidence => parseTalkBankEvidence(evidence),
    expectedCityCount: 3,
    cityFileMaxBytes: 5_000_000,
    ...overrides,
  }
}

async function fixturePlan(t: TestContext): Promise<{ root: string; plan: PreparedTalkWorld }> {
  const root = await mkdtemp(join(tmpdir(), 'allworld-talk-world-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await writeFixtureRepo(root)
  return { root, plan: await prepareTalkWorld({ repoRoot: root }, dependencies()) }
}

function parsed(plan: PreparedTalkWorld, path: string): Record<string, unknown> {
  const file = plan.files.find(row => row.path === path)
  assert.ok(file)
  return JSON.parse(file.bytes.toString('utf8')) as Record<string, unknown>
}

test('world preparation is byte deterministic, canonical-ID bound, sorted, compact, and source pinned', async t => {
  const root = await mkdtemp(join(tmpdir(), 'allworld-talk-world-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await writeFixtureRepo(root)
  const first = await prepareTalkWorld({ repoRoot: root }, dependencies())
  const second = await prepareTalkWorld({ repoRoot: root }, dependencies())
  assert.deepEqual(first.files.map(file => [file.path, file.bytes]), second.files.map(file => [file.path, file.bytes]))
  assert.equal(first.summary.cities, 3); assert.equal(first.summary.banks, 4); assert.equal(first.summary.externalSpendUsd, 0)

  const index = parsed(first, 'public/assets/talk-banks/index.json')
  assert.deepEqual(Object.keys(index).sort(), ['cities', 'schema', 'version'])
  assert.equal(index.schema, 'allworld-talk-index'); assert.equal(index.version, 1)
  const cities = index.cities as { city: string; path: string; sha256: string; bytes: number; banks: number }[]
  assert.deepEqual(cities.map(row => row.city), ['accra', 'jakarta', 'kano'])
  for (const row of cities) {
    assert.equal(row.path, `/assets/talk-banks/${row.city}-${row.sha256}.json`)
    assert.match(row.sha256, /^[a-f0-9]{64}$/u); assert.ok(row.bytes > 0 && row.bytes <= 5_000_000); assert.ok(row.banks > 0)
    assert.deepEqual(Object.keys(row).sort(), ['banks', 'bytes', 'city', 'path', 'sha256'])
  }

  const accra = parsed(first, `public${cities.find(row => row.city === 'accra')!.path}`)
  assert.deepEqual(Object.keys(accra).sort(), ['banks', 'city', 'schema', 'version'])
  const accraBanks = accra.banks as { npc: string; venue: string; bank: { city: string; npc: string }; evidence: { city: { id: string }; npc: { id: string }; venue: { id: string } } }[]
  assert.deepEqual(accraBanks.map(row => row.npc), ['a-guide', 'z-guide'])
  for (const row of accraBanks) {
    assert.equal(row.bank.city, 'accra'); assert.equal(row.bank.npc, row.npc)
    assert.equal(row.evidence.city.id, 'accra'); assert.equal(row.evidence.npc.id, row.npc); assert.equal(row.evidence.venue.id, row.venue)
  }

  const jakarta = parsed(first, `public${cities.find(row => row.city === 'jakarta')!.path}`)
  const alias = (jakarta.banks as { venue: string; evidence: { venue: { id: string; name: string; source: string } }; bank: { greet: string[] } }[])[0]!
  assert.equal(alias.venue, 'jakarta-market'); assert.equal(alias.evidence.venue.id, 'jakarta-market')
  assert.equal(alias.evidence.venue.name, 'this food place'); assert.deepEqual(alias.bank.greet, ['Welcome to this food place in Jakarta.'])
  assert.equal(alias.evidence.venue.source, 'fixture:jakarta:place')

  const manifest = parsed(first, 'scripts/talk-factory/generated/world-manifest.json')
  assert.equal((manifest.mode as { externalSpendUsd: number }).externalSpendUsd, 0)
  assert.equal((manifest.phrasebooks as { status: string }).status, 'beta')
  assert.ok((manifest.sources as { path: string; sha256: string }[]).some(row => row.path === 'src/fixture/accra.json' && row.sha256 === digest('source:accra')))
  assert.equal(Object.hasOwn(manifest, 'generatedAt'), false)
})

test('altered compiled identity is rejected by the real bank and evidence validators', async t => {
  const root = await mkdtemp(join(tmpdir(), 'allworld-talk-world-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await writeFixtureRepo(root)
  await assert.rejects(prepareTalkWorld({ repoRoot: root }, dependencies({
    compileBank: value => ({ ...compileLocalTalkBank(value), npc: 'altered-npc' }),
  })), /bank\.npc does not match evidence\.npc|compiled talk bank identity differs/)
})

test('check is mutation-free and reports changed installed bytes without repairing them', async t => {
  const { root, plan } = await fixturePlan(t)
  let counter = 0
  const installer = { prepare: async () => plan, uniqueId: () => `fixture-${String(++counter).padStart(8, '0')}` }
  const built = await runTalkWorldInstaller({ command: 'build', repoRoot: root }, installer)
  assert.equal(built.written, plan.files.length)
  const indexPath = join(root, 'public/assets/talk-banks/index.json'), before = await stat(indexPath)
  const checked = await runTalkWorldInstaller({ command: 'check', repoRoot: root }, installer)
  const after = await stat(indexPath)
  assert.equal(checked.written, 0); assert.equal(checked.deleted, 0); assert.equal(after.mtimeMs, before.mtimeMs)

  const altered = Buffer.from('{"altered":true}\n')
  await writeFile(indexPath, altered)
  const alteredBefore = await stat(indexPath)
  await assert.rejects(runTalkWorldInstaller({ command: 'check', repoRoot: root }, installer), /changed:public\/assets\/talk-banks\/index\.json/)
  assert.deepEqual(await readFile(indexPath), altered)
  assert.equal((await stat(indexPath)).mtimeMs, alteredBefore.mtimeMs)
})

test('build refuses a foreign collision before mutation and preserves unrelated files', async t => {
  const { root, plan } = await fixturePlan(t)
  const directory = join(root, 'public/assets/talk-banks')
  await mkdir(directory, { recursive: true })
  const collision = join(directory, 'index.json'), unrelated = join(directory, 'operator-note.txt')
  await writeFile(collision, 'foreign index\n'); await writeFile(unrelated, 'preserve me\n')
  let counter = 0
  const installer = { prepare: async () => plan, uniqueId: () => `fixture-${String(++counter).padStart(8, '0')}` }
  await assert.rejects(runTalkWorldInstaller({ command: 'build', repoRoot: root }, installer), /refusing foreign talk output collision: public\/assets\/talk-banks\/index\.json/)
  assert.equal(await readFile(collision, 'utf8'), 'foreign index\n')
  assert.equal((await readdir(directory)).some(name => /^[a-z0-9-]+-[a-f0-9]{64}\.json$/u.test(name)), false)

  await rm(collision)
  await runTalkWorldInstaller({ command: 'build', repoRoot: root }, installer)
  assert.equal(await readFile(unrelated, 'utf8'), 'preserve me\n')
})
