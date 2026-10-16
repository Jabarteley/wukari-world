import assert from 'node:assert/strict'
import { test } from 'node:test'
import { THREE } from './three/kit.ts'
import { CARTRIDGES } from './cartridges.ts'
import { CAR_R } from './race.ts'
import { ASSET_VERSIONS } from './asset-versions.generated.ts'
import { RACE_ASSETS, PHOTO_MS } from './race-3d.ts'
import {
  BARRIER_LAT, KERB_RED, PALETTES, SHOULDER_HALF, alongX, bandShift, boxMesh, buildRoad, chasePose, facingZ, fovFor, followSeat, lean, lineAlong, linear, motionOf, orbitPose,
  outsideSign, photoFinishPose, roadDistance, scatter, smoking, spinStep, startArea, steerAngle, windowOf, WHEEL_BASE_M, MAX_STEER,
} from './race-3d-geo.ts'
import type { Insets } from './race-3d-geo.ts'
import { buildTrack, nearestIndex, pointAt, project, ROAD_HALF, TRACK_IDS, WALL_HALF } from './race-track.ts'
import { BODY_UNITS, CAR_LENGTH_M, kmh, metresPerSecond, UNIT } from './race-units.ts'

// ---- units ----------------------------------------------------------------------------------------------------------------

test('units: a car is about 4 m long, the road about 18 m between its kerbs, and the quickest cars about 65 km/h', () => {
  assert.ok(Math.abs(CAR_LENGTH_M - 4) < 0.2, `car ${CAR_LENGTH_M} m`)
  assert.ok(BODY_UNITS >= 2 * CAR_R && BODY_UNITS <= 54, 'between the rules circle and the 2D drawing')
  assert.ok(Math.abs(2 * ROAD_HALF * UNIT - 18) < 1)
  assert.ok(kmh(9) > 55 && kmh(9) < 75, `top speed ${kmh(9)} km/h`)
  assert.equal(Math.round(metresPerSecond(5) * 10) / 10, 10)
  for (const id of TRACK_IDS) { const t = buildTrack(id); assert.ok(t.length * UNIT > 380 && t.length * UNIT < 700, `${id}: lap ${t.length * UNIT} m`) }
})

// ---- the road ------------------------------------------------------------------------------------------------------------------

