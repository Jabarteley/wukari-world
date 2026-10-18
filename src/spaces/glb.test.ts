import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { checkGlb, GLB_LIMITS, pictureSize } from './glb.ts'
import { makeGlb } from '../../server/testing/glb.ts'

/** One triangle (or `n` of them by count), positions from -1 to 1, optionally a PNG picture of w × h. */
function model(options: { triangles?: number; png?: [number, number]; json?: (g: Record<string, any>) => void } = {}): Uint8Array {
  const triangles = options.triangles ?? 1
  const bin = new Uint8Array(36 + (options.png ? 24 : 0))
  const g: Record<string, any> = {
    asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, translation: [0, 1, 0] }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    accessors: [{ bufferView: 0, componentType: 5126, count: triangles * 3, type: 'VEC3', min: [-1, -1, -0.5], max: [1, 1, 0.5] }],
    bufferViews: [{ buffer: 0, byteLength: 36 }], buffers: [{ byteLength: bin.length }],
  }
  if (options.png) {
    const view = new DataView(bin.buffer)
    view.setUint32(36, 0x89504e47); view.setUint32(40, 0x0d0a1a0a); view.setUint32(44, 13); view.setUint32(48, 0x49484452); view.setUint32(52, options.png[0]); view.setUint32(56, options.png[1])
    g['bufferViews'].push({ buffer: 0, byteOffset: 36, byteLength: 24 })
    g['images'] = [{ bufferView: 1, mimeType: 'image/png' }]
    g['textures'] = [{ source: 0 }]
  }
  options.json?.(g)
  return makeGlb(g, bin)
}

test('glb: real exported models pass, with their size in metres', () => {
  const dir = new URL('../housing-studio/assets/', import.meta.url)
  const files = readdirSync(dir).filter((name) => name.endsWith('.glb'))
  assert.ok(files.length >= 5)
  for (const name of files) {
    const result = checkGlb(new Uint8Array(readFileSync(new URL(name, dir))))
    assert.equal(result.ok, true, `${name}: ${result.ok ? '' : result.reason}`)
    if (result.ok) { assert.ok(result.info.triangles > 0); assert.ok(result.info.size.every((v) => v > 0 && v < 5), `${name} ${result.info.size}`) }
  }
  const packs = new URL('../../public/assets/packs/kaykit-adventurers/', import.meta.url)
  for (const name of readdirSync(packs).filter((n) => n.endsWith('.glb')).slice(0, 3)) {
    const result = checkGlb(new Uint8Array(readFileSync(new URL(name, packs))))
    assert.equal(result.ok, true, `${name}: ${result.ok ? '' : result.reason}`)
  }
})

test('glb: a small hand-made model is measured exactly', () => {
  const result = checkGlb(model({ png: [512, 256] }))
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.info.triangles, 1)
  assert.deepEqual(result.info.size, [2, 2, 1])
  assert.deepEqual(result.info.min, [-1, 0, -0.5])
  assert.equal(result.info.textures, 1)
  assert.equal(result.info.texturePx, 512)
})

test('glb: node transforms and reused meshes are counted as drawn', () => {
  const result = checkGlb(model({ json: (g) => { g.nodes = [{ children: [1, 2] }, { mesh: 0, scale: [2, 2, 2] }, { mesh: 0, translation: [10, 0, 0] }] } }))
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.info.triangles, 2)
  assert.deepEqual(result.info.size, [13, 4, 2])
})

const refused = (bytes: Uint8Array): string => { const r = checkGlb(bytes); assert.equal(r.ok, false); return r.ok ? '' : r.code }

test('glb: refuses what is not a self-contained glTF 2.0 binary', () => {
  assert.equal(refused(new TextEncoder().encode('{"asset":{"version":"2.0"}}')), 'not_glb')
  assert.equal(refused(makeGlb({ asset: { version: '2.0' } }, undefined, { version: 1 })), 'old_gltf')
  const whole = model()
  assert.equal(refused(whole.subarray(0, whole.length - 8)), 'cut_off')
  assert.equal(refused(model({ json: (g) => { g.buffers[0].uri = 'https://example.com/a.bin' } })), 'outside_file')
  assert.equal(refused(model({ json: (g) => { g.buffers.push({ byteLength: 4, uri: 'data:application/octet-stream;base64,AAAA' }) } })), 'outside_file')
  assert.equal(refused(model({ png: [8, 8], json: (g) => { g.images[0] = { uri: 'textures/a.png' } } })), 'outside_file')
  assert.equal(refused(model({ json: (g) => { g.bufferViews[0].byteLength = 4000 } })), 'cut_off')
  assert.equal(refused(makeGlb({ asset: { version: '1.0' } })), 'old_gltf')
})

