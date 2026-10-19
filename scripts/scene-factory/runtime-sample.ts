import { createHash } from 'node:crypto'
import { lstat, mkdtemp, readFile, realpath, rm } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { getHeapStatistics } from 'node:v8'
import { createServer, defaultClientConditions } from 'vite'
import type { Plugin, ViteDevServer } from 'vite'
import type { PreparedSceneBuild } from './build.ts'
import type { RecipeCityPack } from '../../src/scene/recipe/pack.ts'
import { shareMorphTextures, THREE_MODULE } from '../vite/three-shared-morphs.ts'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const CITY = 'accra'
const REGION = 'gulf-guinea'
const HERO_VENUE = 'accra-market-game'
const DEFAULT_PORT = 5355
const MIB = 1024 * 1024
const MAX_EFFECTIVE_HEAP = 640 * MIB
const MANIFEST_URL = '/__recipe-sample/manifest.json'
const PACK_URL = '/__recipe-sample/pack.json'
const SAMPLE_URL = '/src/scene/recipe/sample/index.html'
const VIRTUAL_PACK = 'virtual:recipe-sample-pack'
const RESOLVED_PACK = '\0recipe-sample-pack'
const RESOLVED_REGISTRY = '\0recipe-sample-registry'
const LOAD_MODULE = resolve(repoRoot, 'src/scene/recipe/load.ts').split('\\').join('/')
const CALIBRATION_SOURCE_PATHS = [
  'scripts/scene-factory/runtime-sample.ts',
  'scripts/vite/three-shared-morphs.ts',
  'src/scene/look.ts',
  'src/scene/recipe/measure-outer-host.ts',
  'src/scene/recipe/sample/index.html',
  'src/scene/recipe/sample/client.ts',
  'package-lock.json',
  'node_modules/three/package.json',
  'node_modules/three/build/three.module.js',
  'node_modules/three/src/renderers/webgl/WebGLBackground.js',
  'node_modules/three/src/renderers/WebGLRenderer.js',
] as const

type Mode = 'calibration' | 'scene'

export interface RuntimeSampleOptions {
  mode: Mode
  port: number
  candidateRoot?: string
}

interface FileReceipt {
  path: string
  bytes: number
  sha256: string
  value: Buffer
}

interface SceneSample {
  pack: RecipeCityPack
  packJson: string
  manifestReceipt: Record<string, unknown>
  assets: ReadonlyMap<string, FileReceipt>
}

interface RuntimeMetrics {
  requests: number
  transformedModules: number
  transformedHtml: number
  startupMs: number
}

interface BuildManifestReceipt {
  input: {
    brief: { sha256: string; inputSha256: string; contentSha256: string }
    hostScenery: { sha256: string; sourceFiles: readonly unknown[] }
    kit: { reportSha256: string }
    hero: { reportSha256: string }
    toolSourcesSha256: Record<string, string>
  }
}

function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex')
}

function cleanId(value: string): string {
  return value.replace(/[?#].*$/u, '').split('\\').join('/')
}

function parsePort(value: string): number {
  requireValue(/^\d{1,5}$/u.test(value), '--port must be an integer from 5355 to 65535')
  const port = Number(value)
  requireValue(Number.isSafeInteger(port) && port > 5354 && port <= 65535, '--port must be an integer from 5355 to 65535')
  return port
}

export function parseRuntimeSampleCli(argv: readonly string[]): RuntimeSampleOptions {
  const values = new Map<string, string>()
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index], value = argv[index + 1]
    requireValue(flag === '--mode' || flag === '--port' || flag === '--candidate', `unknown argument ${flag ?? ''}`)
    requireValue(value !== undefined && !value.startsWith('--'), `${flag} requires a value`)
    requireValue(!values.has(flag), `duplicate argument ${flag}`)
    values.set(flag, value)
  }
  const mode = values.get('--mode') ?? 'calibration'
  requireValue(mode === 'calibration' || mode === 'scene', '--mode must be calibration or scene')
  const candidate = values.get('--candidate')
  requireValue(mode !== 'scene' || candidate !== undefined, 'scene mode requires --candidate <complete-candidate-root>')
  requireValue(mode !== 'calibration' || candidate === undefined, 'calibration mode does not accept --candidate')
  return {
    mode,
    port: values.has('--port') ? parsePort(values.get('--port')!) : DEFAULT_PORT,
    ...(candidate === undefined ? {} : { candidateRoot: resolve(candidate) }),
  }
}

