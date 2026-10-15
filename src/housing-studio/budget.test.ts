import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { FURNITURE } from '../game/content/furniture.ts'
import { loadCityContent } from '../game/cities/registry.ts'
import { createLife } from '../life.ts'
import { createKit } from '../scene/kit.ts'
import { housingAssetManifest } from './asset-manifest.ts'
import { RECIPES, recipePlan } from './fixtures.ts'
import { buildHousingFurnishings } from './furnishings.ts'
import { buildHousingDoors } from './doors.ts'
import { buildHousingExterior } from './exterior.ts'
import { buildHousingInterior } from './interior.ts'
import { buildHousingShell, edge, STOREY } from './shell.ts'

const SCENERY_TRIANGLES = 15_000

// This mirrors the correspondence used by buildHousingFurnishings. Unsupported
// shapes intentionally remain procedural fallback geometry and contribute through
// the actual built group below.
const SHAPE_ASSETS: Readonly<Record<string, string>> = {
  sofa: 'two-seat-sofa', bed: 'single-bed', wardrobe: 'wardrobe', chair: 'dining-chair',
  desk: 'dining-table', tv: 'flat-panel-television', plant: 'broadleaf-planter',
  basin: 'knee-clearance-public-washbasin', fridge: 'display-fridge', cooker: 'four-burner-stove',
  floorlamp: 'floor-lamp',
}
const GLB_TRIANGLES = new Map<string, number>(housingAssetManifest.map((asset): [string, number] => [asset.id, asset.triangles]))

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
    triangles += object.geometry.index ? object.geometry.index.count / 3 : (object.geometry.attributes.position?.count ?? 0) / 3
  })
  return triangles
}

function expectedNearTriangles(recipe: typeof RECIPES[number], floor: number): number {
  return recipe.items.reduce((total, item) => {
    if ((item.floor ?? 0) !== floor) return total
    const definition = FURNITURE[item.itemId]
    if (!definition) return total
    const assetId = item.itemId === 'lounge-armchair' ? 'wood-armchair' : SHAPE_ASSETS[definition.shape]
    return total + (assetId ? GLB_TRIANGLES.get(assetId) ?? 0 : 0)
  }, 0)
}

function retainedHomeSceneryTriangles(home: ReturnType<typeof buildHousingInterior>): number {
  const ownedRoots = [home.assets.group, home.doors.group]
  let triangles = 0
  home.group.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || !visible(object, home.group)) return
    if (/^\d+:/.test(String(object.userData.part))) return
    for (let at: THREE.Object3D | null = object; at; at = at.parent) {
      if (at.name === 'avatar' || at.name.startsWith('home-people-') || ownedRoots.some((root) => at === root)) return
    }
    triangles += object.geometry.index ? object.geometry.index.count / 3 : (object.geometry.attributes.position?.count ?? 0) / 3
  })
  return triangles
}

function recipeTier(recipe: typeof RECIPES[number]): 'bq' | 'duplex' | 'bungalow' | 'villa' {
  return recipe.grid === 14 ? 'villa' : recipe.grid === 12 ? 'duplex' : recipe.grid === 10 ? 'bungalow' : 'bq'
}

function moveHomeToFloor(home: ReturnType<typeof buildHousingInterior>, recipe: typeof RECIPES[number], target: number): void {
  for (const flight of recipePlan(recipe).stairs.slice(home.floor, target)) {
    const point = (up: number) => ({
      x: edge(flight.x + (flight.dir === 1 ? up : 1 - up) * flight.w, recipe.grid),
      z: edge(flight.y + flight.h / 2, recipe.grid),
    })
    for (let step = 1; step <= 19; step += 1) {
      const at = point(step / 20)
      home.walk.move(at.x, home.walk.heightAt(at.x, at.z), at.z, Math.PI / 2)
    }
    const upper = point(1)
    home.walk.move(upper.x + flight.dir * 0.7, (flight.floor + 1) * STOREY + 0.03, upper.z, Math.PI / 2)
  }
  assert.equal(home.floor, target, `housing audit reached floor ${home.floor}, expected ${target}`)
}

test('every housing recipe stays inside the 15k scenery cap on each floor and visibility mode', async () => {
  for (const city of new Set(RECIPES.map((recipe) => recipe.city))) await loadCityContent(city)
  const receipts: string[] = []
  let maximum = { value: -1, label: '' }
  for (const recipe of RECIPES) {
    const kit = createKit()
    const shell = buildHousingShell(kit, recipe)
    const furnishings = buildHousingFurnishings(kit, recipe, () => {})
    const doors = buildHousingDoors(kit, recipe)
    const exteriorScene = buildHousingExterior(kit, recipe)
    let first = false, overview = false
    const homeKit = createKit()
    const home = buildHousingInterior(homeKit, recipe, () => first, () => {}, () => overview)
    try {
      const state = createLife({
        location: 'home',
        home: { custom: true, items: recipe.items },
        estate: { city: recipe.city, living: 'own', tier: recipeTier(recipe), style: recipe.style },
      }, { cityId: recipe.city, now: Date.UTC(2026, 9, 15, 11) })
      home.update(state)
      const floors = recipePlan(recipe).floors.length
      for (let floor = 0; floor < floors; floor += 1) {
        moveHomeToFloor(home, recipe, floor)
        for (const mode of ['third-person', 'first-person', 'overview', 'exterior'] as const) {
          const firstPerson = mode === 'first-person'
          overview = mode === 'overview'
          first = firstPerson
          const exterior = mode === 'exterior'
          let built: number
          if (exterior) {
            built = visibleTriangles(exteriorScene.group)
          } else {
            home.walk.goal(0, 0)
            home.refreshPresentation()
            shell.visible(floor, firstPerson, false, {x:20,z:20}, overview)
            furnishings.visible(floor, firstPerson)
            doors.visible(floor, firstPerson || !overview)
            built = visibleTriangles(shell.group) + visibleTriangles(furnishings.group) + visibleTriangles(doors.group)
          }
          const expectedGlb = exterior ? 0 : expectedNearTriangles(recipe, floor)
          const retainedHome = exterior ? 0 : retainedHomeSceneryTriangles(home)
          const conservative = built + expectedGlb + retainedHome
          const label = `${recipe.id}/floor-${floor}/${mode}`
          if (conservative > maximum.value) maximum = { value: conservative, label }
          receipts.push(`${label}=${conservative}`)
          assert.ok(conservative <= SCENERY_TRIANGLES,
            `${label}: ${conservative} scenery triangles (built=${built}, expectedGLB=${expectedGlb}, retainedHome=${retainedHome}); all=${receipts.join(', ')}`)
        }
      }
    } finally {
      exteriorScene.dispose?.()
      doors.dispose()
      furnishings.dispose()
      shell.dispose()
      kit.dispose()
      home.dispose()
      homeKit.dispose()
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }
  console.log(`housing budget max conservative scenery: ${maximum.value} (${maximum.label})`)
})