test('glb: refuses extensions it cannot draw, naming the fix', () => {
  const draco = checkGlb(model({ json: (g) => { g.extensionsRequired = ['KHR_draco_mesh_compression'] } }))
  assert.equal(draco.ok, false)
  assert.match(draco.ok ? '' : draco.reason, /without Draco/)
  assert.equal(refused(model({ json: (g) => { g.extensionsRequired = ['KHR_texture_basisu'] } })), 'extension')
  assert.equal(refused(model({ json: (g) => { g.extensionsRequired = ['VENDOR_magic'] } })), 'extension')
  assert.equal(checkGlb(model({ json: (g) => { g.extensionsRequired = ['EXT_meshopt_compression', 'KHR_texture_transform'] } })).ok, true)
})

test('glb: limits on triangles, pictures and parts', () => {
  assert.equal(checkGlb(model({ triangles: GLB_LIMITS.triangles })).ok, true)
  assert.equal(refused(model({ triangles: GLB_LIMITS.triangles + 1 })), 'too_many_triangles')
  assert.equal(refused(model({ triangles: 50_000_000 })), 'too_many_triangles')
  assert.equal(refused(model({ png: [8192, 64] })), 'texture_too_large')
  assert.equal(refused(model({ png: [8, 8], json: (g) => { g.images[0].mimeType = 'image/gif' } })), 'texture_kind')
  assert.equal(refused(model({ png: [8, 8], json: (g) => { g.images[0].mimeType = 'image/jpeg' } })), 'texture_kind')
  assert.equal(refused(model({ png: [8, 8], json: (g) => { g.images = Array.from({ length: 17 }, () => g.images[0]) } })), 'too_many_textures')
  assert.equal(refused(model({ json: (g) => { g.nodes = Array.from({ length: GLB_LIMITS.nodes + 1 }, () => ({})) } })), 'too_complex')
  // Instanced copies count.
  assert.equal(refused(model({ triangles: 1000, json: (g) => {
    g.accessors.push({ bufferView: 0, componentType: 5126, count: 200, type: 'VEC3' })
    g.nodes[0].extensions = { EXT_mesh_gpu_instancing: { attributes: { TRANSLATION: 1 } } }
  } })), 'too_many_triangles')
})

test('glb: broken trees and empty files are refused, never thrown', () => {
  assert.equal(refused(model({ json: (g) => { g.nodes = [{ children: [1] }, { children: [0], mesh: 0 }] } })), 'unreadable')
  assert.equal(refused(model({ json: (g) => { g.nodes[0].mesh = 9 } })), 'unreadable')
  assert.equal(refused(model({ json: (g) => { g.meshes[0].primitives[0].attributes.POSITION = 7 } })), 'unreadable')
  assert.equal(refused(model({ json: (g) => { g.nodes = [{}] } })), 'empty')
  assert.equal(refused(model({ json: (g) => { g.accessors[0].min = [-1e6, 0, 0]; g.accessors[0].max = [1e6, 1, 1] } })), 'too_big_world')
  const junk = model(); junk[25] = 0xff
  assert.equal(checkGlb(junk).ok, false)
  assert.equal(refused(new Uint8Array(GLB_LIMITS.bytes + 1)), 'too_large')
  // Random bytes with the right magic never throw.
  for (let seed = 1; seed < 200; seed++) {
    const bytes = model({ png: [16, 16] })
    let s = seed
    for (let i = 0; i < 6; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; bytes[20 + (s % (bytes.length - 20))] = s & 0xff }
    assert.doesNotThrow(() => checkGlb(bytes))
  }
})

test('glb: picture sizes from headers', () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xc0, 0, 11, 8, 0x01, 0x00, 0x02, 0x00, 3, 0, 0, 0, 0])
  assert.deepEqual(pictureSize(jpeg, 'image/jpeg'), { w: 512, h: 256 })
  const webp = new Uint8Array(30); const v = new DataView(webp.buffer)
  v.setUint32(0, 0x52494646); v.setUint32(8, 0x57454250); webp.set([0x56, 0x50, 0x38, 0x58], 12); webp.set([0xff, 0x03, 0x00, 0x7f, 0x00, 0x00], 24)
  assert.deepEqual(pictureSize(webp, 'image/webp'), { w: 1024, h: 128 })
  assert.equal(pictureSize(new Uint8Array(30), 'image/png'), null)
})
