import test from 'node:test'
import assert from 'node:assert/strict'
import { checkGlb, GLB_LIMITS } from '../glb.ts'
import { fitGround, photoMesh, PHOTO, type DepthMap } from './mesh.ts'
import { photoGlb } from './glb-write.ts'
import { exifFov } from './exif.ts'

/**
 * A room the model might have seen: a level camera at eye height, a floor, a back wall 6 m away, side walls 3 m either side, a
 * ceiling, and a box 1 m tall standing 3 m ahead. Its inverse depth, as the model answers it: an unknown scale and shift.
 */
function room(width = 160, height = 120, box = true): DepthMap {
  const aspect = width / height, tanHalf = Math.tan(((PHOTO.fovLong / 2) * Math.PI) / 180)
  const values = new Float32Array(width * height)
  for (let j = 0; j < height; j++) for (let i = 0; i < width; i++) {
    const dx = ((i + 0.5) / width * 2 - 1) * tanHalf, dy = -((j + 0.5) / height * 2 - 1) * (tanHalf / aspect)
    // Distance along -Z to the first surface the ray (dx, dy, -1) meets.
    let z = 6
    if (dy < 0) z = Math.min(z, PHOTO.eye / -dy)
    if (dy > 0) z = Math.min(z, 1.2 / dy)
    if (dx !== 0) z = Math.min(z, 3 / Math.abs(dx))
    if (box && Math.abs(dx * 3) < 0.5 && dy * 3 > -PHOTO.eye && dy * 3 < -PHOTO.eye + 1) z = Math.min(z, 3)
    values[j * width + i] = 7.3 / z + 0.4
  }
  return { values, width, height }
}

test('a plane is fitted through points of a plane', () => {
  const points: [number, number, number][] = []
  for (let i = 0; i < 40; i++) points.push([i % 7 - 3, -1.5 + 0.1 * (i % 7 - 3), -2 - (i % 5)])
  const fit = fitGround(points)!
  assert.ok(Math.abs(fit.a - 0.1) < 1e-6 && Math.abs(fit.b) < 1e-6 && Math.abs(fit.c + 1.5) < 1e-6)
})

test('a photo of a room becomes a level floor at eye height below the camera, with the back wall about where it was', () => {
  const mesh = photoMesh(room(), 160 / 120)
  assert.equal(mesh.ground, 'fitted')
  // The vertices of the bottom row are on the floor.
  const cols = PHOTO.grid, rows = Math.round(PHOTO.grid / (160 / 120))
  for (let q = 10; q < cols - 10; q += 20) {
    const y = mesh.positions[((rows - 1) * cols + q) * 3 + 1]!
    assert.ok(Math.abs(y - PHOTO.lift) < 0.12, `floor at ${y}`)
  }
  // The middle of the picture, above the box, is the back wall: 6 m, give or take the model's unknowns.
  const centre = (Math.round(rows * 0.35) * cols + Math.round(cols / 2)) * 3
  const z = -mesh.positions[centre + 2]!
  assert.ok(z > 4.5 && z < 7.5, `back wall at ${z} m`)
  assert.ok(mesh.triangles > 50_000 && mesh.triangles <= GLB_LIMITS.triangles, `${mesh.triangles} triangles`)
  assert.ok(mesh.max[2] <= 0.01 && mesh.min[2] > -PHOTO.far - 0.01)
})

test('the visitor starts on the nearest ground the photo shows, not on the unseen floor under the camera', () => {
  const mesh = photoMesh(room(), 160 / 120)
  // The bottom of a level 68° photo from eye height sees the floor about 3 m ahead.
  assert.ok(mesh.start[1] < -2.5 && mesh.start[1] > -4.5, `start at ${mesh.start[1]}`)
  assert.ok(Math.abs(mesh.start[0]) < 0.2)
})

