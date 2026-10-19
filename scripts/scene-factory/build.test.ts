import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { lstat, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { KIT_PROP_IDS } from '../../src/scene/recipe/contract.ts'
import type { CityBriefV1 } from './facts.ts'
import { loadSceneHostScenery, runSceneBuild } from './build.ts'

const script = fileURLToPath(new URL('./build.ts', import.meta.url))
const digest = (value: string | Uint8Array): string => createHash('sha256').update(value).digest('hex')

interface Fixture {
  root: string
  output: string
  briefPath: string
  kitReportPath: string
  kitAssetPath: string
  heroReportPath: string
  heroAssetPath: string
  hostPath: string
  heroVenueId: string | null
  args: string[]
}

function venue(id: string, name: string, kind: string, disposition: 'preserve-authored' | 'target-recipe' | 'exclude-home') {
  return {
    id, name, kind,
    position: { kind: 'lon-lat', lon: 0.1, lat: 5.6 },
    spots: [{ id: 'front', name: 'Front' }],
    effectiveSpots: [{ id: 'front', name: 'Front', source: 'content' }],
    regularIds: disposition === 'target-recipe' ? ['guide'] : [],
    scene: { kind, variant: disposition === 'preserve-authored' ? 'fixture' : null, disposition },
    provenance: { status: 'unknown', sourceFile: null, sourceIds: [], sourceKind: null, accuracy: null, gap: 'Fixture has no factual place claim.' },
  } satisfies CityBriefV1['venues'][number]
}

function brief(name = 'Fixture Market'): CityBriefV1 {
  return {
    schema: 'allworld-city-brief', version: 1,
    city: {
      id: 'fixture-city', name: 'Fixture City',
      state: { id: 'fixture-state', name: 'Fixture State' },
      country: { id: 'fixture-country', name: 'Fixture Country' },
      point: { lon: 0.1, lat: 5.6 },
    },
    style: { region: 'gulf-guinea', selection: 'explicit-input' },
    provenance: {
      status: 'unknown', sourceLabel: null, sourceUrls: [], licence: null, files: [], registrationFiles: [],
      gaps: ['Synthetic contract fixture; no production evidence.'],
    },
    venues: [
      venue('home', 'Home', 'home', 'exclude-home'),
      venue('authored-park', 'Authored Park', 'park', 'preserve-authored'),
      venue('fixture-market', name, 'market', 'target-recipe'),
    ],
    regulars: [{ id: 'guide', venueId: 'fixture-market', name: 'Guide', role: 'host', provenance: { kind: 'game-content', sourceFile: 'fixture/content.ts' } }],
    targetVenueIds: ['fixture-market'], preservedVenueIds: ['authored-park'], excludedVenueIds: ['home'],
    digests: { inputSha256: '1'.repeat(64), contentSha256: '2'.repeat(64) },
  }
}

function authoredOnlyBrief(): CityBriefV1 {
  const value = brief()
  value.venues = value.venues.filter(item => item.id !== 'fixture-market')
  value.regulars = []
  value.targetVenueIds = []
  return value
}

async function fixture(t: test.TestContext, changes: { brief?: CityBriefV1; heroVenueId?: string | null; omitHero?: boolean; corruptHeroHash?: boolean; heroAtlas?: string } = {}): Promise<Fixture> {
  const root = await mkdtemp(join(tmpdir(), 'scene-build-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const output = join(root, 'stage')
  const briefPath = join(root, 'brief.json'), kitReportPath = join(root, 'kit-report.json'), kitAssetPath = join(root, 'kit.glb')
  const heroReportPath = join(root, 'hero-report.json'), heroAssetPath = join(root, 'hero.glb'), hostPath = join(root, 'host.json')
  const kitBytes = Buffer.alloc(20_000, 7), heroBytes = Buffer.alloc(9_000, 11)
  const parts = KIT_PROP_IDS.map((node, index) => ({
    node, triangles: 36 + index,
    bounds: { min: [-0.65 - index * 0.003, 0, -1.15 - index * 0.002], max: [0.95 + index * 0.002, 2.4 + index * 0.004, 0.72] },
    footprint: [-0.65, -1.15, 0.95, 0.72],
  }))
  const kitReport = {
    version: 1, kind: 'kit', id: 'gulf-guinea', url: 'fixture-kit.glb', sha256: digest(kitBytes), rawBytes: kitBytes.length,
    brotliBytes: 8_000, triangles: parts.reduce((sum, part) => sum + part.triangles, 0), parts, extensions: ['EXT_meshopt_compression'],
    atlas: { width: 1024, height: 1024, mimeType: 'image/webp', sha256: '3'.repeat(64) },
  }
  const heroReport = {
    version: 1, kind: 'hero', id: 'fixture-city', url: 'fixture-city.glb',
    sha256: changes.corruptHeroHash ? '4'.repeat(64) : digest(heroBytes), rawBytes: heroBytes.length, brotliBytes: 3_000,
    triangles: 180, parts: [{ node: 'fixture-city', triangles: 180, bounds: { min: [-0.8, 0, -1.2], max: [1.1, 2.8, 0.7] }, footprint: [-0.8, -1.2, 1.1, 0.7] }],
    extensions: ['EXT_meshopt_compression'],
    ...(changes.heroAtlas === undefined ? {} : { atlas: { width: 1024, height: 1024, mimeType: 'image/webp', sha256: changes.heroAtlas } }),
  }
  const selectedBrief = changes.brief ?? brief(), hostSource = await readFile(script)
  const hostVenues = Object.fromEntries(selectedBrief.targetVenueIds.map(id => [id, { triangles: 720, meshes: 3, lights: 2 }]))
  await Promise.all([
    writeFile(briefPath, `${JSON.stringify(selectedBrief, null, 2)}\n`),
    writeFile(kitReportPath, `${JSON.stringify(kitReport, null, 2)}\n`), writeFile(kitAssetPath, kitBytes),
    writeFile(heroReportPath, `${JSON.stringify(heroReport, null, 2)}\n`),
    writeFile(hostPath, `${JSON.stringify({
      schema: 'allworld-scene-host-measurements', version: 1,
      sourceFiles: [{ path: 'scripts/scene-factory/build.ts', sha256: digest(hostSource) }],
      cities: { 'fixture-city': hostVenues },
    }, null, 2)}\n`),
  ])
  if (!changes.omitHero) await writeFile(heroAssetPath, heroBytes)
  const heroVenueId = changes.heroVenueId === undefined ? 'fixture-market' : changes.heroVenueId
  const args = [
    '--brief', briefPath, '--region', 'gulf-guinea', '--kit-report', kitReportPath, '--kit-asset', kitAssetPath,
    '--hero-report', heroReportPath, '--hero-asset', heroAssetPath, '--hero-venue', heroVenueId ?? '-',
    '--host-scenery', hostPath, '--out', output,
  ]
  return { root, output, briefPath, kitReportPath, kitAssetPath, heroReportPath, heroAssetPath, hostPath, heroVenueId, args }
}

function options(f: Fixture, command: 'build' | 'check') {
  return {
    command, briefPath: f.briefPath, region: 'gulf-guinea', kitReportPath: f.kitReportPath, kitAssetPath: f.kitAssetPath,
    heroReportPath: f.heroReportPath, heroAssetPath: f.heroAssetPath, heroVenueId: f.heroVenueId, hostSceneryPath: f.hostPath,
    outputDirectory: f.output,
  } satisfies Parameters<typeof runSceneBuild>[0]
}

test('actual CLI builds a new deterministic stage and checks it read-only', async t => {
  const f = await fixture(t)
  const built = spawnSync(process.execPath, ['--experimental-strip-types', script, 'build', ...f.args], { encoding: 'utf8' })
  assert.equal(built.status, 0, built.stderr)
  const summary: unknown = JSON.parse(built.stdout)
  assert.deepEqual(summary, {
    command: 'build', city: 'fixture-city', recipes: 1, outputDirectory: f.output, recipeFile: 'fixture-city.json',
    recipeSha256: digest(await readFile(join(f.output, 'fixture-city.json'))), manifestSha256: digest(await readFile(join(f.output, 'manifest.json'))),
  })
  const recipeBefore = await readFile(join(f.output, 'fixture-city.json')), manifestBefore = await readFile(join(f.output, 'manifest.json'))
  const timesBefore = await Promise.all([stat(join(f.output, 'fixture-city.json')), stat(join(f.output, 'manifest.json'))])
  const checked = spawnSync(process.execPath, ['--experimental-strip-types', script, 'check', ...f.args], { encoding: 'utf8' })
  assert.equal(checked.status, 0, checked.stderr)
  assert.deepEqual(await readFile(join(f.output, 'fixture-city.json')), recipeBefore)
  assert.deepEqual(await readFile(join(f.output, 'manifest.json')), manifestBefore)
  const timesAfter = await Promise.all([stat(join(f.output, 'fixture-city.json')), stat(join(f.output, 'manifest.json'))])
  assert.deepEqual(timesAfter.map(item => item.mtimeMs), timesBefore.map(item => item.mtimeMs))

  const manifestText = manifestBefore.toString('utf8')
  const seedInput: { input: { layoutSeed: { kind: string; contentSha256: string; seedSha256: string }; toolSourcesSha256: Record<string, string> } } = JSON.parse(manifestText)
  assert.equal(seedInput.input.layoutSeed.kind, 'semantic-v1', 'new cities record their fresh semantic seed selection')
  assert.equal(seedInput.input.layoutSeed.contentSha256, '2'.repeat(64))
  assert.match(seedInput.input.layoutSeed.seedSha256, /^[a-f0-9]{64}$/)
  assert.equal(seedInput.input.toolSourcesSha256['scripts/scene-factory/layout-seeds.ts'], digest(await readFile(new URL('./layout-seeds.ts', import.meta.url))))

  assert.match(manifestText, /"targetVenueIds": \[\s+"fixture-market"/)
  assert.match(manifestText, /"candidateDrafting": \{\s+"targetVenueCount": 1,\s+"attemptedCandidateCount": 1,\s+"acceptedCandidateCount": 1,\s+"rejectedCandidateCount": 0,\s+"firstCandidateSuccessCount": 1,\s+"firstCandidateSuccessRate": 1,\s+"venues": \[\s+\{\s+"venue": "fixture-market",\s+"attempts": \[\s+\{\s+"candidate": 1,\s+"outcome": "accepted"\s+\}\s+\]\s+\}\s+\]/)
  assert.match(manifestText, /"preservedVenueIds": \[\s+"authored-park"/)
  assert.match(manifestText, /"excludedVenueIds": \[\s+"home"/)
  assert.match(manifestText, /"authoredOnlyClassificationHook": "loadAuthoredCityScenes-and-authored-citySceneDef"/)
  assert.match(manifestText, /"sourceFiles": \[\s+\{\s+"path": "scripts\/scene-factory\/build\.ts"/)
  assert.match(manifestText, /"value": \{\s+"fixture-market": \{/)
  assert.match(manifestText, new RegExp(digest(await readFile(f.heroAssetPath))))
  const recipeText = recipeBefore.toString('utf8'), parsed: unknown = JSON.parse(recipeText)
  assert.equal(recipeText, `${JSON.stringify(parsed)}\n`)
  assert.ok(recipeText.length < `${JSON.stringify(parsed, null, 2)}\n`.length)
})

test('authored-only city validates its hero asset but emits no recipe or hero placement', async t => {
  const f = await fixture(t, { brief: authoredOnlyBrief(), heroVenueId: null })
  const built = await runSceneBuild(options(f, 'build'))
  assert.equal(built.recipes, 0)
  const recipePath = join(f.output, 'fixture-city.json'), manifestPath = join(f.output, 'manifest.json')
  const recipeBefore = await readFile(recipePath), manifestBefore = await readFile(manifestPath)
  assert.equal(recipeBefore.toString('utf8'), '{"schema":"allworld-city-scenes","version":2,"city":"fixture-city","recipes":[]}\n')
  assert.match(manifestBefore.toString('utf8'), /"heroVenueId": null/)
  assert.match(manifestBefore.toString('utf8'), /"heroPlacementReason": "all-public-venues-authored"/)
  assert.match(manifestBefore.toString('utf8'), /"candidateDrafting": \{\s+"targetVenueCount": 0,\s+"attemptedCandidateCount": 0,\s+"acceptedCandidateCount": 0,\s+"rejectedCandidateCount": 0,\s+"firstCandidateSuccessCount": 0,\s+"firstCandidateSuccessRate": null,\s+"venues": \[\]\s+\}/)
  assert.match(manifestBefore.toString('utf8'), new RegExp(digest(await readFile(f.heroAssetPath))))
  await runSceneBuild(options(f, 'check'))
  assert.deepEqual(await readFile(recipePath), recipeBefore)
  assert.deepEqual(await readFile(manifestPath), manifestBefore)
})

test('hero placement selection matches target coverage', async t => {
  await t.test('nonempty target set refuses no placement', async t => {
    const f = await fixture(t, { heroVenueId: null })
    await assert.rejects(runSceneBuild(options(f, 'build')), /requires one explicit target hero venue/)
    await assert.rejects(lstat(f.output), /ENOENT/)
  })
  await t.test('authored-only city refuses a chosen venue', async t => {
    const f = await fixture(t, { brief: authoredOnlyBrief(), heroVenueId: 'authored-park' })
    await assert.rejects(runSceneBuild(options(f, 'build')), /authored-only city cannot select a hero venue/)
    await assert.rejects(lstat(f.output), /ENOENT/)
  })
})

test('build refuses an existing stage without changing either file', async t => {
  const f = await fixture(t)
  await runSceneBuild(options(f, 'build'))
  const recipe = await readFile(join(f.output, 'fixture-city.json')), manifest = await readFile(join(f.output, 'manifest.json'))
  await assert.rejects(runSceneBuild(options(f, 'build')), /output already exists/)
  assert.deepEqual(await readFile(join(f.output, 'fixture-city.json')), recipe)
  assert.deepEqual(await readFile(join(f.output, 'manifest.json')), manifest)
})

test('check detects a changed deterministic recipe and leaves it untouched', async t => {
  const f = await fixture(t)
  await runSceneBuild(options(f, 'build'))
  const path = join(f.output, 'fixture-city.json'), changed = `${await readFile(path, 'utf8')} `
  await writeFile(path, changed)
  await assert.rejects(runSceneBuild(options(f, 'check')), /staged recipe differs from the deterministic rebuild/)
  assert.equal(await readFile(path, 'utf8'), changed)
})

test('missing, incomplete, and hash-mismatched measured assets fail before staging', async t => {
  await t.test('missing hero asset', async t => {
    const f = await fixture(t, { omitHero: true })
    await assert.rejects(runSceneBuild(options(f, 'build')), /hero asset is missing or unreadable/)
    await assert.rejects(lstat(f.output), /ENOENT/)
  })
  await t.test('hero hash mismatch', async t => {
    const f = await fixture(t, { corruptHeroHash: true })
    await assert.rejects(runSceneBuild(options(f, 'build')), /hero asset hash does not match its measured report/)
    await assert.rejects(lstat(f.output), /ENOENT/)
  })
  await t.test('incomplete kit report', async t => {
    const f = await fixture(t)
    const report = await readFile(f.kitReportPath, 'utf8')
    const changed = report.replace(/,?\s*\{\s*"node": "sign-frame"[\s\S]*?"footprint": \[[\s\S]*?\]\s*\}/, '')
    assert.notEqual(changed, report)
    await writeFile(f.kitReportPath, changed)
    await assert.rejects(runSceneBuild(options(f, 'build')), /kit report must measure every required prop exactly once/)
    await assert.rejects(lstat(f.output), /ENOENT/)
  })
})

test('host scenery requires pinned source bytes and exact target-venue coverage', async t => {
  await t.test('source pin changed', async t => {
    const f = await fixture(t)
    const host = JSON.parse(await readFile(f.hostPath, 'utf8')) as { sourceFiles: { sha256: string }[] }
    host.sourceFiles[0]!.sha256 = '0'.repeat(64)
    await writeFile(f.hostPath, `${JSON.stringify(host, null, 2)}\n`)
    await assert.rejects(runSceneBuild(options(f, 'build')), /no longer matches its pinned SHA-256/)
    await assert.rejects(lstat(f.output), /ENOENT/)
  })
  await t.test('target missing', async t => {
    const f = await fixture(t)
    const host = JSON.parse(await readFile(f.hostPath, 'utf8')) as { cities: Record<string, Record<string, unknown>> }
    host.cities['fixture-city'] = {}
    await writeFile(f.hostPath, `${JSON.stringify(host, null, 2)}\n`)
    await assert.rejects(runSceneBuild(options(f, 'build')), /hostScenery\.fixture-market: missing field/)
    await assert.rejects(lstat(f.output), /ENOENT/)
  })
  await t.test('unrelated venue present', async t => {
    const f = await fixture(t)
    const host = JSON.parse(await readFile(f.hostPath, 'utf8')) as { cities: Record<string, Record<string, unknown>> }
    host.cities['fixture-city']!.unrelated = { triangles: 1, meshes: 1, lights: 0 }
    await writeFile(f.hostPath, `${JSON.stringify(host, null, 2)}\n`)
    await assert.rejects(runSceneBuild(options(f, 'build')), /hostScenery: unknown field/)
    await assert.rejects(lstat(f.output), /ENOENT/)
  })
})

test('host scenery accepts a large pinned source book and refuses duplicate or changed evidence', async t => {
  const root = await mkdtemp(join(tmpdir(), 'scene-host-pins-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(join(root, 'pins'))
  const sourceFiles: { path: string; sha256: string }[] = []
  for (let index = 0; index < 140; index++) {
    const path = `pins/source-${index}.txt`, bytes = `source ${index}\n`
    await writeFile(join(root, path), bytes)
    sourceFiles.push({ path, sha256: digest(bytes) })
  }
  const hostPath = join(root, 'host.json')
  const host = { schema: 'allworld-scene-host-measurements', version: 1, sourceFiles, cities: { 'fixture-city': {} } }
  await writeFile(hostPath, JSON.stringify(host))
  const loaded = await loadSceneHostScenery(hostPath, root)
  assert.equal(loaded.sourceFiles.length, 140)

  await writeFile(join(root, sourceFiles[139]!.path), 'changed\n')
  await assert.rejects(loadSceneHostScenery(hostPath, root), /sourceFiles\[139\] no longer matches its pinned SHA-256/)

  host.sourceFiles = [...sourceFiles.slice(0, -1), sourceFiles[0]!]
  await writeFile(hostPath, JSON.stringify(host))
  await assert.rejects(loadSceneHostScenery(hostPath, root), /source files must be non-empty and unique/)
})

test('optional measured hero atlas must be byte-identical to the selected regional kit atlas', async t => {
  const accepted = await fixture(t, { heroAtlas: '3'.repeat(64) })
  await runSceneBuild(options(accepted, 'build'))
  const recipe = JSON.parse(await readFile(join(accepted.output, 'fixture-city.json'), 'utf8')) as { recipes: unknown[] }
  assert.equal(recipe.recipes.length, 1)

  const refused = await fixture(t, { heroAtlas: '4'.repeat(64) })
  await assert.rejects(runSceneBuild(options(refused, 'build')), /hero atlas differs from the selected regional kit/)
  await assert.rejects(lstat(refused.output), /ENOENT/)
})

test('coverage and hero identities are fail-closed', async t => {
  await t.test('coverage omits the preserved venue', async t => {
    const value = brief(); value.preservedVenueIds = []
    const f = await fixture(t, { brief: value })
    await assert.rejects(runSceneBuild(options(f, 'build')), /coverage must partition every venue exactly once/)
  })
  await t.test('hero report names another city', async t => {
    const f = await fixture(t)
    const report = await readFile(f.heroReportPath, 'utf8')
    const changed = report.replace('"id": "fixture-city"', '"id": "another-city"').replace('"node": "fixture-city"', '"node": "another-city"')
    assert.notEqual(changed, report)
    await writeFile(f.heroReportPath, changed)
    await assert.rejects(runSceneBuild(options(f, 'build')), /hero report does not match the city brief/)
  })
})

test('unsafe venue display text is filtered rather than copied into a sign', async t => {
  const f = await fixture(t, { brief: brief('https://example.invalid') })
  await runSceneBuild(options(f, 'build'))
  const recipe = await readFile(join(f.output, 'fixture-city.json'), 'utf8')
  const manifest = await readFile(join(f.output, 'manifest.json'), 'utf8')
  assert.doesNotMatch(recipe, /example\.invalid/)
  assert.match(manifest, /"emittedCount": 0/)
  assert.match(manifest, /"filteredOutCount": 1/)
})

test('output parent must already be a real directory', async t => {
  const f = await fixture(t)
  f.output = join(f.root, 'missing-parent', 'stage')
  await assert.rejects(runSceneBuild(options(f, 'build')), /output parent is missing or unreadable/)
  await mkdir(join(f.root, 'real-parent'))
  await writeFile(join(f.root, 'not-a-directory'), 'x')
  f.output = join(f.root, 'not-a-directory', 'stage')
  await assert.rejects(runSceneBuild(options(f, 'build')), /output parent must be an existing regular directory/)
})
