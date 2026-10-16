import assert from 'node:assert/strict'
import { test } from 'node:test'
import { animationNames, glbChunks, glbImages, glbJson, imageSize, measure, parseGltf, rebuild, trianglesOf, wrapRoot, writeGlb } from './glb.ts'
import { fakePng, tinyGlb } from './fixtures.test-helper.ts'

test('a written .glb reads back with the same JSON and bytes', () => {
  const file = tinyGlb({ triangles: 4 })
  const doc = glbChunks(file)
  assert.equal(file.readUInt32LE(0), 0x46546c67)
  assert.equal(file.readUInt32LE(8), file.length)
  assert.equal(writeGlb(doc).equals(file), true)
})

test('triangles count every instance the scene draws, from the JSON alone', () => {
  assert.equal(trianglesOf(glbJson(tinyGlb({ triangles: 5 }))), 5)
  assert.equal(trianglesOf(glbJson(tinyGlb({ triangles: 5, meshNodes: ['a', 'b', 'c'] }))), 15)
  // A compressed file (whose fallback buffer has no bytes) is still counted: nothing is decoded.
  const json = glbJson(tinyGlb({ triangles: 7 }))
  json.extensionsUsed = ['EXT_meshopt_compression']
  json.buffers.push({ byteLength: 999, extensions: { EXT_meshopt_compression: { fallback: true } } })
  assert.equal(trianglesOf(json), 7)
})

test('the editor refuses a compressed file with a plain sentence instead of crashing on its empty buffer', () => {
  const doc = glbChunks(tinyGlb())
  doc.json.extensionsUsed = ['EXT_meshopt_compression']
  doc.json.buffers.push({ byteLength: 64 })
  assert.throws(() => parseGltf(writeGlb(doc)), /EXT_meshopt_compression is not supported .*already prepared/)
})

test('image sizes are read from PNG and WebP headers, and from images inside a .glb', () => {
  assert.deepEqual(imageSize(fakePng(512, 256)), [512, 256])
  const webp = Buffer.alloc(32)
  webp.write('RIFF', 0, 'ascii')
  webp.write('WEBP', 8, 'ascii')
  webp.write('VP8X', 12, 'ascii')
  webp.writeUIntLE(1023, 24, 3)
  webp.writeUIntLE(511, 27, 3)
  assert.deepEqual(imageSize(webp), [1024, 512])
  assert.throws(() => imageSize(Buffer.from('not an image at all, honestly')), /unreadable/)
  const [img] = glbImages(tinyGlb({ image: [2048, 1024] }))
  assert.equal(img!.width, 2048)
  assert.equal(img!.height, 1024)
})

test('rebuild keeps and renames only the named clips, and says which clips a file has when one is missing', () => {
  const src = parseGltf(tinyGlb({ clips: ['Unarmed_Idle', 'Hit_A', 'Sword_Slash'] }))
  const out = rebuild(src, { clips: { Unarmed_Idle: 'idle', Hit_A: 'hit' } })
  assert.deepEqual(animationNames(out).sort(), ['hit', 'idle'])
  assert.throws(() => rebuild(src, { clips: { Kick: 'kick' } }), /clip "Kick" is not in the file \(has: Unarmed_Idle, Hit_A, Sword_Slash\)/)
  assert.deepEqual(animationNames(rebuild(src)).sort(), ['Hit_A', 'Sword_Slash', 'Unarmed_Idle'])
})

test('keepMeshes drops the other meshes but keeps their nodes', () => {
  const src = parseGltf(tinyGlb({ triangles: 10, meshNodes: ['body', 'axe', 'hat'] }))
  const out = rebuild(src, { keepMeshes: ['body'] })
  assert.equal(trianglesOf(out.json), 10)
  assert.deepEqual(out.json.nodes.map((n: { name: string }) => n.name), ['root', 'body', 'axe', 'hat'])
  assert.throws(() => rebuild(src, { keepMeshes: ['cape'] }), /no mesh node "cape"/)
})

test('wrapRoot scales the whole scene to metres and turns a Z-up model upright', () => {
  const doc = parseGltf(tinyGlb({ size: 2 }))
  assert.deepEqual(measure(doc)?.size, [2, 2, 0])
  const scaled = wrapRoot(doc, 0.5, false)
  assert.deepEqual(measure(scaled)?.size.map((x) => Math.round(x * 1000) / 1000), [1, 1, 0])
  const upright = measure(wrapRoot(doc, 1, true))!.size.map((x) => Math.round(x * 1000) / 1000)
  assert.deepEqual(upright, [2, 0, 2])
})
