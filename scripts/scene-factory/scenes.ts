import { createHash, randomUUID } from 'node:crypto'
import type { Stats } from 'node:fs'
import { lstat, mkdir, open, readFile, readdir, realpath, rename, rm, unlink } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { prepareSceneWorld, type PreparedSceneWorld, type SceneWorldPlanOptions } from './world.ts'

const DEFAULT_REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const ASSET_INDEX = 'scripts/scene-factory/asset-index.json'
const HOST_SCENERY = 'scripts/scene-factory/host-scenery.json'
const WORLD_MANIFEST = 'scripts/scene-factory/generated/world-manifest.json'
const SHA256 = /^[a-f0-9]{64}$/u
const CITY = '[a-z][a-z0-9]*(?:-[a-z0-9]+)*'
const ALLOWED_FILE_PATTERNS = [
  new RegExp(`^src/scene/recipe/cities/${CITY}\\.ts$`, 'u'),
  /^src\/scene\/recipe\/registry\.generated\.ts$/u,
  new RegExp(`^public/assets/scene-factory/(?:kits|heroes)/${CITY}-[a-f0-9]{64}\\.glb$`, 'u'),
  new RegExp(`^scripts/scene-factory/generated/(?:briefs|recipes|manifests)/${CITY}\\.json$`, 'u'),
  /^scripts\/scene-factory\/generated\/world-manifest\.json$/u,
] as const
const SCAN_ROOTS = ['src/scene/recipe/cities', 'public/assets/scene-factory', 'scripts/scene-factory/generated'] as const
const ALLOWED_DIRECTORIES = new Set([
  'src/scene/recipe/cities',
  'public/assets/scene-factory', 'public/assets/scene-factory/kits', 'public/assets/scene-factory/heroes',
  'scripts/scene-factory/generated', 'scripts/scene-factory/generated/briefs', 'scripts/scene-factory/generated/recipes', 'scripts/scene-factory/generated/manifests',
])

type Command = 'build' | 'check'

export interface SceneInstallerOptions { command: Command; repoRoot: string }
export interface SceneInstallerDependencies {
  prepare: (options: SceneWorldPlanOptions) => Promise<PreparedSceneWorld>
  uniqueId: () => string
}
export interface SceneInstallerSummary {
  command: Command
  planned: number
  written: number
  deleted: number
  unchanged: number
  manifestSha256: string
}

interface PlannedFile { path: string; bytes: Buffer; sha256: string }
interface Snapshot { path: string; bytes: Buffer; sha256: string; size: number; dev: number; ino: number; mtimeMs: number }
interface ManifestOutput { path: string; sha256: string; bytes: number }
interface ValidatedPlan { files: Map<string, PlannedFile>; manifestSha256: string }

const DEFAULT_DEPENDENCIES: SceneInstallerDependencies = {
  prepare: options => prepareSceneWorld(options), uniqueId: randomUUID,
}

function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function sha256(value: Uint8Array | string): string {
  return createHash('sha256').update(value).digest('hex')
}

function isMissing(error: unknown): boolean {
  return error !== null && typeof error === 'object' && Reflect.get(error, 'code') === 'ENOENT'
}

