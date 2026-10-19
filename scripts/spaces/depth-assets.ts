// The depth model's files for worlds from a photo (server/spaces/depth.ts; docs/WORLDS.md, phase 8): fetched from their
// publishers, checked against the SHA-256 the server pins, and stored where the server reads them.
//
//   node --experimental-strip-types scripts/spaces/depth-assets.ts --local .data       a local server's model folder (DATA_DIR/space-models)
//   node --experimental-strip-types scripts/spaces/depth-assets.ts --r2 allworld       the Worker's R2 bucket (keys glb/<sha256>), through wrangler
//                                                                                    (WRANGLER=<path to wrangler.js> to use a signed-in copy)
//   node --experimental-strip-types scripts/spaces/depth-assets.ts --operator https://joinallworld.com
//        through the game itself (POST /api/mod/spaces/depth/:name), with the operator token read from the file OPERATOR_ENV names
//        (MODERATOR_TOKEN=…; the file is parsed, never run, and the token never printed)
//
// Sources: onnxruntime-web 1.30.0 from the npm registry (MIT); Depth Anything V2 Small, onnx-community's quantized export, from
// Hugging Face (Apache-2.0). Downloads go to a fresh temporary folder; nothing from them is run here.
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { DEPTH_FILES, type DepthFile } from '../../server/spaces/depth.ts'

const ORT = 'https://registry.npmjs.org/onnxruntime-web/-/onnxruntime-web-1.30.0.tgz'
const MODEL = 'https://huggingface.co/onnx-community/depth-anything-v2-small/resolve/main/onnx/model_quantized.onnx'
const IN_TARBALL: Partial<Record<DepthFile, string>> = { 'ort.mjs': 'package/dist/ort.wasm.bundle.min.mjs', 'ort.wasm': 'package/dist/ort-wasm-simd-threaded.wasm' }

const [mode, target] = process.argv.slice(2)
if ((mode !== '--local' && mode !== '--r2' && mode !== '--operator') || !target) {
  console.error('Usage: depth-assets.ts --local <data dir> | --r2 <bucket> | --operator <origin>')
  process.exit(2)
}

async function download(url: string, path: string): Promise<void> {
  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`)
  writeFileSync(path, new Uint8Array(await response.arrayBuffer()))
}
const sha256 = (path: string): string => createHash('sha256').update(readFileSync(path)).digest('hex')

const work = mkdtempSync(join(tmpdir(), 'allworld-depth-'))
console.log(`Downloading into ${work}`)
await download(ORT, join(work, 'ort.tgz'))
const untar = spawnSync('tar', ['xzf', join(work, 'ort.tgz'), '-C', work, ...Object.values(IN_TARBALL)], { stdio: 'inherit' })
if (untar.status !== 0) throw new Error('Could not unpack onnxruntime-web')
await download(MODEL, join(work, 'depth.onnx'))

const files = (Object.keys(DEPTH_FILES) as DepthFile[]).map((name) => {
  const path = join(work, IN_TARBALL[name] ?? name), expected = DEPTH_FILES[name]
  const hash = sha256(path)
  if (hash !== expected.hash) throw new Error(`${name}: SHA-256 ${hash}, expected ${expected.hash}. Nothing was stored.`)
  return { name, path, ...expected }
})

for (const file of files) {
  if (mode === '--local') {
    const dir = join(resolve(target), 'space-models')
    mkdirSync(dir, { recursive: true })
    const to = join(dir, `${file.hash}.glb`)
    writeFileSync(`${to}.tmp`, readFileSync(file.path), { mode: 0o600 }); renameSync(`${to}.tmp`, to)
    console.log(`${file.name} -> ${to}`)
  } else if (mode === '--operator') {
    const env = readFileSync(process.env.OPERATOR_ENV ?? '', 'utf8')
    const token = /^\s*MODERATOR_TOKEN\s*=\s*['"]?([^'"\s]+)/m.exec(env)?.[1]
    if (!token) throw new Error('OPERATOR_ENV must name a file with MODERATOR_TOKEN=…')
    const response = await fetch(new URL(`/api/mod/spaces/depth/${file.name}`, target), { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream', 'User-Agent': 'allworld-operator' }, body: readFileSync(file.path) })
    const answer = await response.text()
    if (!response.ok) throw new Error(`${file.name}: HTTP ${response.status} ${answer.slice(0, 200)}`)
    console.log(`${file.name} -> ${target} (${answer.slice(0, 120)})`)
  } else {
    // WRANGLER=<path to wrangler.js> picks a signed-in copy; otherwise the one in deploy/tooling.
    const args = ['r2', 'object', 'put', `${target}/glb/${file.hash}`, `--file=${file.path}`, `--content-type=${file.type}`, '--remote']
    const put = process.env.WRANGLER ? spawnSync(process.execPath, [process.env.WRANGLER, ...args], { stdio: 'inherit' }) : spawnSync('npx', ['--prefix', 'deploy/tooling', 'wrangler', ...args], { stdio: 'inherit' })
    if (put.status !== 0) throw new Error(`${file.name}: wrangler r2 object put failed`)
    console.log(`${file.name} -> r2://${target}/glb/${file.hash}`)
  }
}
console.log('Done: the three depth files are in place.')