test('the road ribbon is one mesh, within the triangle budget, whole and the same every time', () => {
  for (const id of TRACK_IDS) {
    const t = buildTrack(id), a = buildRoad(t), b = buildRoad(t)
    assert.ok(a.triangles > 1500 && a.triangles < 9000, `${id}: ${a.triangles} triangles`)
    assert.equal(a.positions.length, a.normals.length); assert.equal(a.positions.length, a.colors.length)
    assert.equal(a.indices.length, a.triangles * 3)
    const vertices = a.positions.length / 3
    for (const i of a.indices) assert.ok(i < vertices)
    for (const v of a.positions) assert.ok(Number.isFinite(v))
    assert.deepEqual(Array.from(a.positions), Array.from(b.positions))
  }
})
test('every quad faces the way it should: the road faces up, and every normal is a unit vector', () => {
  const t = buildTrack('lekki'), road = buildRoad(t)
  let up = 0
  for (let i = 0; i < road.normals.length; i += 3) {
    const n = Math.hypot(road.normals[i] as number, road.normals[i + 1] as number, road.normals[i + 2] as number)
    assert.ok(Math.abs(n - 1) < 1e-4)
    if ((road.normals[i + 1] as number) > 0.99) up++
  }
  assert.equal(up, road.normals.length / 3, 'a land track has no vertical faces')
  // And the triangle winding agrees with the normal (the face is not back-culled).
  const p = road.positions
  for (let k = 0; k < road.indices.length; k += 3 * 40) {
    const [a, b, c] = [road.indices[k], road.indices[k + 1], road.indices[k + 2]] as [number, number, number]
    const ux = (p[b * 3] as number) - (p[a * 3] as number), uz = (p[b * 3 + 2] as number) - (p[a * 3 + 2] as number), vx = (p[c * 3] as number) - (p[a * 3] as number), vz = (p[c * 3 + 2] as number) - (p[a * 3 + 2] as number)
    assert.ok(uz * vx - ux * vz > 0, 'counter-clockwise seen from above')
  }
})
test('the bridge has deck sides that face outwards; the land tracks have none', () => {
  const road = buildRoad(buildTrack('mainland'))
  let sideways = 0
  for (let i = 0; i < road.normals.length; i += 3) if (Math.abs(road.normals[i + 1] as number) < 0.1) sideways++
  assert.ok(sideways > 100)
  assert.equal(PALETTES.mainland.theme, 'bridge'); assert.equal(PALETTES.lekki.theme, 'land')
})
test('kerbs are on the outside of bends: a red vertex is on the side away from where the road turns', () => {
  assert.equal(outsideSign(0.01), -1); assert.equal(outsideSign(-0.01), 1)
  for (const id of TRACK_IDS) {
    const t = buildTrack(id), road = buildRoad(t), red = linear(0xd8352a)
    let found = 0
    for (let i = 0; i < road.colors.length; i += 3) {
      if (Math.abs((road.colors[i] as number) - red[0]) > 1e-4 || Math.abs((road.colors[i + 1] as number) - red[1]) > 1e-4 || Math.abs((road.colors[i + 2] as number) - red[2]) > 1e-4) continue
      const x = (road.positions[i] as number) / UNIT, y = (road.positions[i + 2] as number) / UNIT
      const pr = project(t, x, y, nearestIndex(t, x, y), -3, 3)
      assert.ok(pr.dist > ROAD_HALF - 1 && pr.dist < 103, `${id}: kerb ${pr.dist} from the centre line`)
      const turn = pointAt(t, pr.arc + 40, 0).a - pointAt(t, pr.arc - 40, 0).a
      const wrapped = Math.atan2(Math.sin(turn), Math.cos(turn))
      assert.equal(Math.sign(pr.off), outsideSign(wrapped), `${id}: kerb at arc ${Math.round(pr.arc)} is on the inside of its bend`)
      found++
    }
    assert.ok(found > 40, `${id}: only ${found} kerb vertices`)
    assert.ok(KERB_RED > 0)
  }
})
test('boxes make six faces each, the right way out', () => {
  const m = boxMesh([{ c: [0, 1, 0], s: [2, 2, 2], hex: 0xff0000 }])
  assert.equal(m.triangles, 12)
  for (let i = 0; i < m.positions.length; i += 3) {
    const out = (m.positions[i] as number) * (m.normals[i] as number) + ((m.positions[i + 1] as number) - 1) * (m.normals[i + 1] as number) + (m.positions[i + 2] as number) * (m.normals[i + 2] as number)
    assert.ok(out > 0.9, 'normal points away from the middle')
  }
})

// ---- what stands along it -----------------------------------------------------------------------------------------------------

test('barriers every 3 m on both edges; the same count each side; outside the rules wall', () => {
  const t = buildTrack('lekki'), left = lineAlong(t, 3, -BARRIER_LAT), right = lineAlong(t, 3, BARRIER_LAT)
  assert.equal(left.length, right.length)
  assert.ok(Math.abs(left.length - (t.length * UNIT) / 3) < 2)
  assert.ok(BARRIER_LAT > WALL_HALF && BARRIER_LAT < SHOULDER_HALF, 'on the shoulder, past the wall that bounces cars')
  for (const p of [left[5], right[9]] as const) assert.ok(Math.abs(roadDistance(t, (p?.x ?? 0) / UNIT, (p?.z ?? 0) / UNIT) - BARRIER_LAT) < 10)
})
test('scenery is the same every time, clear of the road, and keeps the start free', () => {
  const t = buildTrack('lekki'), a = scatter(t, 70, 11), b = scatter(t, 70, 11)
  assert.ok(a.length >= 60)
  assert.deepEqual(a, b)
  for (const p of a) {
    assert.ok(roadDistance(t, p.x / UNIT, p.z / UNIT) >= WALL_HALF + 44)
    assert.ok(!(Math.min(p.arc, t.length - p.arc) < 330 && Math.abs(p.lat) < 420), 'not among the stands')
  }
})
test('stands stand on one side of the start and the pits on the other, both beyond the barriers and (on the bridge) on the wider deck', () => {
  const t = buildTrack('mainland'), s = startArea(t)
  assert.ok(s.stands.length >= 4 && s.garages.length >= 3)
  assert.ok(s.stands.every((p) => p.lat > BARRIER_LAT) && s.garages.every((p) => p.lat < -BARRIER_LAT))
})
test('the stretch of barriers near an arc is picked with the lap wrapping round', () => {
  const arcs = Array.from({ length: 10 }, (_, i) => i * 100)
  assert.deepEqual(windowOf(arcs, 1000, 50, 120), [0, 1])
  assert.deepEqual(windowOf(arcs, 1000, 950, 120), [0, 9])
  assert.deepEqual(windowOf(arcs, 1000, 0, 120), [0, 1, 9])
})
test('the stalled vehicles are where the rules put them', () => {
  const t = buildTrack('mainland')
  assert.equal(t.obstacles.length, 6)
})

