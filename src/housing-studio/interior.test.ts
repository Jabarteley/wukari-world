import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { FURNITURE } from '../game/content/furniture.ts'
import { loadCityContent } from '../game/cities/registry.ts'
import { footprint } from '../game/home-layout.ts'
import { bumpsOf } from '../game/home-plan.ts'
import { createLife } from '../life.ts'
import { createKit } from '../scene/kit.ts'
import type { WalkGrid, WalkPoint } from '../scene/walk-grid.ts'
import type { HousingDoor } from './doors.ts'
import { buildHousingInterior } from './interior.ts'
import { RECIPES, recipePlan } from './fixtures.ts'
import { edge, STOREY } from './shell.ts'

await loadCityContent('lagos')

const recipe = RECIPES[0]!

function visible(object: THREE.Object3D, root: THREE.Object3D): boolean {
  for (let at: THREE.Object3D | null = object; at; at = at.parent) {
    if (!at.visible) return false
    if (at === root) return true
  }
  return false
}

function visibleTriangles(root: THREE.Object3D): number {
  let triangles = 0
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || !visible(object, root)) return
    triangles += object.geometry.index ? object.geometry.index.count / 3 : object.geometry.attributes.position?.count / 3 || 0
  })
  return triangles
}

function reaches(grid: WalkGrid, start: WalkPoint, goal: WalkPoint): boolean {
  const target = grid.free(goal.x, goal.z) ? goal : grid.nearest(goal.x, goal.z)
  if (!target) return false
  const end = grid.path(start.x, start.z, target.x, target.z)?.at(-1)
  return Boolean(end && Math.hypot(end.x - target.x, end.z - target.z) < 0.01)
}

function everyRoomReachable(grid: WalkGrid, floor: number, start: WalkPoint): boolean {
  return recipePlan(recipe).floors[floor]!.every((room) => {
    for (let y = room.y + 0.5; y < room.y + room.h; y += 1) {
      for (let x = room.x + 0.5; x < room.x + room.w; x += 1) {
        const goal = { x: edge(x, recipe.grid), z: edge(y, recipe.grid) }
        if (grid.free(goal.x, goal.z) && reaches(grid, start, goal)) return true
      }
    }
    return false
  })
}

function toggleSafely(home: ReturnType<typeof buildHousingInterior>, door: HousingDoor): boolean {
  for (let step = 0; step < 24; step++) {
    const angle = step / 24 * Math.PI * 2, x = door.x + Math.cos(angle) * 1.85, z = door.z + Math.sin(angle) * 1.85
    if (home.doors.nearest(x, z, door.floor)?.id === door.id && home.doors.toggleNearest(x, z, door.floor)) return true
  }
  return false
}