async function optionalText(path: string): Promise<string | null> {
  try { return await readFile(path, 'utf8') } catch { return null }
}

async function repositoryRevision(root: string): Promise<string> {
  const dotGit = join(root, '.git'), info = await lstat(dotGit)
  let gitDirectory = dotGit
  if (info.isFile()) {
    const pointer = (await readFile(dotGit, 'utf8')).trim()
    requireValue(pointer.startsWith('gitdir: '), '.git file has an unsupported format')
    gitDirectory = resolve(root, pointer.slice('gitdir: '.length))
  } else requireValue(info.isDirectory() && !info.isSymbolicLink(), '.git must be a directory or worktree pointer')
  const commonPointer = await optionalText(join(gitDirectory, 'commondir'))
  const commonDirectory = commonPointer === null ? gitDirectory : resolve(gitDirectory, commonPointer.trim())
  const head = (await readFile(join(gitDirectory, 'HEAD'), 'utf8')).trim()
  let revision = head
  if (head.startsWith('ref: ')) {
    const ref = head.slice('ref: '.length)
    requireValue(!isAbsolute(ref) && ref.split('/').every(part => part && part !== '.' && part !== '..'), 'HEAD ref is invalid')
    revision = (await optionalText(join(gitDirectory, ref)) ?? await optionalText(join(commonDirectory, ref)) ?? '').trim()
    if (!revision) {
      const packed = await optionalText(join(commonDirectory, 'packed-refs'))
      revision = packed?.split(/\r?\n/u).find(line => !line.startsWith('#') && line.endsWith(` ${ref}`))?.split(' ')[0] ?? ''
    }
  }
  requireValue(/^[a-f0-9]{40}$/u.test(revision), 'current source revision is unavailable')
  return revision
}

async function strictDirectory(path: string, label: string): Promise<string> {
  const exact = resolve(path), info = await lstat(exact)
  requireValue(info.isDirectory() && !info.isSymbolicLink(), `${label} must be a regular non-symlink directory`)
  return realpath(exact)
}

async function candidateFile(root: string, relativePath: string, maximum: number): Promise<FileReceipt> {
  const absolute = resolve(root, relativePath), back = relative(root, absolute)
  requireValue(back === relativePath || back.split('\\').join('/') === relativePath, `${relativePath} escapes the candidate root`)
  const parent = await lstat(dirname(absolute)), info = await lstat(absolute)
  requireValue(parent.isDirectory() && !parent.isSymbolicLink(), `${dirname(relativePath)} must be a regular non-symlink directory`)
  requireValue(info.isFile() && !info.isSymbolicLink() && info.size > 0 && info.size <= maximum, `${relativePath} must be a bounded regular non-symlink file`)
  const actual = await realpath(absolute), realBack = relative(root, actual)
  requireValue(realBack.length > 0 && !realBack.startsWith('..') && !isAbsolute(realBack), `${relativePath} resolves outside the candidate root`)
  const value = await readFile(absolute)
  requireValue(value.length === info.size, `${relativePath} changed while it was read`)
  return { path: relativePath, bytes: value.length, sha256: sha256(value), value }
}

async function calibrationSourcePins(): Promise<Record<string, { sha256: string; bytes: number }>> {
  const pins: Record<string, { sha256: string; bytes: number }> = {}
  for (const path of CALIBRATION_SOURCE_PATHS) {
    const absolute = resolve(repoRoot, path), info = await lstat(absolute), actual = await realpath(absolute)
    const back = relative(repoRoot, actual)
    requireValue(info.isFile() && !info.isSymbolicLink() && info.size > 0 && info.size <= 5 * MIB, `calibration source ${path} must be a bounded regular non-symlink file`)
    requireValue(back.length > 0 && !back.startsWith('..') && !isAbsolute(back), `calibration source ${path} resolves outside the repository`)
    const bytes = await readFile(absolute)
    requireValue(bytes.length === info.size, `calibration source ${path} changed while it was read`)
    pins[path] = { sha256: sha256(bytes), bytes: bytes.length }
  }
  return pins
}