// ---- wheels and body --------------------------------------------------------------------------------------------------------

test('motion from two poses: along the heading is speed, across it is a slide, the turn of the heading is the yaw rate', () => {
  const along = motionOf({ x: 0, y: 0, a: 0 }, { x: 10, y: 0, a: 0 }, 0.1)
  assert.ok(Math.abs(along.speed - 10) < 1e-9 && Math.abs(along.slide) < 1e-9 && along.yawRate === 0) // 10 units = 1 m in 0.1 s
  const back = motionOf({ x: 0, y: 0, a: 0 }, { x: -10, y: 0, a: 0 }, 0.1)
  assert.ok(back.speed < 0, 'reversing is negative')
  const sideways = motionOf({ x: 0, y: 0, a: 0 }, { x: 0, y: 10, a: 0 }, 0.1)
  assert.ok(Math.abs(sideways.speed) < 1e-9 && sideways.slide > 9.9, 'down the screen is to the right of a car heading +x')
  const turning = motionOf({ x: 0, y: 0, a: 0 }, { x: 10, y: 0, a: 0.05 }, 0.1)
  assert.ok(turning.yawRate > 0.49 && turning.yawRate < 0.51)
  const wrap = motionOf({ x: 0, y: 0, a: Math.PI - 0.01 }, { x: 0, y: 0, a: -Math.PI + 0.01 }, 0.1)
  assert.ok(wrap.yawRate > 0 && wrap.yawRate < 0.3, 'across the +-pi seam is a small turn')
  assert.deepEqual(motionOf({ x: 0, y: 0, a: 0 }, { x: 5, y: 5, a: 1 }, 0), { speed: 0, slide: 0, yawRate: 0 })
})
test('front wheels steer into the turn, by the bicycle model, none when crawling, never past their stop', () => {
  assert.equal(steerAngle(0.5, 0.5), 0)
  const s = steerAngle(0.4, 12)
  assert.ok(Math.abs(s - Math.atan((WHEEL_BASE_M * 0.4) / 12)) < 1e-9)
  assert.ok(steerAngle(-0.4, 12) < 0)
  assert.equal(steerAngle(5, 3), MAX_STEER)
  assert.ok(steerAngle(0.4, -8) < 0, 'reversing swaps the wheels the other way')
})
test('a wheel rolls forward by speed over radius, and stays within a turn', () => {
  assert.ok(Math.abs(spinStep(0, 4.25, 0.1, 0.425) - 1) < 1e-9)
  assert.ok(spinStep(0, -4.25, 0.1, 0.425) < 0)
  const a = spinStep(6.2, 20, 0.5, 0.4)
  assert.ok(a >= -Math.PI * 2 && a < Math.PI * 2)
})
test('the body rolls out of a bend and noses down under braking', () => {
  assert.ok(lean(8, 0).roll < 0 && lean(-8, 0).roll > 0, 'a right turn (positive) leans left (negative roll about +z)')
  assert.ok(lean(0, -12).pitch > 0 && lean(0, 6).pitch < 0)
  assert.ok(Math.abs(lean(500, 500).roll) <= 0.12 && Math.abs(lean(-500, -500).pitch) <= 0.06)
  assert.deepEqual(lean(0, 0), { roll: -0, pitch: -0 })
})
test('tyre smoke on a slide at speed, or hard braking at speed; not when parked or driving straight', () => {
  assert.equal(smoking({ speed: 12, slide: 3, yawRate: 0.5 }, false), true)
  assert.equal(smoking({ speed: 2, slide: 3, yawRate: 0.5 }, false), false)
  assert.equal(smoking({ speed: 12, slide: 0.2, yawRate: 0 }, false), false)
  assert.equal(smoking({ speed: 14, slide: 0, yawRate: 0 }, true), true)
  assert.equal(smoking({ speed: 3, slide: 0, yawRate: 0 }, true), false)
})
test('the turns that point models along the road', () => {
  const a = 0.7, yaw = facingZ(a), yx = alongX(a)
  // A +z-facing model turned by yaw faces (cos a, sin a); a +x-long model turned by alongX runs along it.
  assert.ok(Math.abs(Math.sin(yaw) - Math.cos(a)) < 1e-12 && Math.abs(Math.cos(yaw) - Math.sin(a)) < 1e-12)
  assert.ok(Math.abs(Math.cos(yx) - Math.cos(a)) < 1e-12 && Math.abs(-Math.sin(yx) - Math.sin(a)) < 1e-12)
})

