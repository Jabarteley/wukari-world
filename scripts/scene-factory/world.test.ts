import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { lstat, mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import test from 'node:test'
import { KIT_PROP_IDS } from '../../src/scene/recipe/contract.ts'
import type { RecipeCityPack } from '../../src/scene/recipe/pack.ts'
import { validateAsset, type AssetReport, type HeroRecord } from './assets.ts'
import type { CityBriefV1 } from './facts.ts'
import { parseSceneWorldCli, runSceneWorld, type SceneWorldDependencies, type SceneWorldOptions } from './world.ts'

const digest = (value: string | Uint8Array): string => createHash('sha256').update(value).digest('hex')

interface Fixture {
  root: string
  output: string
  indexPath: string
  hostPath: string
  options: SceneWorldOptions
  dependencies: SceneWorldDependencies
  briefs: Map<string, CityBriefV1>
  kitBytes: Buffer
  heroBytes: Buffer
}

function venue(id: string, disposition: 'preserve-authored' | 'target-recipe' | 'exclude-home', kind: string) {
  return {
    id, name: id === 'home' ? 'Home' : id === 'market' ? 'Alpha Market' : 'Beta Quad', kind,
    position: { kind: 'lon-lat' as const, lon: 3.4, lat: 6.5 },
    spots: [{ id: 'front', name: 'Front' }], effectiveSpots: [{ id: 'front', name: 'Front', source: 'content' as const }], regularIds: [],
    scene: { kind, variant: disposition === 'preserve-authored' ? 'fixture' : null, disposition },
    provenance: { status: 'unknown' as const, sourceFile: null, sourceIds: [], sourceKind: null, accuracy: null, gap: 'No place claim in this fixture.' },
  }
}

function brief(city: 'alpha' | 'beta'): CityBriefV1 {
  const target = city === 'alpha' ? [venue('market', 'target-recipe', 'market')] : []
  const preserved = city === 'beta' ? [venue('quad', 'preserve-authored', 'quad')] : []
  return {
    schema: 'allworld-city-brief', version: 1,
    city: { id: city, name: city === 'alpha' ? 'Alpha City' : 'Beta City', state: { id: 'fixture-state', name: 'Fixture State' }, country: { id: 'ng', name: 'Nigeria' }, point: { lon: 3.4, lat: 6.5 } },
    style: { region: 'niger-delta', selection: 'explicit-input' },
    provenance: { status: 'unknown', sourceLabel: null, sourceUrls: [], licence: null, files: [], registrationFiles: [], gaps: ['Fixture only.'] },
    venues: [venue('home', 'exclude-home', 'home'), ...target, ...preserved], regulars: [],
    targetVenueIds: target.map(row => row.id), preservedVenueIds: preserved.map(row => row.id), excludedVenueIds: ['home'],
    digests: { inputSha256: city === 'alpha' ? '1'.repeat(64) : '2'.repeat(64), contentSha256: city === 'alpha' ? '3'.repeat(64) : '4'.repeat(64) },
  }
}

function hero(city: string): HeroRecord {
  return {
    city, country: 'ng', name: `${city} fixture market`, category: 'market',
    sourceUrls: ['https://example.invalid/fixture'], sourceRef: `fixture:${city}`, sourceLicence: 'Fixture facts only.', accessed: '2026-10-18',
    geometryLicence: 'AGPL-3.0-or-later', generator: 'market',
    parameters: { width: 6, depth: 5, height: 2, seed: city === 'alpha' ? 1 : 2, palette: ['#111111', '#222222', '#333333', '#444444'], composition: 'neutral-trade' },
    evidence: 'Synthetic contract fixture with no production claim.',
  }
}

function kitReport(bytes: Buffer): AssetReport {
  const parts = KIT_PROP_IDS.map(node => ({ node, triangles: 1, bounds: { min: [-0.5, 0, -0.5] as [number, number, number], max: [0.5, 1, 0.5] as [number, number, number] }, footprint: [-0.5, -0.5, 0.5, 0.5] as [number, number, number, number] }))
  return {
    version: 1, kind: 'kit', id: 'niger-delta', url: '/fixture/kit.glb', sha256: digest(bytes), rawBytes: bytes.length, brotliBytes: 1,
    triangles: parts.length, parts, extensions: ['EXT_meshopt_compression'], atlas: { width: 1024, height: 1024, mimeType: 'image/webp', sha256: 'a'.repeat(64) },
  }
}

function heroReport(city: string, bytes: Buffer, atlas?: AssetReport['atlas'], inputs?: AssetReport['inputs']): AssetReport {
  return {
    version: 1, kind: 'hero', id: city, url: `/fixture/${city}.glb`, sha256: digest(bytes), rawBytes: bytes.length, brotliBytes: 1, triangles: 12,
    parts: [{ node: city, triangles: 12, bounds: { min: [-0.5, 0, -0.5], max: [0.5, 1, 0.5] }, footprint: [-0.5, -0.5, 0.5, 0.5] }],
    extensions: ['EXT_meshopt_compression'], ...(atlas ? { atlas } : {}), ...(inputs ? { inputs } : {}),
  }
}

function regionalInputs(provenance: HeroRecord, style = true): NonNullable<AssetReport['inputs']> {
  return {
    rawSha256: 'b'.repeat(64), scriptsSha256: 'c'.repeat(64), ...(style ? { styleSha256: 'd'.repeat(64) } : {}),
    provenance, node: process.version, packer: 'gltfpack@1.3.0',
  }
}

async function json(path: string, value: unknown): Promise<void> {
  await mkdir(join(path, '..'), { recursive: true })
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`)
}

async function fixture(t: test.TestContext): Promise<Fixture> {
  const root = await mkdtemp(join(tmpdir(), 'scene-world-')), output = join(root, 'stage')
  t.after(() => rm(root, { recursive: true, force: true }))
  const indexPath = 'inputs/assets.json', hostPath = 'inputs/host.json'
  const kitBytes = Buffer.from('fixture-kit-bytes'), heroBytes = Buffer.from('shared-fixture-hero-bytes')
  const regionRegistry = {
    schema: 'allworld-scene-region-registry', version: 1, status: 'fixture', sourceParent: 'fixture', runtimeBase: 'fixture', upstreamMain: 'fixture', provenance: {}, paletteFields: ['ground', 'wall', 'roof', 'accent', 'trim'],
    cityCoverage: { catalogueCities: 2, uniqueCityIds: 2, membershipCount: 2, everyCityExactlyOnce: true },
    regions: [{ id: 'niger-delta', label: 'Fixture Region', palette: { ground: '#111111', wall: '#222222', roof: '#333333', accent: '#444444', trim: '#555555' }, artDirectionNote: 'Fixture colours.', cityCount: 2, cityIds: ['alpha', 'beta'] }],
  }
  const index = {
    schema: 'allworld-scene-assets', version: 1,
    kits: [{ id: 'niger-delta', asset: 'inputs/kit.glb', report: 'inputs/kit.json' }],
    heroes: [
      { id: 'alpha', asset: 'inputs/alpha.glb', report: 'inputs/alpha.json', venue: 'market' },
      { id: 'beta', asset: 'inputs/beta.glb', report: 'inputs/beta.json', venue: null },
    ],
  }
  const hostSource = Buffer.from('fixture host-scene support source\n')
  await Promise.all([
    json(join(root, 'scripts/scene-factory/regions.json'), regionRegistry),
    json(join(root, 'scripts/scene-factory/heroes.json'), [hero('alpha'), hero('beta')]),
    json(join(root, indexPath), index), json(join(root, hostPath), {
      schema: 'allworld-scene-host-measurements', version: 1,
      sourceFiles: [{ path: 'inputs/host-source.ts', sha256: digest(hostSource) }],
      cities: { alpha: { market: { triangles: 720, meshes: 3, lights: 2 } }, beta: {} },
    }),
    json(join(root, 'inputs/kit.json'), kitReport(kitBytes)),
    json(join(root, 'inputs/alpha.json'), heroReport('alpha', heroBytes)),
    json(join(root, 'inputs/beta.json'), heroReport('beta', heroBytes)),
    mkdir(join(root, 'inputs'), { recursive: true }).then(() => Promise.all([
      writeFile(join(root, 'inputs/kit.glb'), kitBytes), writeFile(join(root, 'inputs/alpha.glb'), heroBytes), writeFile(join(root, 'inputs/beta.glb'), heroBytes),
      writeFile(join(root, 'inputs/host-source.ts'), hostSource),
    ])),
  ])
  const briefs = new Map<string, CityBriefV1>([['alpha', brief('alpha')], ['beta', brief('beta')]])
  const dependencies: SceneWorldDependencies = {
    expectedCityCount: 2, expectedRegionCount: 1,
    assetValidator: async (bytes, kind, id, _expectedNodes, binding) => kind === 'kit' ? kitReport(bytes) : heroReport(id, bytes, binding ? { width: 1024, height: 1024, mimeType: 'image/webp', sha256: binding.sha256 } : undefined),
    extractBrief: async options => {
      assert.ok(typeof options.cityId === 'string')
      const found = briefs.get(options.cityId)
      assert.ok(found)
      return structuredClone(found)
    },
  }
  const options: SceneWorldOptions = { command: 'build', repoRoot: root, assetIndexPath: indexPath, hostSceneryPath: hostPath, outputDirectory: output }
  return { root, output, indexPath, hostPath, options, dependencies, briefs, kitBytes, heroBytes }
}

test('build stages deterministic compact recipes, content-addressed assets and template lazy entries; check is read-only', async t => {
  const f = await fixture(t), built = await runSceneWorld(f.options, f.dependencies)
  assert.deepEqual({ cities: built.cities, regions: built.regions, recipes: built.recipes }, { cities: 2, regions: 1, recipes: 1 })
  const kitHash = digest(f.kitBytes), heroHash = digest(f.heroBytes)
  assert.deepEqual(await readFile(join(f.output, `public/assets/scene-factory/kits/niger-delta-${kitHash}.glb`)), f.kitBytes)
  assert.deepEqual(await readFile(join(f.output, `public/assets/scene-factory/heroes/alpha-${heroHash}.glb`)), f.heroBytes)
  assert.deepEqual(await readFile(join(f.output, `public/assets/scene-factory/heroes/beta-${heroHash}.glb`)), f.heroBytes)

  const alphaRecipe = await readFile(join(f.output, 'scripts/scene-factory/generated/recipes/alpha.json'), 'utf8')
  const parsed: unknown = JSON.parse(alphaRecipe)
  assert.equal(alphaRecipe, `${JSON.stringify(parsed)}\n`)
  const alphaEntry = await readFile(join(f.output, 'src/scene/recipe/cities/alpha.ts'), 'utf8')
  const betaEntry = await readFile(join(f.output, 'src/scene/recipe/cities/beta.ts'), 'utf8')
  assert.match(alphaEntry, new RegExp(`/assets/scene-factory/kits/niger-delta-${kitHash}\\.glb`))
  assert.match(alphaEntry, new RegExp(`/assets/scene-factory/heroes/alpha-${heroHash}\\.glb`))
  assert.match(alphaEntry, /"hostScenery":\{"market":\{"triangles":720,"meshes":3,"lights":2\}\}/)
  assert.doesNotMatch(betaEntry, /scene-factory\/heroes\/beta/)
  assert.match(betaEntry, /"hostScenery":\{\}/)
  assert.doesNotMatch(alphaEntry, new RegExp(f.root.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')))
  const registry = await readFile(join(f.output, 'src/scene/recipe/registry.generated.ts'), 'utf8')
  assert.match(registry, /Readonly<Record<string, \(\) => Promise<\{ default: RecipeCityPack \}>>>/)
  assert.match(registry, /return import\(`\.\/cities\/\$\{city\}\.ts`\)/)
  assert.doesNotMatch(registry, /import\('\.\/cities\//)
  const generated: { RECIPE_CITY_LOADERS: Readonly<Record<string, () => Promise<{ default: RecipeCityPack }>>> } = await import(
    pathToFileURL(join(f.output, 'src/scene/recipe/registry.generated.ts')).href,
  )
  const loaders = generated.RECIPE_CITY_LOADERS
  assert.deepEqual(Object.keys(loaders), ['alpha', 'beta'])
  const alphaPack = (await loaders.alpha!()).default, betaPack = (await loaders.beta!()).default
  const alphaRuntime = JSON.parse(alphaPack.text) as { city: string; recipes: unknown[] }
  const betaRuntime = JSON.parse(betaPack.text) as { city: string; recipes: unknown[] }
  assert.deepEqual({ city: alphaRuntime.city, recipes: alphaRuntime.recipes.length }, { city: 'alpha', recipes: 1 })
  assert.deepEqual({ city: betaRuntime.city, recipes: betaRuntime.recipes.length }, { city: 'beta', recipes: 0 })
  assert.equal(Object.hasOwn(loaders, 'unknown'), false)
  assert.equal(Object.hasOwn(loaders, '../alpha'), false)

  const manifestPath = join(f.output, 'scripts/scene-factory/generated/world-manifest.json'), manifest = await readFile(manifestPath, 'utf8')
  assert.doesNotMatch(manifest, new RegExp(f.root.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')))
  assert.match(manifest, /"assets": \[\s+\{\s+"kind": "kit"/)
  assert.match(manifest, /"assets": \[\s+"hero:alpha",\s+"hero:beta"/)
  const before = await stat(manifestPath)
  const checked = await runSceneWorld({ ...f.options, command: 'check' }, f.dependencies)
  assert.equal(checked.manifestSha256, built.manifestSha256)
  assert.equal((await stat(manifestPath)).mtimeMs, before.mtimeMs)
})

test('check regenerates fresh briefs in memory and rejects stale committed bytes without writing', async t => {
  const f = await fixture(t)
  await runSceneWorld(f.options, f.dependencies)
  const path = join(f.output, 'scripts/scene-factory/generated/briefs/alpha.json'), before = await readFile(path), time = await stat(path)
  const changed = structuredClone(f.briefs.get('alpha')!)
  changed.city.name = 'Changed Alpha City'
  f.briefs.set('alpha', changed)
  await assert.rejects(runSceneWorld({ ...f.options, command: 'check' }, f.dependencies), /staged output differs at scripts\/scene-factory\/generated\/briefs\/alpha\.json/)
  assert.deepEqual(await readFile(path), before)
  assert.equal((await stat(path)).mtimeMs, time.mtimeMs)
})

test('approved hero placement is explicit and zero-target cities require null', async t => {
  const f = await fixture(t)
  const index = JSON.parse(await readFile(join(f.root, f.indexPath), 'utf8')) as { heroes: { id: string; venue: string | null }[] }
  index.heroes.find(row => row.id === 'alpha')!.venue = null
  await json(join(f.root, f.indexPath), index)
  await assert.rejects(runSceneWorld(f.options, f.dependencies), /hero venue for alpha must be an actual recipe target/)

  index.heroes.find(row => row.id === 'alpha')!.venue = 'market'
  index.heroes.find(row => row.id === 'beta')!.venue = 'quad'
  await json(join(f.root, f.indexPath), index)
  await assert.rejects(runSceneWorld(f.options, f.dependencies), /authored-only city beta must have a null hero venue/)
  await assert.rejects(lstat(f.output), /ENOENT/)
})

test('default validation decodes indexed asset bytes instead of trusting a matching report hash', async t => {
  const f = await fixture(t)
  await assert.rejects(runSceneWorld(f.options, { ...f.dependencies, assetValidator: validateAsset }), /GLB byte limit or truncated header/)
  await assert.rejects(lstat(f.output), /ENOENT/)
})

test('decoded measurement projection must equal the supplied report projection', async t => {
  const f = await fixture(t), accepted = f.dependencies.assetValidator
  const dependencies: SceneWorldDependencies = {
    ...f.dependencies,
    assetValidator: async (...args) => {
      const actual = await accepted(...args)
      if (actual.kind === 'hero' && actual.id === 'alpha') {
        actual.parts[0]!.bounds.max[0] += 0.25
      }
      return actual
    },
  }
  await assert.rejects(runSceneWorld(f.options, dependencies), /hero alpha measured report differs from decoded asset bytes/)
  await assert.rejects(lstat(f.output), /ENOENT/)
})

test('canonical hero country and regional-atlas binding must match the fresh city and selected kit', async t => {
  await t.test('legacy Nigeria country identity matches its canonical ISO hero', async t => {
    const f = await fixture(t)
    f.briefs.get('alpha')!.city.country.id = 'nigeria'
    const built = await runSceneWorld(f.options, f.dependencies)
    assert.equal(built.cities, 2)
  })
  await t.test('country mismatch', async t => {
    const f = await fixture(t)
    const records = JSON.parse(await readFile(join(f.root, 'scripts/scene-factory/heroes.json'), 'utf8')) as { city: string; country: string }[]
    records.find(row => row.city === 'alpha')!.country = 'gh'
    await json(join(f.root, 'scripts/scene-factory/heroes.json'), records)
    await assert.rejects(runSceneWorld(f.options, f.dependencies), /canonical hero country differs from the fresh brief for alpha/)
  })
  await t.test('surface region mismatch', async t => {
    const f = await fixture(t)
    const records = JSON.parse(await readFile(join(f.root, 'scripts/scene-factory/heroes.json'), 'utf8')) as { city: string; surface?: { kind: string; region: string } }[]
    records.find(row => row.city === 'alpha')!.surface = { kind: 'regional-atlas', region: 'western-europe' }
    await json(join(f.root, 'scripts/scene-factory/heroes.json'), records)
    await assert.rejects(runSceneWorld(f.options, f.dependencies), /canonical hero surface region differs for alpha/)
  })
  await t.test('matching surface binds the hero to the decoded regional atlas', async t => {
    const f = await fixture(t)
    const records = JSON.parse(await readFile(join(f.root, 'scripts/scene-factory/heroes.json'), 'utf8')) as HeroRecord[]
    const canonical = records.find(row => row.city === 'alpha')!
    canonical.surface = { kind: 'regional-atlas', region: 'niger-delta' }
    await json(join(f.root, 'scripts/scene-factory/heroes.json'), records)
    await json(join(f.root, 'inputs/alpha.json'), heroReport('alpha', f.heroBytes,
      { width: 1024, height: 1024, mimeType: 'image/webp', sha256: 'a'.repeat(64) }, regionalInputs(canonical)))
    const built = await runSceneWorld(f.options, f.dependencies)
    assert.equal(built.cities, 2)
  })
  await t.test('surface report cannot omit canonical provenance or style identity', async t => {
    const f = await fixture(t)
    const records = JSON.parse(await readFile(join(f.root, 'scripts/scene-factory/heroes.json'), 'utf8')) as HeroRecord[]
    const canonical = records.find(row => row.city === 'alpha')!
    canonical.surface = { kind: 'regional-atlas', region: 'niger-delta' }
    await json(join(f.root, 'scripts/scene-factory/heroes.json'), records)
    const atlas = { width: 1024 as const, height: 1024 as const, mimeType: 'image/webp' as const, sha256: 'a'.repeat(64) }
    await json(join(f.root, 'inputs/alpha.json'), heroReport('alpha', f.heroBytes, atlas))
    await assert.rejects(runSceneWorld(f.options, f.dependencies), /requires regional-atlas build inputs/)
    await json(join(f.root, 'inputs/alpha.json'), heroReport('alpha', f.heroBytes, atlas, regionalInputs(canonical, false)))
    await assert.rejects(runSceneWorld(f.options, f.dependencies), /requires a regional style SHA-256/)
    await json(join(f.root, 'inputs/alpha.json'), heroReport('alpha', f.heroBytes, atlas,
      regionalInputs({ ...canonical, name: 'Different fixture identity' })))
    await assert.rejects(runSceneWorld(f.options, f.dependencies), /requires exact canonical regional-atlas provenance/)
  })
})

test('canonical descriptive provenance is retained and must exactly match the regional report', async t => {
  const f = await fixture(t)
  const canonical = {
    ...hero('alpha'), name: 'Alpha Bazaar', surface: { kind: 'regional-atlas' as const, region: 'niger-delta' as const },
    provenance: { sourcePath: 'fixture:alpha', unknowns: ['Not a surveyed replica.'], artDirection: { composition: 'fixture' } },
  }
  await json(join(f.root, 'scripts/scene-factory/heroes.json'), [canonical, hero('beta')])
  const atlas = { width: 1024 as const, height: 1024 as const, mimeType: 'image/webp' as const, sha256: 'a'.repeat(64) }
  await json(join(f.root, 'inputs/alpha.json'), heroReport('alpha', f.heroBytes, atlas, regionalInputs(canonical)))
  assert.equal((await runSceneWorld(f.options, f.dependencies)).cities, 2)
  const recipes = JSON.parse(await readFile(join(f.output, 'scripts/scene-factory/generated/recipes/alpha.json'), 'utf8')) as { recipes: { signs: { text: string }[] }[] }
  assert.equal(recipes.recipes[0]?.signs[0]?.text, 'Model: Alpha Bazaar')
  const changed = structuredClone(canonical)
  changed.provenance.unknowns = ['Different source limitations.']
  await json(join(f.root, 'inputs/alpha.json'), heroReport('alpha', f.heroBytes, atlas, regionalInputs(changed)))
  await assert.rejects(runSceneWorld({ ...f.options, command: 'check' }, f.dependencies), /requires exact canonical regional-atlas provenance/)
  await json(join(f.root, 'scripts/scene-factory/heroes.json'), [{ ...canonical, provenance: 'not an object' }, hero('beta')])
  await assert.rejects(runSceneWorld(f.options, f.dependencies), /provenance must be a JSON object/)
  await json(join(f.root, 'scripts/scene-factory/heroes.json'), [{ ...canonical, unexpected: {} }, hero('beta')])
  await assert.rejects(runSceneWorld(f.options, f.dependencies), /unknown field unexpected/)
})

test('repo-relative inputs cannot escape through a symlinked ancestor', async t => {
  const f = await fixture(t), outside = await mkdtemp(join(tmpdir(), 'scene-world-outside-'))
  t.after(() => rm(outside, { recursive: true, force: true }))
  await writeFile(join(outside, 'alpha.glb'), f.heroBytes)
  await symlink(outside, join(f.root, 'outside-link'))
  const index = JSON.parse(await readFile(join(f.root, f.indexPath), 'utf8')) as { heroes: { id: string; asset: string }[] }
  index.heroes.find(row => row.id === 'alpha')!.asset = 'outside-link/alpha.glb'
  await json(join(f.root, f.indexPath), index)
  await assert.rejects(runSceneWorld(f.options, f.dependencies), /hero alpha asset resolves outside the repository/)
  await assert.rejects(lstat(f.output), /ENOENT/)
})

test('missing host input and incomplete asset coverage fail before staging', async t => {
  await t.test('host input', async t => {
    const f = await fixture(t)
    await rm(join(f.root, f.hostPath))
    await assert.rejects(runSceneWorld(f.options, f.dependencies), /host scenery is missing or unreadable/)
    await assert.rejects(lstat(f.output), /ENOENT/)
  })
  await t.test('host city coverage', async t => {
    const f = await fixture(t)
    const host = JSON.parse(await readFile(join(f.root, f.hostPath), 'utf8')) as { cities: Record<string, unknown> }
    delete host.cities.beta
    await json(join(f.root, f.hostPath), host)
    await assert.rejects(runSceneWorld(f.options, f.dependencies), /host scenery city coverage differs from the canonical region registry/)
    await assert.rejects(lstat(f.output), /ENOENT/)
  })
  await t.test('host source pin', async t => {
    const f = await fixture(t)
    await writeFile(join(f.root, 'inputs/host-source.ts'), 'changed support source\n')
    await assert.rejects(runSceneWorld(f.options, f.dependencies), /no longer matches its pinned SHA-256/)
    await assert.rejects(lstat(f.output), /ENOENT/)
  })
  await t.test('asset coverage', async t => {
    const f = await fixture(t)
    const index = JSON.parse(await readFile(join(f.root, f.indexPath), 'utf8')) as { heroes: unknown[] }
    index.heroes.pop()
    await json(join(f.root, f.indexPath), index)
    await assert.rejects(runSceneWorld(f.options, f.dependencies), /asset index must contain exactly one hero for every city/)
    await assert.rejects(lstat(f.output), /ENOENT/)
  })
})

test('build refuses any existing output without changing foreign files', async t => {
  const f = await fixture(t)
  await mkdir(f.output)
  await writeFile(join(f.output, 'foreign.txt'), 'keep')
  await assert.rejects(runSceneWorld(f.options, f.dependencies), /output already exists/)
  assert.equal(await readFile(join(f.output, 'foreign.txt'), 'utf8'), 'keep')
})

test('CLI requires explicit repo, approved asset index, host measurement and output', () => {
  assert.deepEqual(parseSceneWorldCli(['check', '--repo-root', '/tmp/repo', '--asset-index', 'inputs/assets.json', '--host-scenery', 'inputs/host.json', '--out', '/tmp/stage']), {
    command: 'check', repoRoot: '/tmp/repo', assetIndexPath: 'inputs/assets.json', hostSceneryPath: 'inputs/host.json', outputDirectory: '/tmp/stage',
  })
  assert.throws(() => parseSceneWorldCli(['build', '--repo-root', '/tmp/repo', '--asset-index', 'inputs/assets.json', '--out', '/tmp/stage']), /all scene world arguments are required/)
  assert.throws(() => parseSceneWorldCli(['build', '--repo-root', '/tmp/repo', '--asset-index', '../assets.json', '--host-scenery', 'host.json', '--out', '/tmp/stage']), /stay within the repository/)
})