function runtimePack(prepared: PreparedSceneBuild): RecipeCityPack {
  const kit = prepared.runtime.assets.kit, hero = prepared.runtime.assets.hero
  requireValue(prepared.city === CITY && prepared.runtime.region === REGION, 'prepared sample identity differs from Accra')
  requireValue(prepared.runtime.heroVenueId === HERO_VENUE && hero !== undefined, 'prepared sample hero target is incomplete')
  return {
    text: prepared.recipeText,
    metadata: {
      schema: 'allworld-recipe-runtime', version: 1, city: CITY, region: REGION,
      recipeSha256: prepared.recipeSha256, recipeBytes: Buffer.byteLength(prepared.recipeText),
      targetVenueIds: [...prepared.runtime.targetVenueIds],
      assets: {
        kit: { url: `/assets/scene-factory/kits/${REGION}-${kit.sha256}.glb`, measurement: kit },
        hero: { url: `/assets/scene-factory/heroes/${CITY}-${hero.sha256}.glb`, measurement: hero },
      },
      hostScenery: prepared.runtime.hostScenery,
    },
  }
}

async function prepareSceneSample(candidatePath: string, sourceRevision: string): Promise<SceneSample> {
  const root = await strictDirectory(candidatePath, 'candidate root')
  const [kitReport, heroReport, kitAsset, heroAsset] = await Promise.all([
    candidateFile(root, 'reports/gulf-guinea.json', 5 * MIB),
    candidateFile(root, 'reports/accra.json', 5 * MIB),
    candidateFile(root, 'final/gulf-guinea.glb', 2 * MIB),
    candidateFile(root, 'final/accra.glb', 60_000),
  ])
  const [{ extractCityBrief }, { prepareSceneBuild }] = await Promise.all([import('./facts.ts'), import('./build.ts')])
  const brief = await extractCityBrief({ cityId: CITY, region: REGION, repoRoot })
  const heroTarget = brief.venues.find(venue => venue.id === HERO_VENUE)
  requireValue(heroTarget?.name === 'Makola Market' && heroTarget.kind === 'market' && brief.targetVenueIds.includes(HERO_VENUE), 'sample hero target no longer identifies the actual Makola Market venue')
  requireValue(heroTarget.provenance.sourceIds.some(source => source.kind === 'osm' && source.value === 'node/7514623108'), 'sample Makola venue source identity changed')
  const briefText = `${JSON.stringify(brief, null, 2)}\n`
  const prepared = await prepareSceneBuild({
    briefText,
    briefLogicalPath: 'runtime-sample/briefs/accra.json',
    region: REGION,
    kitReportPath: resolve(root, kitReport.path),
    kitAssetPath: resolve(root, kitAsset.path),
    heroReportPath: resolve(root, heroReport.path),
    heroAssetPath: resolve(root, heroAsset.path),
    heroVenueId: HERO_VENUE,
    hostSceneryPath: resolve(repoRoot, 'scripts/scene-factory/host-scenery.json'),
    sourceRoot: repoRoot,
  })
  const buildManifest = JSON.parse(prepared.manifestText) as BuildManifestReceipt
  requireValue(buildManifest.input.kit.reportSha256 === kitReport.sha256 && buildManifest.input.hero.reportSha256 === heroReport.sha256, 'candidate reports changed during preparation')
  requireValue(prepared.runtime.assets.kit.sha256 === kitAsset.sha256 && prepared.runtime.assets.hero?.sha256 === heroAsset.sha256, 'candidate assets changed during preparation')
  const pack = runtimePack(prepared), packJson = `${JSON.stringify(pack)}\n`
  const kitUrl = pack.metadata.assets.kit.url, heroUrl = pack.metadata.assets.hero!.url
  return {
    pack,
    packJson,
    assets: new Map([[kitUrl, kitAsset], [heroUrl, heroAsset]]),
    manifestReceipt: {
      source: {
        revision: sourceRevision,
        brief: {
          sha256: sha256(briefText), inputSha256: brief.digests.inputSha256, contentSha256: brief.digests.contentSha256,
          files: brief.provenance.files, registrationFiles: brief.provenance.registrationFiles,
        },
        hostScenery: {
          sha256: buildManifest.input.hostScenery.sha256,
          validatedSourcePins: buildManifest.input.hostScenery.sourceFiles.length,
          boundary: 'consumed-canonical-unmodified',
          canonicalMutated: false,
        },
        toolSourcesSha256: buildManifest.input.toolSourcesSha256,
      },
      candidate: {
        kit: { report: kitReport.path, reportSha256: kitReport.sha256, file: kitAsset.path, sha256: kitAsset.sha256, bytes: kitAsset.bytes, url: kitUrl },
        hero: { report: heroReport.path, reportSha256: heroReport.sha256, file: heroAsset.path, sha256: heroAsset.sha256, bytes: heroAsset.bytes, url: heroUrl },
      },
      build: {
        city: prepared.city, region: prepared.runtime.region, heroVenueId: prepared.runtime.heroVenueId,
        heroTarget: { id: heroTarget.id, name: heroTarget.name, position: heroTarget.position, provenance: heroTarget.provenance, placementBasis: 'Actual named venue identity; original city-reference fragment, not surveyed stall geometry or exact geographic placement' },
        recipeCount: prepared.recipeCount, recipeSha256: prepared.recipeSha256, recipeBytes: Buffer.byteLength(prepared.recipeText),
        manifestSha256: prepared.manifestSha256, targetVenueIds: prepared.runtime.targetVenueIds,
      },
    },
  }
}