// ---- the camera -------------------------------------------------------------------------------------------------------------------

const PORTRAIT = { w: 390, h: 844, inset: { top: 150, bottom: 10, left: 0, right: 0 } as Insets }
const LANDSCAPE = { w: 844, h: 390, inset: { top: 64, bottom: 10, left: 170, right: 200 } as Insets }
const TINY = { w: 360, h: 740, inset: { top: 150, bottom: 10, left: 0, right: 0 } as Insets }
const WIDE = { w: 667, h: 375, inset: { top: 64, bottom: 10, left: 170, right: 200 } as Insets }
/** Where a scene point lands on screen (px) for the chase camera behind a car at the origin heading +x, as the view sets it up. */
function screenOf(screen: { w: number; h: number; inset: Insets }, speed: number, at: [number, number, number]): { x: number; y: number } {
  const pose = chasePose(0, 0, 0, speed, screen.w / screen.h)
  const camera = new THREE.PerspectiveCamera(pose.fov, screen.w / screen.h, 0.4, 500)
  const shift = bandShift(screen.w, screen.h, screen.inset)
  camera.setViewOffset(screen.w, screen.h, -shift.x, -shift.y, screen.w, screen.h)
  camera.position.set(...pose.pos); camera.lookAt(...pose.look); camera.updateProjectionMatrix(); camera.updateMatrixWorld(true)
  const p = new THREE.Vector3(...at).project(camera)
  return { x: ((p.x + 1) / 2) * screen.w, y: ((1 - p.y) / 2) * screen.h }
}
test('the chase camera sits behind and above the car, looks ahead, and pulls back and widens with speed', () => {
  const slow = chasePose(100, 50, 0, 0, 0.5), fast = chasePose(100, 50, 0, 18, 0.5)
  assert.ok(slow.pos[0] < 100 && slow.pos[1] > 2 && Math.abs(slow.pos[2] - 50) < 1e-9, 'behind (a car heading +x), above, in line')
  assert.ok(slow.look[0] > 100)
  assert.ok(fast.pos[0] < slow.pos[0] && fast.pos[1] > slow.pos[1] && fast.fov > slow.fov)
  const north = chasePose(0, 0, -Math.PI / 2, 5, 0.5)
  assert.ok(north.pos[2] > 5, 'a car heading up the screen has the camera below it')
  assert.ok(fovFor(0.46, 0) > fovFor(2.1, 0), 'wider on a tall phone')
  assert.ok(chasePose(0, 0, 0, 0, 0.5, 1).pos[0] < slow.pos[0], 'the countdown starts further back')
})
test('portrait and landscape: the car and the road ahead sit in the free band, clear of the HUD and the thumbs', () => {
  for (const screen of [PORTRAIT, TINY, LANDSCAPE, WIDE]) {
    for (const speed of [0, 8, 18]) {
      const car = screenOf(screen, speed, [0, 0.5, 0]), ahead = screenOf(screen, speed, [20, 0, 0]), far = screenOf(screen, speed, [60, 0, 0])
      const name = `${screen.w}x${screen.h} at ${speed} m/s`
      assert.ok(car.y >= screen.inset.top && car.y <= screen.h - screen.inset.bottom, `${name}: car at y ${Math.round(car.y)}`)
      assert.ok(car.x >= screen.inset.left && car.x <= screen.w - screen.inset.right, `${name}: car at x ${Math.round(car.x)}`)
      assert.ok(ahead.y < car.y && ahead.y >= screen.inset.top - 40, `${name}: the road 20 m ahead at y ${Math.round(ahead.y)}, car at ${Math.round(car.y)}`)
      assert.ok(far.y < ahead.y, `${name}: further road is higher`)
      assert.ok(car.y - ahead.y > 40, `${name}: the road ahead has room to be read`)
    }
  }
})
test('the picture slides to the middle of what the HUD and the thumbs leave', () => {
  assert.deepEqual(bandShift(390, 844, { top: 0, bottom: 0, left: 0, right: 0 }), { x: 0, y: 0 })
  const s = bandShift(844, 390, LANDSCAPE.inset)
  assert.equal(s.y, Math.round(64 + (390 - 74) / 2 - 195))
  assert.equal(s.x, Math.round(170 + (844 - 370) / 2 - 422))
  assert.ok(bandShift(390, 844, PORTRAIT.inset).y > 0, 'down, away from the HUD')
})
test('the photo finish is low and beside the line, looking at the car; the lobby orbit stays round the grid', () => {
  const t = buildTrack('lekki'), shot = photoFinishPose(t, 30, 10)
  assert.ok(shot.pos[1] < 1.5 && shot.pos[1] > 0.3 && shot.fov < 50)
  assert.ok(photoFinishPose(t, 30, 10, 0.46).fov > shot.fov, 'wider on a tall phone')
  assert.deepEqual(shot.look.slice(0, 1), [30])
  const line = pointAt(t, 0, 0)
  assert.ok(Math.hypot(shot.pos[0] - line.x * UNIT, shot.pos[2] - line.y * UNIT) > 8 && Math.hypot(shot.pos[0] - line.x * UNIT, shot.pos[2] - line.y * UNIT) < 20, 'a few metres from the road')
  const grid = pointAt(t, -130, 0)
  for (const sec of [0, 7, 30]) { const o = orbitPose(t, sec); assert.ok(Math.hypot(o.pos[0] - grid.x * UNIT, o.pos[2] - grid.y * UNIT) < 12 && o.pos[1] > 2) }
  assert.ok(PHOTO_MS > 1500 && PHOTO_MS < 4000)
})
test('a viewer follows the one they chose, else the leader', () => {
  assert.equal(followSeat(-1, 4, 2), 2); assert.equal(followSeat(3, 4, 2), 3); assert.equal(followSeat(7, 4, 2), 2)
})

// ---- assets -----------------------------------------------------------------------------------------------------------------------

test('every model the view loads has a content version and is listed in the cartridge manifest with its licence', () => {
  const race = CARTRIDGES.find((c) => c.id === 'race')
  assert.ok(race)
  const listed = new Set(race.manifest.assets.map((a) => a.path.replace(/^public/, '')))
  const urls = [...RACE_ASSETS.cars, RACE_ASSETS.barrier, RACE_ASSETS.fence, RACE_ASSETS.stand, RACE_ASSETS.garage, RACE_ASSETS.tree, RACE_ASSETS.treeSmall, RACE_ASSETS.lamp, RACE_ASSETS.flag]
  assert.equal(urls.length, race.manifest.assets.length, 'the manifest lists exactly what the view loads')
  for (const url of urls) {
    const [path, version] = url.split('?v=') as [string, string]
    assert.ok(listed.has(path), `${path} is in the manifest`)
    assert.ok(ASSET_VERSIONS[path] && version === ASSET_VERSIONS[path], `${path} has its content version`)
  }
  for (const a of race.manifest.assets) assert.equal(a.licence, 'CC0')
  assert.ok(race.manifest.lazy?.includes('race-3d'))
})
