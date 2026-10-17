import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Object3D } from 'three'
import { preloadCanonicalBodies } from '../scene/body/skinned.ts'
import { preloadNativeStaticLod } from '../scene/body/native-static-lod.ts'

const root = fileURLToPath(new URL('../../', import.meta.url))
const origin = 'http://native-geometry.localhost/'

type GlobalKey = 'location' | 'self' | 'ProgressEvent' | 'fetch' | 'createImageBitmap' | 'document'

function replaceGlobal(key: GlobalKey, value: unknown): () => void {
  const before = Object.getOwnPropertyDescriptor(globalThis, key)
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  return () => {
    if (before) Object.defineProperty(globalThis, key, before)
    else delete (globalThis as unknown as Record<string, unknown>)[key]
  }
}

class GeometryImage {
  width = 1
  height = 1
  private readonly listeners = new Map<string, EventListener>()
  addEventListener(type: string, listener: EventListener): void { this.listeners.set(type, listener) }
  removeEventListener(type: string): void { this.listeners.delete(type) }
  set src(_value: string) { queueMicrotask(() => this.listeners.get('load')?.call(this, new Event('load'))) }
}

function geometryCanvas(tag: string) {
  if (tag !== 'canvas') throw new Error(`Unexpected geometry-test element ${tag}`)
  return {
    width: 1,
    height: 1,
    getContext: () => ({
      drawImage() {},
      getImageData: () => ({ data: new Uint8ClampedArray([128, 128, 128, 255]) }),
      putImageData() {},
    }),
  }
}

/** Install local-asset and image-decoding substitutes for geometry-only Node tests. */
export function installNativeGeometryEnvironment(): () => void {
  const originalFetch = globalThis.fetch
  const restore = [
    replaceGlobal('location', { href: origin }),
    replaceGlobal('self', globalThis),
    replaceGlobal('ProgressEvent', class extends Event {
      constructor(type: string, init: Record<string, unknown> = {}) { super(type); Object.assign(this, init) }
    }),
    replaceGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      const raw = String(input instanceof Request ? input.url : input)
      const url = new URL(raw, origin)
      if (url.protocol === 'file:' || url.hostname === 'native-geometry.localhost') {
        const filename = url.protocol === 'file:' ? fileURLToPath(url) : join(root, 'public', decodeURIComponent(url.pathname))
        try {
          const bytes = await readFile(filename)
          return new Response(new Uint8Array(bytes), { status: 200, headers: { 'Content-Type': filename.endsWith('.json') ? 'application/json' : 'application/octet-stream' } })
        } catch {
          return new Response('Missing local asset', { status: 404 })
        }
      }
      return originalFetch.call(globalThis, input, init)
    }),
    replaceGlobal('createImageBitmap', async () => ({ width: 1, height: 1, close() {} })),
    replaceGlobal('document', {
      createElementNS(_namespace: string, tag: string) { return tag === 'img' ? new GeometryImage() : geometryCanvas(tag) },
      createElement: geometryCanvas,
    }),
  ]
  return () => { for (const undo of restore.reverse()) undo() }
}

export function preloadNativeGeometry(): Promise<void> {
  return Promise.all([preloadCanonicalBodies(), preloadNativeStaticLod()]).then(() => undefined)
}

export interface NativeGeometryReadiness {
  errors: string[]
  nativeCharacters: number
  skinnedMeshes: number
  pendingCharacters: number
}

const pause = () => new Promise<void>(resolve => setTimeout(resolve, 0))

async function bounded(tasks: Promise<unknown>[], label: string): Promise<PromiseSettledResult<unknown>[]> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      Promise.allSettled(tasks),
      new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error(`${label}: native geometry readiness timed out`)), 10_000) }),
    ])
  } finally { if (timer) clearTimeout(timer) }
}

/** Await all native scene work and report real geometry before a budget measurement. */
export async function awaitNativeSceneGeometry(scene: { group: Object3D, walk: { avatar: Object3D } }, label: string): Promise<NativeGeometryReadiness> {
  const seen = new Set<Promise<unknown>>()
  const errors: string[] = []
  let idle = 0
  for (let cycle = 0; cycle < 32 && idle < 2; cycle += 1) {
    const tasks: Promise<unknown>[] = []
    scene.group.traverse(node => {
      const ready = node.userData.ready
      if (ready && typeof ready.then === 'function' && !seen.has(ready)) {
        seen.add(ready)
        tasks.push(ready)
      }
    })
    if (tasks.length) {
      idle = 0
      for (const result of await bounded(tasks, label)) if (result.status === 'rejected') errors.push(String(result.reason))
      const refresh = scene.group.userData.refreshCharacterCosts
      if (typeof refresh === 'function') refresh()
    } else {
      idle += 1
      await pause()
    }
  }

  let nativeCharacters = 0
  let pendingCharacters = 0
  scene.group.traverse(node => {
    if (node.userData.characterFoundation === 'native53') nativeCharacters += 1
    if (node.userData.characterStatus === 'loading') pendingCharacters += 1
    if (node.userData.characterError) errors.push(String(node.userData.characterError))
  })
  let skinnedMeshes = 0
  scene.walk.avatar.traverse(node => { if ((node as unknown as { isSkinnedMesh?: boolean }).isSkinnedMesh) skinnedMeshes += 1 })
  return { errors: [...new Set(errors)], nativeCharacters, skinnedMeshes, pendingCharacters }
}