function morphTextureSharing(metrics: RuntimeMetrics): Plugin {
  return {
    name: 'allworld:sample-shared-morph-textures',
    enforce: 'pre',
    transform(code, id) {
      metrics.transformedModules += 1
      return THREE_MODULE.test(cleanId(id)) ? { code: shareMorphTextures(code), map: null } : null
    },
  }
}

function browserSystems(): Plugin {
  return {
    name: 'allworld:sample-browser-systems',
    enforce: 'pre',
    load(id) {
      return /\/src\/game\/profile\.ts$/u.test(cleanId(id)) ? 'export const PLAYS = false;\nexport const LEFT_OUT = {};\n' : null
    },
    async resolveId(source, importer, options) {
      if (!/systems\/index\.ts$/u.test(source)) return null
      const found = await this.resolve(source, importer, { ...options, skipSelf: true })
      return found && /\/src\/game\/systems\/index\.ts$/u.test(cleanId(found.id)) ? cleanId(found.id).replace(/index\.ts$/u, 'browser.ts') : null
    },
  }
}

function recipeRegistry(mode: Mode, pack: RecipeCityPack | null): Plugin {
  requireValue((mode === 'scene') === (pack !== null), 'scene mode and prepared pack must be present together')
  const registrySource = pack === null ? null : `import pack from ${JSON.stringify(VIRTUAL_PACK)};\nexport const RECIPE_CITY_LOADERS = Object.freeze({ accra: async () => ({ default: pack }) });\n`
  const packSource = pack === null ? null : `const pack = ${JSON.stringify(pack)};\nexport default pack;\n`
  return {
    name: 'allworld:sample-recipe-registry',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source === VIRTUAL_PACK) {
        requireValue(mode === 'scene', 'recipe sample pack is unavailable in calibration mode')
        return RESOLVED_PACK
      }
      if (source === './registry.generated.ts' && importer !== undefined && cleanId(importer) === LOAD_MODULE) {
        requireValue(mode === 'scene' && registrySource !== null, 'recipe registry is unavailable in calibration mode')
        return RESOLVED_REGISTRY
      }
      return null
    },
    load(id) {
      if (id === RESOLVED_REGISTRY) {
        requireValue(registrySource !== null, 'recipe registry is unavailable in calibration mode')
        return registrySource
      }
      if (id === RESOLVED_PACK) {
        requireValue(packSource !== null, 'recipe sample pack is unavailable')
        return packSource
      }
      return null
    },
  }
}

function responseHeaders(response: ServerResponse, contentType: string, cacheControl: string): void {
  response.setHeader('Content-Type', contentType)
  response.setHeader('Cache-Control', cacheControl)
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
}