test('a picture with no ground is taken as level, and nothing is further than the backdrop', () => {
  const values = new Float32Array(64 * 48)
  // Noise, the same every run.
  let seed = 7
  for (let i = 0; i < values.length; i++) { seed = (seed * 1103515245 + 12345) % 2147483648; values[i] = seed / 2147483648 }
  const mesh = photoMesh({ values, width: 64, height: 48 }, 0.75)
  assert.equal(mesh.ground, 'level')
  for (let i = 0; i < mesh.positions.length; i += 3) {
    assert.ok(Math.hypot(mesh.positions[i]!, mesh.positions[i + 1]! - PHOTO.eye - PHOTO.lift, mesh.positions[i + 2]!) <= PHOTO.far + 0.01)
  }
})

test('the file passes the upload check, names its solid root and its start, and is drawn unlit', () => {
  // The smallest JPEG header the check reads: 32 × 16 pixels.
  const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x10, 0x00, 0x20, 0x03, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1, 0xff, 0xd9])
  const mesh = photoMesh(room(), 160 / 120)
  const glb = photoGlb(mesh, jpeg)
  const checked = checkGlb(glb, GLB_LIMITS)
  assert.ok(checked.ok, checked.ok ? '' : checked.reason)
  assert.equal(checked.info.triangles, mesh.triangles + mesh.solid.indices.length / 3)
  const json = JSON.parse(new TextDecoder().decode(glb.subarray(20, 20 + new DataView(glb.buffer).getUint32(12, true)))) as { nodes: { name: string }[]; materials: { extensions: Record<string, unknown> }[] }
  assert.deepEqual(json.nodes.map((n) => n.name), ['allworld_solid', 'photo', 'allworld_spawn', 'allworld_collider'])
  assert.ok('KHR_materials_unlit' in json.materials[0]!.extensions)
})

test('a phone photo says how wide its lens saw; a picture without EXIF says nothing', () => {
  // SOI, APP1 Exif (little-endian TIFF): IFD0 with one entry pointing at the Exif IFD, which holds FocalLengthIn35mmFilm = 26.
  const tiff = [0x49, 0x49, 42, 0, 8, 0, 0, 0, 1, 0, 0x69, 0x87, 4, 0, 1, 0, 0, 0, 26, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0x05, 0xa4, 3, 0, 1, 0, 0, 0, 26, 0, 0, 0, 0, 0, 0, 0]
  const app1 = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff]
  const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe1, 0, app1.length + 2, ...app1, 0xff, 0xda, 0, 2])
  assert.ok(Math.abs(exifFov(jpeg)! - 69.4) < 0.2)
  assert.equal(exifFov(Uint8Array.from([0xff, 0xd8, 0xff, 0xda, 0, 2])), null)
  assert.equal(exifFov(Uint8Array.from([1, 2, 3])), null)
})

test('the ground is flat and left to the world; only what stands up blocks the way', () => {
  const values = room().values.map((v, i) => v * (1 + 0.01 * Math.sin(i * 12.9898)))
  const mesh = photoMesh({ values, width: 160, height: 120 }, 160 / 120)
  const ground = Math.fround(PHOTO.lift)
  let on = 0, near = 0, below = 0
  for (let k = 1; k < mesh.positions.length; k += 3) {
    const y = mesh.positions[k]!
    if (y === ground) on++
    else if (y < ground) below++
    else if (y - ground < PHOTO.flat - 0.01) near++
  }
  assert.ok(on > 5000, `${on} points on the ground`)
  assert.equal(near + below, 0, `${near} points just off the ground, ${below} under it`)
  // No blocking triangle lies flat on the ground; the walls and the box are there.
  const p = mesh.solid.positions, i = mesh.solid.indices
  assert.ok(i.length / 3 > 1000)
  for (let t = 0; t < i.length; t += 3) assert.ok([i[t]!, i[t + 1]!, i[t + 2]!].some((v) => p[v * 3 + 1] !== ground))
  // The model's lowest point is the world's ground (one unused point of the solid): its own ground stands just above it.
  assert.equal(mesh.min[1], ground)
  assert.equal(p[p.length - 2], 0)
})
