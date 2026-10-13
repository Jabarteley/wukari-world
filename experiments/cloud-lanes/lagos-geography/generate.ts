/** Bounded Node-only artifact writer/checker. Outputs stay in this lane; no network or runtime writes. */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { BASELINE } from './fixture.ts'
import { buildManifest, canonicalJson } from './manifest.ts'

const root = new URL('../../../', import.meta.url), lane = new URL('./', import.meta.url)
const sourcePaths = [
  'src/geo/frame.ts', 'src/map3d/geo/frame.ts', 'src/game/cities/lagos/map.ts', 'src/map3d/cities/lagos.ts',
  'src/map3d/geo/projection.ts', 'src/street/frame.ts', 'src/street/types.ts', 'src/street/renderer.ts', 'src/street/host.ts',
  'src/scene/street/street-plan.ts', 'src/game/neighbourhood-space.ts', 'src/scene/models/scene-models.ts',
  'src/scene/movement.ts', 'src/scene/body/skinned.ts',
].sort()
const hash = (value: string | Uint8Array): string => createHash('sha256').update(value).digest('hex')
const mode = process.argv.slice(2)
if (mode.length !== 1 || !['--write', '--check'].includes(mode[0]!)) throw new Error('Use generate.ts --write or --check')
// Pins are never silently refreshed: first generation creates them; every later run verifies them.
const sources = sourcePaths.map(path => { const bytes = readFileSync(new URL(path, root)); return { path, bytes: bytes.length, sha256: hash(bytes) } })
const pins = canonicalJson({ baseline: BASELINE, sources })
const pinsUrl = new URL('source-pins.json', lane)
let previousPins: string | undefined
try { previousPins = readFileSync(pinsUrl, 'utf8') } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
if (previousPins !== undefined && previousPins !== pins) throw new Error('Contract source drift: review against pinned baseline before regenerating')
const outputs = { 'source-pins.json': pins, 'sample-manifest.json': canonicalJson(buildManifest()) }
for (const [name, contents] of Object.entries(outputs)) {
  const path = new URL(name, lane)
  if (mode[0] === '--write') writeFileSync(path, contents)
  else if (readFileSync(path, 'utf8') !== contents) throw new Error(`Deterministic output mismatch: ${name}`)
  console.log(`${mode[0].slice(2)} ${fileURLToPath(path).split('/').at(-1)} bytes=${Buffer.byteLength(contents)} sha256=${hash(contents)}`)
}