function plainObject(value: unknown, label: string): Record<string, unknown> {
  requireValue(value !== null && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`)
  requireValue(Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null, `${label} must be a plain object`)
  return value as Record<string, unknown>
}

function ownedPath(value: unknown, label: string): string {
  requireValue(typeof value === 'string' && value.trim() === value && value.length > 0 && !isAbsolute(value) && !value.includes('\\'), `${label} must be a relative POSIX path`)
  requireValue(value.split('/').every(part => part.length > 0 && part !== '.' && part !== '..'), `${label} escapes the repository`)
  requireValue(ALLOWED_FILE_PATTERNS.some(pattern => pattern.test(value)), `${label} is outside the scene installer ownership boundary`)
  return value
}

function parseManifest(bytes: Buffer, label: string): Map<string, ManifestOutput> {
  let value: unknown
  try { value = JSON.parse(bytes.toString('utf8')) as unknown } catch { throw new Error(`${label} must contain valid JSON`) }
  const root = plainObject(value, label)
  requireValue(root.schema === 'allworld-scene-world-manifest' && root.version === 1, `${label} schema/version is unsupported`)
  requireValue(Array.isArray(root.outputs), `${label}.outputs must be an array`)
  const result = new Map<string, ManifestOutput>()
  for (const [index, input] of root.outputs.entries()) {
    const row = plainObject(input, `${label}.outputs[${index}]`)
    requireValue(Object.keys(row).length === 3 && Object.hasOwn(row, 'path') && Object.hasOwn(row, 'sha256') && Object.hasOwn(row, 'bytes'), `${label}.outputs[${index}] has unknown or missing fields`)
    const path = ownedPath(row.path, `${label}.outputs[${index}].path`)
    requireValue(path !== WORLD_MANIFEST, `${label} must not list itself as an output`)
    requireValue(typeof row.sha256 === 'string' && SHA256.test(row.sha256), `${label}.outputs[${index}].sha256 is invalid`)
    requireValue(typeof row.bytes === 'number' && Number.isSafeInteger(row.bytes) && row.bytes > 0, `${label}.outputs[${index}].bytes is invalid`)
    requireValue(!result.has(path), `${label} duplicates output ${path}`)
    result.set(path, { path, sha256: row.sha256, bytes: row.bytes })
  }
  return result
}

function validatePlan(input: PreparedSceneWorld): ValidatedPlan {
  requireValue(input !== null && typeof input === 'object' && Array.isArray(input.files), 'scene world plan is invalid')
  requireValue(typeof input.manifestSha256 === 'string' && SHA256.test(input.manifestSha256), 'scene world plan manifest hash is invalid')
  const files = new Map<string, PlannedFile>()
  for (const [index, file] of input.files.entries()) {
    requireValue(file !== null && typeof file === 'object', `scene world plan file ${index} is invalid`)
    const path = ownedPath(file.path, `scene world plan file ${index}.path`)
    requireValue(Buffer.isBuffer(file.bytes) && file.bytes.length > 0, `scene world plan file ${path} has invalid bytes`)
    requireValue(!files.has(path), `scene world plan duplicates ${path}`)
    const bytes = Buffer.from(file.bytes)
    files.set(path, { path, bytes, sha256: sha256(bytes) })
  }
  const manifest = files.get(WORLD_MANIFEST)
  requireValue(manifest !== undefined && manifest.sha256 === input.manifestSha256, 'scene world plan manifest bytes do not match its digest')
  const declared = parseManifest(manifest.bytes, 'planned world manifest')
  const expected = [...files.keys()].filter(path => path !== WORLD_MANIFEST).sort((a, b) => a.localeCompare(b, 'en'))
  const recorded = [...declared.keys()].sort((a, b) => a.localeCompare(b, 'en'))
  requireValue(expected.length === recorded.length && expected.every((path, index) => path === recorded[index]), 'planned world manifest output inventory differs from the plan')
  for (const path of expected) {
    const file = files.get(path)!, row = declared.get(path)!
    requireValue(row.sha256 === file.sha256 && row.bytes === file.bytes.length, `planned world manifest identity differs for ${path}`)
  }
  return { files, manifestSha256: input.manifestSha256 }
}

async function optionalLstat(path: string): Promise<Stats | null> {
  try { return await lstat(path) } catch (error) { if (isMissing(error)) return null; throw error }
}

async function assertSafeAncestors(repoRoot: string, path: string): Promise<void> {
  const root = resolve(repoRoot), rootInfo = await lstat(root)
  requireValue(rootInfo.isDirectory() && !rootInfo.isSymbolicLink(), 'repo root must be a regular directory')
  const rootReal = await realpath(root)
  const parts = path.split('/'), current: string[] = []
  for (let index = 0; index < parts.length; index++) {
    current.push(parts[index]!)
    const absolute = join(root, ...current), info = await optionalLstat(absolute)
    if (info === null) break
    requireValue(!info.isSymbolicLink(), `scene installer path has a symlink ancestor: ${current.join('/')}`)
    const resolved = await realpath(absolute), fromRoot = relative(rootReal, resolved)
    requireValue(fromRoot === '' || !fromRoot.startsWith('../') && fromRoot !== '..' && !isAbsolute(fromRoot), `scene installer path escapes the repository: ${current.join('/')}`)
    if (index < parts.length - 1) requireValue(info.isDirectory(), `scene installer ancestor is not a directory: ${current.join('/')}`)
  }
}

async function snapshot(path: string, relativePath: string): Promise<Snapshot> {
  const before = await lstat(path)
  requireValue(before.isFile() && !before.isSymbolicLink(), `owned scene output must be a regular file: ${relativePath}`)
  const bytes = await readFile(path), after = await lstat(path)
  requireValue(after.isFile() && !after.isSymbolicLink() && before.dev === after.dev && before.ino === after.ino && before.size === after.size && before.mtimeMs === after.mtimeMs, `owned scene output changed while it was read: ${relativePath}`)
  return { path: relativePath, bytes, sha256: sha256(bytes), size: bytes.length, dev: after.dev, ino: after.ino, mtimeMs: after.mtimeMs }
}

async function inventory(repoRoot: string): Promise<Map<string, Snapshot>> {
  const root = resolve(repoRoot), result = new Map<string, Snapshot>()
  const visit = async (relativeDirectory: string): Promise<void> => {
    await assertSafeAncestors(root, relativeDirectory)
    const absolute = join(root, ...relativeDirectory.split('/')), info = await optionalLstat(absolute)
    if (info === null) return
    requireValue(info.isDirectory() && !info.isSymbolicLink(), `owned scene root must be a regular directory: ${relativeDirectory}`)
    const entries = await readdir(absolute, { withFileTypes: true })
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      const path = `${relativeDirectory}/${entry.name}`
      requireValue(!entry.isSymbolicLink(), `owned scene inventory contains a symlink: ${path}`)
      if (entry.isDirectory()) {
        requireValue(ALLOWED_DIRECTORIES.has(path), `owned scene inventory contains an unknown directory: ${path}`)
        await visit(path)
      } else {
        requireValue(entry.isFile(), `owned scene inventory contains a non-file: ${path}`)
        ownedPath(path, 'installed scene output')
        result.set(path, await snapshot(join(root, ...path.split('/')), path))
      }
    }
  }
  for (const path of SCAN_ROOTS) await visit(path)
  const registryPath = 'src/scene/recipe/registry.generated.ts'
  await assertSafeAncestors(root, registryPath)
  const registryInfo = await optionalLstat(join(root, ...registryPath.split('/')))
  if (registryInfo !== null) result.set(registryPath, await snapshot(join(root, ...registryPath.split('/')), registryPath))
  return result
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && Buffer.from(left).equals(Buffer.from(right))
}

interface BuildPreflight { existing: Map<string, Snapshot>; obsolete: Snapshot[]; writes: PlannedFile[]; unchanged: number }

async function preflightBuild(repoRoot: string, plan: ValidatedPlan): Promise<BuildPreflight> {
  for (const path of plan.files.keys()) await assertSafeAncestors(repoRoot, path)
  const existing = await inventory(repoRoot), manifest = existing.get(WORLD_MANIFEST)
  const prior = manifest === undefined ? new Map<string, ManifestOutput>() : parseManifest(manifest.bytes, 'installed world manifest')
  const obsolete: Snapshot[] = [], writes: PlannedFile[] = []
  let unchanged = 0
  for (const [path, current] of existing) {
    if (path === WORLD_MANIFEST) continue
    const planned = plan.files.get(path)
    if (planned && equalBytes(current.bytes, planned.bytes)) { unchanged++; continue }
    const owned = prior.get(path)
    requireValue(owned !== undefined, `refusing foreign scene output before mutation: ${path}`)
    requireValue(owned.sha256 === current.sha256 && owned.bytes === current.size, `refusing tampered scene output before mutation: ${path}`)
    if (planned === undefined) obsolete.push(current)
  }
  for (const file of plan.files.values()) {
    const current = existing.get(file.path)
    if (current && equalBytes(current.bytes, file.bytes)) {
      if (file.path === WORLD_MANIFEST) unchanged++
      continue
    }
    if (file.path !== WORLD_MANIFEST && current === undefined) {
      // A missing file and a previously interrupted matching file are both safe to create.
    }
    if (file.path === WORLD_MANIFEST && current !== undefined) parseManifest(current.bytes, 'installed world manifest')
    writes.push(file)
  }
  return { existing, obsolete, writes, unchanged }
}

async function assertSnapshotUnchanged(repoRoot: string, path: string, previous: Snapshot | undefined): Promise<void> {
  const absolute = join(resolve(repoRoot), ...path.split('/')), info = await optionalLstat(absolute)
  if (previous === undefined) {
    requireValue(info === null, `scene output appeared after preflight: ${path}`)
    return
  }
  requireValue(info !== null && info.isFile() && !info.isSymbolicLink() && info.dev === previous.dev && info.ino === previous.ino && info.size === previous.size && info.mtimeMs === previous.mtimeMs, `scene output identity changed after preflight: ${path}`)
  requireValue(equalBytes(await readFile(absolute), previous.bytes), `scene output content changed after preflight: ${path}`)
}

async function cleanupOwnedTemp(path: string, identity: { dev: number; ino: number } | null): Promise<void> {
  if (identity === null) return
  const info = await optionalLstat(path)
  if (info && info.dev === identity.dev && info.ino === identity.ino && info.isFile() && !info.isSymbolicLink()) await rm(path, { force: true })
}

async function atomicWrite(repoRoot: string, file: PlannedFile, previous: Snapshot | undefined, uniqueId: () => string): Promise<void> {
  const root = resolve(repoRoot), target = join(root, ...file.path.split('/')), parent = dirname(target)
  await assertSafeAncestors(root, file.path)
  await mkdir(parent, { recursive: true })
  await assertSafeAncestors(root, file.path)
  const id = uniqueId()
  requireValue(typeof id === 'string' && /^[a-zA-Z0-9-]{8,128}$/u.test(id), 'scene installer unique ID is invalid')
  const temporary = join(parent, `.${file.path.split('/').at(-1)!}.scene-install-${id}`)
  let identity: { dev: number; ino: number } | null = null
  try {
    const handle = await open(temporary, 'wx', 0o644)
    try {
      const info = await handle.stat(); identity = { dev: info.dev, ino: info.ino }
      await handle.writeFile(file.bytes); await handle.sync()
    } finally { await handle.close() }
    requireValue(sha256(await readFile(temporary)) === file.sha256, `scene installer temporary write differs for ${file.path}`)
    await assertSnapshotUnchanged(root, file.path, previous)
    await assertSafeAncestors(root, file.path)
    await rename(temporary, target); identity = null
    const installed = await snapshot(target, file.path)
    requireValue(installed.sha256 === file.sha256 && installed.size === file.bytes.length, `installed scene output differs after rename: ${file.path}`)
  } finally { await cleanupOwnedTemp(temporary, identity) }
}

async function verifiedDelete(repoRoot: string, previous: Snapshot): Promise<void> {
  await assertSafeAncestors(repoRoot, previous.path)
  await assertSnapshotUnchanged(repoRoot, previous.path, previous)
  await unlink(join(resolve(repoRoot), ...previous.path.split('/')))
}

function rank(path: string): number {
  if (path.startsWith('public/assets/scene-factory/')) return 0
  if (path.startsWith('scripts/scene-factory/generated/') && path !== WORLD_MANIFEST) return 1
  if (path.startsWith('src/scene/recipe/cities/')) return 2
  if (path === 'src/scene/recipe/registry.generated.ts') return 3
  return 4
}

async function assertInstalledPlan(repoRoot: string, plan: ValidatedPlan, skipManifest = false): Promise<void> {
  const actual = await inventory(repoRoot)
  for (const [path, planned] of plan.files) {
    if (path === WORLD_MANIFEST && skipManifest) continue
    const current = actual.get(path)
    requireValue(current !== undefined && equalBytes(current.bytes, planned.bytes), `installed scene output is missing or differs: ${path}`)
  }
  for (const path of actual.keys()) {
    if (path === WORLD_MANIFEST && skipManifest) continue
    requireValue(plan.files.has(path), `installed scene inventory contains an obsolete or foreign output: ${path}`)
  }
}

export async function runSceneInstaller(options: SceneInstallerOptions, dependencies: SceneInstallerDependencies = DEFAULT_DEPENDENCIES): Promise<SceneInstallerSummary> {
  const repoRoot = resolve(options.repoRoot)
  const prepared = await dependencies.prepare({ repoRoot, assetIndexPath: ASSET_INDEX, hostSceneryPath: HOST_SCENERY })
  const plan = validatePlan(prepared)
  if (options.command === 'check') {
    await assertInstalledPlan(repoRoot, plan)
    return { command: 'check', planned: plan.files.size, written: 0, deleted: 0, unchanged: plan.files.size, manifestSha256: plan.manifestSha256 }
  }
  requireValue(options.command === 'build', 'scene installer command is invalid')
  const preflight = await preflightBuild(repoRoot, plan)
  const manifest = plan.files.get(WORLD_MANIFEST)!
  const writes = preflight.writes.filter(file => file.path !== WORLD_MANIFEST).sort((left, right) => rank(left.path) - rank(right.path) || left.path.localeCompare(right.path, 'en'))
  for (const file of writes) await atomicWrite(repoRoot, file, preflight.existing.get(file.path), dependencies.uniqueId)
  for (const file of preflight.obsolete.sort((a, b) => a.path.localeCompare(b.path, 'en'))) await verifiedDelete(repoRoot, file)
  await assertInstalledPlan(repoRoot, plan, true)
  const manifestNeedsWrite = !equalBytes(preflight.existing.get(WORLD_MANIFEST)?.bytes ?? Buffer.alloc(0), manifest.bytes)
  if (manifestNeedsWrite) await atomicWrite(repoRoot, manifest, preflight.existing.get(WORLD_MANIFEST), dependencies.uniqueId)
  await assertInstalledPlan(repoRoot, plan)
  return {
    command: 'build', planned: plan.files.size, written: writes.length + Number(manifestNeedsWrite), deleted: preflight.obsolete.length,
    unchanged: preflight.unchanged, manifestSha256: plan.manifestSha256,
  }
}

export function parseSceneInstallerCli(argv: readonly string[]): SceneInstallerOptions {
  const command = argv[0]
  requireValue(command === 'build' || command === 'check', 'usage: scenes.ts <build|check> [--repo-root <path>]')
  requireValue(argv.length === 1 || argv.length === 3 && argv[1] === '--repo-root' && typeof argv[2] === 'string' && argv[2].length > 0, 'usage: scenes.ts <build|check> [--repo-root <path>]')
  return { command, repoRoot: argv.length === 3 ? resolve(argv[2]!) : DEFAULT_REPO_ROOT }
}

export async function runSceneInstallerCli(argv: readonly string[] = process.argv.slice(2)): Promise<SceneInstallerSummary> {
  const summary = await runSceneInstaller(parseSceneInstallerCli(argv))
  process.stdout.write(`${JSON.stringify(summary)}\n`)
  return summary
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  runSceneInstallerCli().catch(error => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1 })
}