test('actual housing interior preserves the Home host, culling and navigation contracts', async () => {
  const kit = createKit(), source = JSON.stringify(recipe.items)
  let first = false, overview = false, changed = 0
  const home = buildHousingInterior(kit, recipe, () => first, () => { changed += 1 }, () => overview)
  const parent = new THREE.Group()
  parent.add(home.group)
  const state = createLife({
    location: 'home',
    home: { custom: true, items: recipe.items },
    estate: { city: recipe.city, living: 'own', tier: 'duplex', style: recipe.style },
  }, { cityId: recipe.city, now: Date.UTC(2026, 9, 15, 11) })

  try {
    assert.equal(home.update(state), true)
    assert.equal(home.floors, 2)
    assert.equal(home.floor, 0)
    assert.equal(home.walk.open, false)
    assert.equal(home.homeDoor.direction, 'outside')
    assert.equal(home.objects().length, recipe.items.filter((item) => !FURNITURE[item.itemId]?.wall).length)

    const oldStatic: THREE.Object3D[] = [], shell: THREE.Mesh[] = []
    home.group.traverse((object) => {
      if (object.name.startsWith('home-room-') || object.name.startsWith('home-furniture-')) oldStatic.push(object)
      if (object instanceof THREE.Mesh && /^\d+:/.test(String(object.userData.part))) shell.push(object)
    })
    assert.ok(oldStatic.length > 0 && oldStatic.every((object) => !object.visible), 'the wrapper suppresses only the old static room and furniture batches')
    assert.ok(shell.length > 0)
    assert.ok(shell.some((mesh) => mesh.visible && String(mesh.userData.part).startsWith('0:floor')))
    assert.ok(shell.some((mesh) => mesh.visible && /0:inner/.test(String(mesh.userData.part))), 'normal third person preserves full-height room partitions')
    assert.ok(shell.every((mesh) => !mesh.visible || !/:ceiling/.test(String(mesh.userData.part))), 'third person lifts ceilings for visibility')
    overview = true
    home.refreshPresentation()
    assert.ok(shell.every((mesh) => !mesh.visible || !/:inner|:ceiling/.test(String(mesh.userData.part))), 'the explicit floor overview cuts away upper partitions')
    overview = false
    home.refreshPresentation()
    const frontLeaf = home.group.getObjectByName('home-door-leaf')!
    const playerBefore = home.walk.avatar.position.clone()
    assert.equal(home.frontDoor.open, false)
    assert.equal(home.frontDoor.toggle(), true)
    assert.equal(home.frontDoor.open, true)
    assert.equal(frontLeaf.rotation.y, -Math.PI / 2)
    home.look(-20, -20)
    home.update(state)
    assert.equal(frontLeaf.rotation.y, -Math.PI / 2, 'manual front door remains open across presentation refreshes')
    assert.ok(home.walk.avatar.position.equals(playerBefore), 'manual front door does not move the avatar')
    assert.equal(home.floor, 0)
    assert.equal(home.frontDoor.toggle(), true)
    assert.equal(frontLeaf.rotation.y, 0)
    home.look(20, 20)
    const shownOuter = () => shell.filter((mesh) => mesh.visible && /0:outer:/.test(String(mesh.userData.part))).map((mesh) => String(mesh.userData.part).split(':')[2]).sort()
    assert.deepEqual([...new Set(shownOuter())], ['back', 'left'], 'third person retains only the camera-far facade planes')
    home.look(-20, -20)
    assert.deepEqual([...new Set(shownOuter())], ['front', 'right'], 'orbiting swaps the retained facade planes')
    const wallArt = home.assets.group.children[0]!.children.filter((object) => object.userData.wall)
    assert.ok(wallArt.length > 0 && wallArt.every((object) => !object.visible), 'third person hides back-wall art when that wall is cut away')
    assert.ok(visibleTriangles(home.group) <= 15_000, 'third-person scenery remains inside the 15k budget')

    first = true
    home.refreshPresentation()
    assert.ok(shell.some((mesh) => mesh.visible && /0:(inner|ceiling)/.test(String(mesh.userData.part))), 'first person restores the current room enclosure')
    assert.deepEqual([...new Set(shownOuter())], ['back', 'front', 'left', 'right'], 'first person restores every outer wall')
    assert.ok(wallArt.every((object) => object.visible), 'first person restores mounted wall furnishings')
    assert.ok(shell.every((mesh) => !mesh.visible || !String(mesh.userData.part).startsWith('1:')), 'a floor above the player stays culled')
    assert.ok(visibleTriangles(home.group) <= 15_000, 'first-person scenery remains inside the 15k budget')

    const grid = home.walk.grid!
    for (const item of recipe.items.filter((item) => (item.floor ?? 0) === 0)) {
      const def = FURNITURE[item.itemId]
      if (!def || def.wall || def.shape === 'rug' || def.shape === 'mat') continue
      const size = footprint(def, item.rot)
      const x = edge(item.x + size.w / 2, recipe.grid), z = edge(item.y + size.h / 2, recipe.grid)
      assert.equal(grid.free(x, z), false, `${item.id}: furniture footprint should block movement`)
    }
    for (const wall of bumpsOf(recipePlan(recipe), 0)) {
      const x = edge((wall.x0 + wall.x1) / 2, recipe.grid), z = edge((wall.y0 + wall.y1) / 2, recipe.grid)
      assert.equal(grid.free(x, z), false, 'room wall should block movement outside its doorway')
    }
    const entrance = home.walk.entrance!
    assert.ok(everyRoomReachable(grid, 0, entrance), 'the furnished ground floor keeps a route into every room')

    const groundDoor = home.doors.doors.find((door) => door.floor === 0)!
    const crossings: [WalkPoint, WalkPoint][] = [
      [{ x: groundDoor.x - 0.5, z: groundDoor.z }, { x: groundDoor.x + 0.5, z: groundDoor.z }],
      [{ x: groundDoor.x, z: groundDoor.z - 0.5 }, { x: groundDoor.x, z: groundDoor.z + 0.5 }],
    ]
    const crossing = crossings.find(([from, to]) => grid.free(from.x, from.z) && grid.free(to.x, to.z) && grid.clearLine(from.x, from.z, to.x, to.z))
    assert.ok(crossing, 'known doorway should have a clear cross-leaf line while open')
    assert.equal(home.walk.grid, grid, 'the host keeps one stable wrapper-grid reference')
    assert.ok(toggleSafely(home, groundDoor))
    assert.equal(home.walk.grid, grid)
    assert.equal(grid.free(groundDoor.x, groundDoor.z), false, 'the held grid reference sees the closed door immediately')
    assert.equal(grid.clearLine(crossing![0].x, crossing![0].z, crossing![1].x, crossing![1].z), false)
    assert.equal(home.doors.toggleNearest(groundDoor.x, groundDoor.z, 0), true)
    assert.equal(grid.free(groundDoor.x, groundDoor.z), true, 'the held grid reference sees the reopened doorway')
    assert.equal(grid.clearLine(crossing![0].x, crossing![0].z, crossing![1].x, crossing![1].z), true)

    const upperDoor = home.doors.doors.find((door) => door.floor === 1)!
    const groundAtUpperDoor = grid.free(upperDoor.x, upperDoor.z)
    assert.ok(toggleSafely(home, upperDoor), 'an upper-floor door can change without replacing the host grid')
    assert.equal(grid.free(upperDoor.x, upperDoor.z), groundAtUpperDoor, 'the closed upper door does not change the active ground grid')

    const flight = recipePlan(recipe).stairs[0]!
    const point = (up: number) => ({
      x: edge(flight.x + (flight.dir === 1 ? up : 1 - up) * flight.w, recipe.grid),
      z: edge(flight.y + flight.h / 2, recipe.grid),
    })
    let prior = -Infinity
    for (let step = 1; step <= 19; step++) {
      const at = point(step / 20), y = home.walk.heightAt(at.x, at.z)
      assert.ok(y >= prior, `stair height should rise monotonically at step ${step}`)
      home.walk.move(at.x, y, at.z, Math.PI / 2)
      prior = y
    }
    const upper = point(1)
    home.walk.move(upper.x + flight.dir * 0.7, STOREY + 0.03, upper.z, Math.PI / 2)
    assert.equal(home.floor, 1)
    assert.equal(home.walk.grid, grid, 'floor transition preserves the stable wrapper-grid reference')
    assert.equal(grid.free(upperDoor.x, upperDoor.z), false, 'the same grid reference reprojects the closed upper-floor door')
    assert.equal(home.doors.toggleNearest(upperDoor.x, upperDoor.z, 1), true)
    assert.equal(grid.free(upperDoor.x, upperDoor.z), true)
    assert.ok(Math.abs(home.walk.heightAt(upper.x + flight.dir * 0.7, upper.z) - (STOREY + 0.03)) < 0.01)
    assert.ok(everyRoomReachable(home.walk.grid!, 1, { x: upper.x + flight.dir * 0.7, z: upper.z }), 'the upper landing reaches every upstairs room')

    prior = Infinity
    for (let step = 19; step >= 1; step--) {
      const at = point(step / 20), y = home.walk.heightAt(at.x, at.z)
      assert.ok(y <= prior, `stair height should fall monotonically at step ${step}`)
      home.walk.move(at.x, y, at.z, -Math.PI / 2)
      prior = y
    }
    const lower = point(0)
    home.walk.move(lower.x - flight.dir * 0.7, 0.03, lower.z, -Math.PI / 2)
    assert.equal(home.floor, 0)
    assert.equal(home.walk.grid, grid)
    assert.equal(grid.free(groundDoor.x, groundDoor.z), true, 'returning downstairs reprojects the reopened ground layer')
    assert.ok(Math.abs(home.walk.heightAt(lower.x - flight.dir * 0.7, lower.z) - 0.03) < 0.01)
    assert.equal(JSON.stringify(recipe.items), source, 'rendering and movement never mutate the recipe placements')
  } finally {
    const geometries = new Set<THREE.BufferGeometry>()
    home.group.traverse((object) => { if (object instanceof THREE.Mesh) geometries.add(object.geometry) })
    const disposed = new Set<THREE.BufferGeometry>()
    geometries.forEach((geometry) => geometry.addEventListener('dispose', () => disposed.add(geometry)))
    home.dispose()
    home.dispose()
    assert.equal(home.group.parent, null)
    kit.dispose()
    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.equal(disposed.size, geometries.size, 'scene and kit disposal release every geometry present at teardown')
    assert.equal(JSON.stringify(recipe.items), source)
    assert.ok(changed >= 0)
  }
})