function sendBody(request: IncomingMessage, response: ServerResponse, status: number, body: string | Buffer, contentType: string, cacheControl = 'no-store', etag?: string): void {
  const bytes = typeof body === 'string' ? Buffer.from(body) : body
  response.statusCode = status
  responseHeaders(response, contentType, cacheControl)
  response.setHeader('Content-Length', bytes.length)
  if (etag) response.setHeader('ETag', `"${etag}"`)
  if (etag && request.headers['if-none-match'] === `"${etag}"`) {
    response.statusCode = 304
    response.removeHeader('Content-Length')
    response.end()
    return
  }
  response.end(request.method === 'HEAD' ? undefined : bytes)
}

function dynamicManifest(options: RuntimeSampleOptions, revision: string, pins: Record<string, { sha256: string; bytes: number }>, scene: SceneSample | null, metrics: RuntimeMetrics, startedAt: string, heapLimitBytes: number): string {
  const receipt = scene?.manifestReceipt ?? {}
  const sceneSource = receipt.source !== null && typeof receipt.source === 'object' && !Array.isArray(receipt.source) ? receipt.source as Record<string, unknown> : {}
  const sceneReceipt = { ...receipt }
  delete sceneReceipt.source
  return `${JSON.stringify({
    schema: 'allworld-recipe-runtime-sample', version: 1, status: 'unapproved-sample', mode: options.mode,
    city: options.mode === 'scene' ? CITY : null, heroVenueId: options.mode === 'scene' ? HERO_VENUE : null,
    urls: { sample: SAMPLE_URL, manifest: MANIFEST_URL, pack: options.mode === 'scene' ? PACK_URL : null },
    source: { revision, calibrationPins: pins, ...sceneSource },
    ...sceneReceipt,
    bounded: {
      host: '127.0.0.1', port: options.port, strictPort: true, nodeOldSpaceRequestedMiB: 512, effectiveHeapLimitBytes: heapLimitBytes,
      configFile: false, envFile: false, dependencyDiscovery: false, dependencyPrebundle: false,
      watch: false, hmr: false, preTransformRequests: false, publicWrites: false,
    },
    runtime: {
      startedAt, startupMs: metrics.startupMs, uptimeMs: Math.round(process.uptime() * 1000),
      requests: metrics.requests, transformedModules: metrics.transformedModules, transformedHtml: metrics.transformedHtml,
      process: { pid: process.pid, parentPid: process.ppid, rssBytes: process.memoryUsage().rss, heapUsedBytes: process.memoryUsage().heapUsed },
      processTree: { rootPid: process.pid, childInspection: 'not-collected-without-an-external-process' },
    },
  }, null, 2)}\n`
}

function sampleRoutes(options: RuntimeSampleOptions, revision: string, pins: Record<string, { sha256: string; bytes: number }>, scene: SceneSample | null, metrics: RuntimeMetrics, startedAt: string, heapLimitBytes: number, htmlSource: string): Plugin {
  const htmlPaths = new Set(['/', '/src/scene/recipe/sample/', SAMPLE_URL])
  return {
    name: 'allworld:sample-routes',
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        metrics.requests += 1
        try {
          if (request.method !== 'GET' && request.method !== 'HEAD') {
            response.setHeader('Allow', 'GET, HEAD')
            sendBody(request, response, 405, 'Method Not Allowed\n', 'text/plain; charset=utf-8')
            return
          }
          const pathname = new URL(request.url ?? '/', `http://127.0.0.1:${options.port}`).pathname
          if (pathname === MANIFEST_URL) {
            sendBody(request, response, 200, dynamicManifest(options, revision, pins, scene, metrics, startedAt, heapLimitBytes), 'application/json; charset=utf-8')
            return
          }
          if (pathname === PACK_URL) {
            if (scene === null) sendBody(request, response, 404, 'Scene pack is unavailable in calibration mode.\n', 'text/plain; charset=utf-8')
            else sendBody(request, response, 200, scene.packJson, 'application/json; charset=utf-8', 'no-store', sha256(scene.packJson))
            return
          }
          const asset = scene?.assets.get(pathname)
          if (asset) {
            sendBody(request, response, 200, asset.value, 'model/gltf-binary', 'public, max-age=31536000, immutable', asset.sha256)
            return
          }
          if (htmlPaths.has(pathname)) {
            metrics.transformedHtml += 1
            const html = await server.transformIndexHtml(pathname, htmlSource)
            sendBody(request, response, 200, html, 'text/html; charset=utf-8')
            return
          }
          next()
        } catch (error) { next(error) }
      })
    },
  }
}

