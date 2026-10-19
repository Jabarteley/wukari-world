/**
 * OWNER: spaces
 * DEPTH ON THE PLAYER'S OWN DEVICE (docs/WORLDS.md, phase 8). The photo never leaves the device for this: Depth Anything V2 Small
 * (Apache-2.0) runs in the browser on onnxruntime-web (MIT), single-threaded WebAssembly. Both are fetched from this site, named
 * by their SHA-256 (server/spaces/depth.ts), only when a player makes a world from a photo: nothing of it is in the game's download.
 * The browser keeps them, so the second photo starts at once.
 */
import { photoMesh, type DepthMap, type PhotoMesh } from './mesh.ts'
import { photoGlb } from './glb-write.ts'
import { exifFov } from './exif.ts'

const BASE = '/api/spaces/depth/'
/** The model's input: the longer side, a multiple of the model's 14-pixel patches. */
const INPUT_LONG = 14 * 37
/** The photo drawn on the place: at most this many pixels on its longer side. */
const PICTURE_LONG = 2048
const MEAN = [0.485, 0.456, 0.406], STD = [0.229, 0.224, 0.225]

/** The parts of onnxruntime-web this uses. */
interface OrtTensor { data: Float32Array; dims: readonly number[] }
interface Ort {
  env: { wasm: { numThreads: number; wasmPaths: { wasm: string } | string; proxy: boolean } }
  Tensor: new (type: 'float32', data: Float32Array, dims: readonly number[]) => OrtTensor
  InferenceSession: { create(model: Uint8Array, options: { executionProviders: string[]; graphOptimizationLevel: string }): Promise<{ run(feeds: Record<string, OrtTensor>): Promise<Record<string, OrtTensor>>; release(): Promise<void> }> }
}

export type PhotoStep = { step: 'download'; done: number; total: number } | { step: 'depth' } | { step: 'build' }

/** A file of BASE, its bytes, telling `progress` how many have come. */
async function fetchBytes(name: string, progress: (done: number, total: number) => void): Promise<Uint8Array> {
  const response = await fetch(BASE + name, { credentials: 'same-origin' })
  if (!response.ok || !response.body) throw new PhotoError(response.status === 404 ? 'off' : 'download')
  const total = Number(response.headers.get('content-length')) || 0
  const reader = response.body.getReader(), parts: Uint8Array[] = []
  let done = 0
  for (;;) {
    const { value, done: end } = await reader.read()
    if (end) break
    parts.push(value); done += value.byteLength; progress(done, total)
  }
  const out = new Uint8Array(done)
  let at = 0
  for (const part of parts) { out.set(part, at); at += part.byteLength }
  return out
}

export class PhotoError extends Error {
  readonly code: 'off' | 'download' | 'memory' | 'picture'
  constructor(code: PhotoError['code']) { super(code); this.code = code }
}

let runtime: Promise<{ ort: Ort; session: Awaited<ReturnType<Ort['InferenceSession']['create']>> }> | null = null

/** The model, ready to run: downloaded once a visit (the browser keeps the files). */
function loadDepth(onStep: (step: PhotoStep) => void): NonNullable<typeof runtime> {
  runtime ??= (async () => {
    // The two big files with progress (the runtime fetches its WebAssembly itself, from the browser's cache by then).
    const sizes = { wasm: 14_239_897, model: 27_258_801 }, got = { wasm: 0, model: 0 }
    const report = (): void => onStep({ step: 'download', done: got.wasm + got.model, total: sizes.wasm + sizes.model })
    const [, model] = await Promise.all([
      fetchBytes('ort.wasm', (done) => { got.wasm = done; report() }),
      fetchBytes('depth.onnx', (done) => { got.model = done; report() }),
    ])
    const ort = await import(/* @vite-ignore */ `${BASE}ort.mjs`) as Ort
    ort.env.wasm.numThreads = 1
    ort.env.wasm.proxy = false
    ort.env.wasm.wasmPaths = { wasm: `${BASE}ort.wasm` }
    const session = await ort.InferenceSession.create(model, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' })
    return { ort, session }
  })()
  runtime.catch(() => { runtime = null })
  return runtime
}

/** The picture, upright as taken, drawn at most `long` pixels on its longer side (or exactly w × h). */
function draw(image: ImageBitmap, size: { w: number; h: number }): OffscreenCanvas | HTMLCanvasElement {
  const canvas = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(size.w, size.h) : Object.assign(document.createElement('canvas'), { width: size.w, height: size.h })
  const context = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
  if (!context) throw new PhotoError('memory')
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, 0, 0, size.w, size.h)
  return canvas
}

const fit = (w: number, h: number, long: number): { w: number; h: number } => {
  const k = Math.min(1, long / Math.max(w, h))
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) }
}

async function jpegOf(canvas: OffscreenCanvas | HTMLCanvasElement): Promise<Uint8Array> {
  const blob = 'convertToBlob' in canvas ? await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.86 })
    : await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.86))
  if (!blob) throw new PhotoError('memory')
  return new Uint8Array(await blob.arrayBuffer())
}

export interface PhotoPlace { glb: Uint8Array; mesh: Omit<PhotoMesh, 'positions' | 'uvs' | 'indices' | 'solid'>; aspect: number }

/** A photo, as a place to walk into: its depth, its surface and the .glb holding both. */
export async function photoPlace(file: Blob, onStep: (step: PhotoStep) => void): Promise<PhotoPlace> {
  let image: ImageBitmap
  try { image = await createImageBitmap(file, { imageOrientation: 'from-image' }) } catch { throw new PhotoError('picture') }
  try {
    const { ort, session } = await loadDepth(onStep)
    onStep({ step: 'depth' })
    const aspect = image.width / image.height
    // The model reads a picture whose sides are multiples of 14.
    const input = fit(image.width, image.height, INPUT_LONG)
    const w = Math.max(14, Math.round(input.w / 14) * 14), h = Math.max(14, Math.round(input.h / 14) * 14)
    const pixels = (draw(image, { w, h }).getContext('2d') as CanvasRenderingContext2D).getImageData(0, 0, w, h).data
    const tensor = new Float32Array(3 * w * h)
    for (let i = 0; i < w * h; i++) for (let c = 0; c < 3; c++) tensor[c * w * h + i] = (pixels[i * 4 + c]! / 255 - MEAN[c]!) / STD[c]!
    const output = (await session.run({ pixel_values: new ort.Tensor('float32', tensor, [1, 3, h, w]) }))['predicted_depth']
    if (!output) throw new PhotoError('memory')
    const dims = output.dims
    const depth: DepthMap = { values: output.data, width: dims[dims.length - 1]!, height: dims[dims.length - 2]! }
    onStep({ step: 'build' })
    // Let the progress line draw before the work.
    await new Promise((resolve) => setTimeout(resolve, 0))
    // The lens's angle, when the photo says (EXIF sits in the first few kilobytes).
    const fov = exifFov(new Uint8Array(await file.slice(0, 256 * 1024).arrayBuffer()))
    const mesh = photoMesh(depth, aspect, fov ?? undefined)
    const jpeg = await jpegOf(draw(image, fit(image.width, image.height, PICTURE_LONG)))
    const { positions: _p, uvs: _u, indices: _i, solid: _s, ...facts } = mesh
    return { glb: photoGlb(mesh, jpeg), mesh: facts, aspect }
  } catch (caught) {
    if (caught instanceof PhotoError) throw caught
    throw new PhotoError(caught instanceof RangeError ? 'memory' : 'download')
  } finally { image.close() }
}