async function closeOwned(server: ViteDevServer | null, temporaryRoot: string | null): Promise<void> {
  try { await server?.close() }
  finally { if (temporaryRoot) await rm(temporaryRoot, { recursive: true, force: true }) }
}

export async function runRuntimeSample(options: RuntimeSampleOptions): Promise<void> {
  const start = process.hrtime.bigint(), startedAt = new Date().toISOString()
  const nodeFlags = `${process.env.NODE_OPTIONS ?? ''} ${process.execArgv.join(' ')}`
  const oldSpaceOptions = [...nodeFlags.matchAll(/(?:^|\s)--max-old-space-size(?:=|\s+)(\d+)(?=\s|$)/gu)].map(match => match[1])
  requireValue(oldSpaceOptions.length === 1 && oldSpaceOptions[0] === '512', 'start with exactly one effective --max-old-space-size=512 option and no conflicting override')
  requireValue(process.env.GOMAXPROCS === '2', 'start the bounded sample with GOMAXPROCS=2')
  const heapLimitBytes = getHeapStatistics().heap_size_limit
  requireValue(heapLimitBytes <= MAX_EFFECTIVE_HEAP, `effective V8 heap limit ${heapLimitBytes} exceeds the bounded sample limit; start with NODE_OPTIONS=--max-old-space-size=512`)
  requireValue(defaultClientConditions.includes('browser'), 'Vite client conditions no longer include browser')
  const revision = await repositoryRevision(repoRoot)
  const scene = options.mode === 'scene' ? await prepareSceneSample(options.candidateRoot!, revision) : null
  const htmlSource = await readFile(resolve(repoRoot, 'src/scene/recipe/sample/index.html'), 'utf8')
  const pins = await calibrationSourcePins()
  const metrics: RuntimeMetrics = { requests: 0, transformedModules: 0, transformedHtml: 0, startupMs: 0 }
  let temporaryRoot: string | null = null, server: ViteDevServer | null = null, closing: Promise<void> | null = null
  try {
    temporaryRoot = await mkdtemp(join(tmpdir(), 'allworld-recipe-sample-'))
    server = await createServer({
      configFile: false,
      envFile: false,
      root: repoRoot,
      publicDir: resolve(repoRoot, 'public'),
      cacheDir: join(temporaryRoot, 'vite-cache'),
      appType: 'custom',
      clearScreen: false,
      resolve: { conditions: [...defaultClientConditions] },
      optimizeDeps: { noDiscovery: true, include: [] },
      server: {
        host: '127.0.0.1', port: options.port, strictPort: true, hmr: false, ws: false,
        watch: null, preTransformRequests: false, open: false,
      },
      plugins: [
        sampleRoutes(options, revision, pins, scene, metrics, startedAt, heapLimitBytes, htmlSource),
        recipeRegistry(options.mode, scene?.pack ?? null),
        morphTextureSharing(metrics),
        browserSystems(),
      ],
    })
    await server.listen()
    metrics.startupMs = Number(process.hrtime.bigint() - start) / 1_000_000
    const shutdown = (): Promise<void> => closing ??= closeOwned(server, temporaryRoot)
    for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => {
      void shutdown().then(
        () => process.exit(0),
        error => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exit(1) },
      )
    })
    process.stdout.write(`${JSON.stringify({
      schema: 'allworld-recipe-runtime-sample-start', version: 1, status: 'unapproved-sample', mode: options.mode,
      address: `http://127.0.0.1:${options.port}${SAMPLE_URL}`, manifest: `http://127.0.0.1:${options.port}${MANIFEST_URL}`,
      pack: options.mode === 'scene' ? `http://127.0.0.1:${options.port}${PACK_URL}` : null,
      sourceRevision: revision, startupMs: metrics.startupMs,
    })}\n`)
  } catch (error) {
    await closeOwned(server, temporaryRoot)
    throw error
  }
}

export async function runRuntimeSampleCli(argv: readonly string[] = process.argv.slice(2)): Promise<void> {
  await runRuntimeSample(parseRuntimeSampleCli(argv))
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  runRuntimeSampleCli().catch(error => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
}
