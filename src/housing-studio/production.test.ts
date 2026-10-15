import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { buildHomeScene } from '../scene/home-scene.ts'
import type { VisitHomeProjection } from '../types/visit.ts'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { readFileSync } from 'node:fs'
import { PROJECTS } from '../game/content/projects.ts'
import { loadCityContent } from '../game/cities/registry.ts'
import { createLife } from '../life.ts'
import { createKit } from '../scene/kit.ts'
import { buildProductionHomeScene } from './production.ts'
import { productionHousingOf } from './production-mapping.ts'
import { RECIPES, recipePlan } from './fixtures.ts'
import { FURNITURE } from '../game/content/furniture.ts'
import { checkPlacement, plotOf } from '../game/home-layout.ts'
import { buildHousingDoors, type HousingDoor } from './doors.ts'
import { edge, STOREY } from './shell.ts'
import type { ProductionHomeScene } from './production.ts'

for (const city of ['lagos', 'abuja', 'kano']) await loadCityContent(city)

const tierOf = (grid: number) => grid === 8 ? 'bq' as const : grid === 10 ? 'bungalow' as const : grid === 12 ? 'duplex' as const : 'villa' as const
const stateOf = (recipe: typeof RECIPES[number]) => createLife({
  location: 'home', home: { custom: true, items: recipe.items },
  estate: { city: recipe.city, living: 'own', tier: tierOf(recipe.grid), style: recipe.style },
}, { cityId: recipe.city, now: Date.UTC(2026, 9, 15, 11) })

test('production mapping is a render-only view of supported authoritative homes', () => {
  for (const recipe of RECIPES) {
    const state = stateOf(recipe), before = JSON.stringify(state)
    const mapped = productionHousingOf(state)
    assert.equal(mapped?.grid, recipe.grid)
    assert.equal(mapped?.style, state.estate.style)
    assert.deepEqual(mapped?.items, state.home.items)
    assert.notEqual(mapped?.items, state.home.items)
    assert.equal(JSON.stringify(state), before)
  }
  const rented = stateOf(RECIPES[0]!)
  rented.estate.living = 'rent'
  assert.equal(productionHousingOf(rented), null)
  const elsewhere = stateOf(RECIPES[0]!)
  elsewhere.estate.city = 'kano'
  assert.equal(productionHousingOf(elsewhere), null)
})

test('all four saved-home tiers enrich while canonical objects, screens and Buy mode remain authoritative', () => {
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { hardwareConcurrency: 8, deviceMemory: 8, userAgent: 'Housing QA Node' } })
  Object.defineProperty(globalThis, 'window', { configurable: true, value: new EventTarget() })
  try {
    for (const recipe of RECIPES) {
      const kit = createKit(), state = stateOf(recipe), before = JSON.stringify(state)
      const home = buildProductionHomeScene(kit) as ReturnType<typeof buildProductionHomeScene> & { housing(): unknown }
      try {
        assert.equal(home.update(state), true)
        assert.ok(home.housing(), `${recipe.id} uses the enhanced renderer`)
        assert.deepEqual(home.objects().map((item) => item.id).sort(), state.home.items.filter((item) => item.itemId !== 'wall-art').map((item) => item.id).sort())
        assert.ok(home.screens().length > 0, 'canonical TV screen contract remains present')
        assert.equal(home.homeDoor.direction, 'outside')
        assert.equal(JSON.stringify(state), before, 'rendering does not mutate saved Home')
        globalThis.window?.dispatchEvent?.(new CustomEvent('jaw:mode', { detail: { mode: 'buy' } }))
        home.update(state)
        assert.equal(home.placing, true)
        globalThis.window?.dispatchEvent?.(new CustomEvent('jaw:mode', { detail: { mode: 'venue' } }))
      } finally { home.dispose(); kit.dispose() }
    }
  } finally {
    if (navigatorDescriptor) Object.defineProperty(globalThis, 'navigator', navigatorDescriptor)
    else Reflect.deleteProperty(globalThis, 'navigator')
    if (windowDescriptor) Object.defineProperty(globalThis, 'window', windowDescriptor)
    else Reflect.deleteProperty(globalThis, 'window')
  }
})


function environment(run: () => void, constrained = false): void {
  const previous = new Map(['navigator', 'window'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { hardwareConcurrency: constrained ? 2 : 8, deviceMemory: 8 } })
  Object.defineProperty(globalThis, 'window', { configurable: true, value: new EventTarget() })
  try { run() } finally {
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else Reflect.deleteProperty(globalThis, key)
    }
  }
}

function visibleMeshSignature(root: THREE.Object3D): string[] {
  const rows: string[] = []
  root.traverseVisible(object => { if (object instanceof THREE.Mesh) rows.push(`${object.name}:${object.geometry.index?.count ?? object.geometry.getAttribute('position')?.count}`) })
  return rows.sort()
}

test('enhanced saved furniture remains pickable through the real plinth camera binding and emits canonical actions', () => environment(() => {
  const state = stateOf(RECIPES[0]!), kit = createKit(), home = buildProductionHomeScene(kit)
  try {
    home.update(state)
    const sofa = home.objects().find(item => item.itemId === 'family-sofa')!
    const camera = new THREE.PerspectiveCamera(45, 1, .1, 300)
    const point = home.group.localToWorld(new THREE.Vector3(sofa.x, sofa.y + .55, sofa.z))
    camera.position.copy(point).add(new THREE.Vector3(0, 9, 8)); camera.lookAt(point); camera.updateMatrixWorld()
    const canvas = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 1000 }), addEventListener() {}, removeEventListener() {} }
    let bound = false
    home.group.traverse(object => {
      if (object instanceof THREE.Mesh && object.position.y === -.21) {
        assert.equal(object.visible, true, 'plinth remains drawn with enriched shell')
        Reflect.apply(object.onBeforeRender, object, [{ domElement: canvas }, new THREE.Scene(), camera])
        bound = true
      }
    })
    assert.ok(bound)
    assert.equal(home.pickAt(500, 500)?.id, sofa.id)
    let selected: unknown
    const pick = (event: Event) => { selected = (event as CustomEvent).detail }
    window.addEventListener('jaw:home-pick', pick)
    home.use(sofa.id, null)
    assert.deepEqual(selected, { id: sofa.id, cell: null })
    window.removeEventListener('jaw:home-pick', pick)
    const position = home.walk.avatar.position.clone()
    assert.equal(home.frontDoor.toggle(), true)
    home.update(state)
    assert.ok(home.walk.avatar.position.equals(position))
    assert.equal(home.frontDoor.open, true)
    assert.equal(home.frontDoor.toggle(), true)
    assert.equal(home.frontDoor.open, false)
  } finally { home.dispose(); kit.dispose() }
}))

test('live saved layout, Buy ghost and kept achievements survive layer changes without modifying state', () => environment(() => {
  const state = stateOf(RECIPES[0]!), kit = createKit(), home = buildProductionHomeScene(kit)
  try {
    home.update(state)
    const layer = home.housing(), grid = home.walk.grid, solids = home.walk.solids
    home.update(state)
    assert.equal(home.housing(), layer)
    assert.equal(home.walk.solids, solids, 'unchanged state has stable occluder identity')
    state.achievements.earned['home-maker'] = { id: 'home-maker', version: 1, earnedAt: state.t, cityId: 'lagos', origins: ['human'] }
    state.achievements.displayed = 'home-maker'
    const project = PROJECTS[0]!
    state.projects.mementos[project.id] = { id: project.id, occurrence: project.occurrence, title: project.memento, earnedAt: state.t, cityId: 'lagos', origins: ['human'] }
    const next = { ...state, home: { ...state.home, items: state.home.items.filter(item => item.itemId !== 'lounge-armchair') } }
    const before = JSON.stringify(next)
    home.update(next)
    assert.notEqual(home.housing(), layer)
    assert.equal(home.walk.grid, grid)
    assert.equal(home.objects().some(item => item.itemId === 'lounge-armchair'), false)
    assert.ok(home.tags().some(tag => tag.kind === 'achievement'))
    assert.ok(home.tags().some(tag => tag.id === 'home-mementos'))
    window.dispatchEvent(new CustomEvent('jaw:home-ui', { detail: { selected: state.home.items[0]!.id, buy: true, floor: 1, ghost: { itemId: 'plastic-chair', x: 1, y: 1, rot: 0, floor: 1, valid: true } } }))
    home.update(next)
    assert.equal(home.placing, true)
    assert.equal(home.floor, 1)
    assert.equal(home.housing()?.shell.group.visible, false)
    const room: THREE.Object3D[] = []
    home.group.traverse(object => { if (object.name.startsWith('home-room-')) room.push(object) })
    assert.ok(room.some(object => object.visible), 'canonical Buy geometry restored')
    window.dispatchEvent(new CustomEvent('jaw:home-ui', { detail: { selected: null, buy: false, ghost: null } }))
    home.update(next)
    assert.equal(home.placing, false)
    assert.equal(home.housing()?.shell.group.visible, true)
    assert.equal(JSON.stringify(next), before)
  } finally { home.dispose(); home.dispose(); kit.dispose() }
}))

test('rental, starter, unsupported city, visitor and constrained-device paths retain canonical Home', () => {
  environment(() => {
    for (const variant of ['rent', 'starter', 'city', 'story'] as const) {
      const state = stateOf(RECIPES[0]!)
      if (variant === 'rent') state.estate.living = 'rent'
      if (variant === 'starter') state.estate.tier = 'starter'
      if (variant === 'city') state.estate.city = 'kano'
      if (variant === 'story') state.stories.running = { sceneId: 'story1', revision: 1, step: 0, startedAt: state.t, content: { title: 'Local test scene', description: '', items: state.home.items.slice(0, 1), moments: [{ title: 'Beginning', prompt: 'Look around' }] } }
      const kit = createKit(), canonicalKit = createKit(), home = buildProductionHomeScene(kit), canonical = buildHomeScene(canonicalKit)
      try {
        home.update(state); canonical.update(state)
        assert.equal(home.housing(), null)
        assert.deepEqual(visibleMeshSignature(home.group), visibleMeshSignature(canonical.group))
        assert.deepEqual(home.objects(), canonical.objects())
        assert.deepEqual(home.screens(), canonical.screens())
      } finally { home.dispose(); canonical.dispose(); kit.dispose(); canonicalKit.dispose() }
    }
    const recipe = RECIPES[0]!, state = stateOf(recipe)
    const visit: VisitHomeProjection = { host: { id: 'local-visitor-host', name: 'Local QA host' }, city: 'lagos', plot: null, grid: recipe.grid, owned: true, style: recipe.style, items: recipe.items }
    const kit = createKit(), home = buildProductionHomeScene(kit, { visit })
    try { home.update(state); assert.equal('housing' in home, false); assert.equal(home.floors, 2) } finally { home.dispose(); kit.dispose() }
  })
  environment(() => {
    const kit = createKit(), home = buildProductionHomeScene(kit)
    try { home.update(stateOf(RECIPES[0]!)); assert.equal(home.housing(), null) } finally { home.dispose(); kit.dispose() }
  }, true)
})


test('real decoded assets use compact production meshes and unsupported materials restore canonical Home', async () => {
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { hardwareConcurrency: 8, deviceMemory: 8, userAgent: 'Housing QA Node' } })
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
  try {
    for (const recipe of RECIPES) {
      const kit = createKit(), home = buildProductionHomeScene(kit, { decodeAsset: async entry => {
        const bytes = readFileSync(new URL(entry.url))
        return (await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')).scene
      } })
      assert.ok('housing' in home)
      try {
        home.update(stateOf(recipe))
        const layer = home.housing()!
        assert.ok(layer)
        await layer.furnishings.ready
        assert.equal(layer.furnishings.failures.length, 0, `${recipe.id}: ${layer.furnishings.failures.join(',')}`)
        assert.ok(layer.furnishings.loaded > 0)
        assert.equal(home.housing(), layer)
        for (let floor = 0; floor < home.floors; floor++) {
          layer.shell.visible(floor, true, false, { x: 20, z: 20 })
          layer.furnishings.visible(floor, true)
          layer.doors.visible(floor, true)
          let draws = 0, triangles = 0
          for (const group of [layer.shell.group, layer.furnishings.group, layer.doors.group]) group.traverseVisible(object => {
            if (!(object instanceof THREE.Mesh)) return
            draws++; triangles += (object.geometry.index?.count ?? object.geometry.getAttribute('position')?.count ?? 0) / 3
          })
          const kept = home.housingVisualCost(floor)
          assert.ok(draws + kept.drawCalls + 19 <= 60, `${recipe.id}/${floor}: full draw reservation`)
          assert.ok(triangles + kept.triangles <= 15000)
        }
      } finally { home.dispose(); kit.dispose() }
    }
    const kit = createKit(), home = buildProductionHomeScene(kit, { decodeAsset: async () => {
      const group = new THREE.Group()
      group.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ transparent: true, opacity: .5 })))
      return group
    } })
    assert.ok('housing' in home)
    try {
      home.update(stateOf(RECIPES[0]!))
      await home.housing()!.furnishings.ready
      await Promise.resolve()
      assert.equal(home.housing(), null, 'unsupported source material restores original Home')
    } finally { home.dispose(); kit.dispose() }
  } finally {
    if (navigatorDescriptor) Object.defineProperty(globalThis, 'navigator', navigatorDescriptor)
    else Reflect.deleteProperty(globalThis, 'navigator')
  }
})


test('closed-room scripted actions wait at the avatar and reopen onto projected stair routes', () => environment(() => {
  const state = stateOf(RECIPES[0]!), kit = createKit(), home = buildProductionHomeScene(kit)
  try {
    home.update(state); home.walk.drive(true)
    const layer = home.housing()!, door = layer.doors.doors.find(door => door.floor === 1 && /Master bedroom/.test(door.label))!
    const toggle = () => {
      for (let step = 0; step < 24; step++) {
        const angle = step / 24 * Math.PI * 2, x = door.x + Math.cos(angle) * 1.85, z = door.z + Math.sin(angle) * 1.85
        if (layer.doors.nearest(x, z, door.floor)?.id === door.id && layer.doors.toggleNearest(x, z, door.floor)) return
      }
      assert.fail('a safe hinge-side position exists')
    }
    toggle(); assert.equal(door.open, false)
    const before = home.walk.avatar.position.clone()
    const sleeping = { ...state, activeAction: { kind: 'activity' as const, id: 'home-sleep', duration: 36, remaining: 30 } }
    const snapshot = JSON.stringify(sleeping)
    home.update(sleeping)
    assert.equal(home.walk.rest()?.pose, 'stand')
    assert.equal(home.walk.rest()?.x, before.x)
    assert.equal(home.walk.rest()?.z, before.z)
    assert.equal(home.objectPhase, 'idle')
    assert.equal(JSON.stringify(sleeping), snapshot, 'the view does not cancel or change the authoritative action')
    const solids = home.walk.solids
    toggle(); assert.equal(door.open, true)
    home.update(sleeping)
    assert.notEqual(home.walk.solids, solids)
    assert.equal(home.walk.rest()?.pose, 'work')
    assert.ok(home.walk.rest()?.steps?.length)
    assert.equal(home.objectPhase, 'approach')
  } finally { home.dispose(); kit.dispose() }
}))


function toggleSafe(home: ProductionHomeScene, door: HousingDoor): void {
  const doors = home.housing()!.doors
  for (let step = 0; step < 24; step++) {
    const angle = step / 24 * Math.PI * 2, x = door.x + Math.cos(angle) * 1.85, z = door.z + Math.sin(angle) * 1.85
    if (doors.nearest(x, z, door.floor)?.id === door.id && doors.toggleNearest(x, z, door.floor)) return
  }
  assert.fail('safe door-toggle coordinate')
}

test('a dense legal saved layout falls back before exceeding draw calls', () => environment(() => {
  const state = stateOf(RECIPES[3]!), plot = plotOf(14, true)
  state.home.items = []
  for (let y = 1; y <= 11; y += 2) for (let x = 1; x <= 11; x += 2) {
    assert.equal(checkPlacement(plot, state.home.items, FURNITURE['centre-rug']!, x, y, 0), null)
    state.home.items.push({ id: `f${state.home.items.length + 1}`, itemId: 'centre-rug', x, y, rot: 0 })
  }
  assert.equal(state.home.items.length, 36)
  const kit = createKit(), projection = productionHousingOf(state)!
  const doors = buildHousingDoors(kit, projection)
  assert.deepEqual(doors.clearanceFailures, [], 'door geometry is valid; rejection must be the budget')
  doors.dispose()
  const home = buildProductionHomeScene(kit), before = JSON.stringify(state)
  try {
    home.update(state)
    assert.equal(home.housing(), null)
    const meshes = visibleMeshSignature(home.group)
    home.update(state)
    assert.deepEqual(visibleMeshSignature(home.group), meshes)
    assert.equal(JSON.stringify(state), before)
  } finally { home.dispose(); kit.dispose() }
}))

test('exit blocking covers a closed room before the stairs and a closed room on the ground floor', () => environment(() => {
  const recipe = RECIPES[0]!, state = stateOf(recipe), kit = createKit(), home = buildProductionHomeScene(kit)
  try {
    home.update(state); home.walk.drive(true)
    const flight = recipePlan(recipe).stairs[0]!
    for (let step = 1; step <= 19; step++) {
      const t = step / 20, x = edge(flight.x + (flight.dir === 1 ? t : 1 - t) * flight.w, recipe.grid), z = edge(flight.y + flight.h / 2, recipe.grid)
      home.walk.move(x, home.walk.heightAt(x, z), z, Math.PI / 2)
    }
    const x = edge(flight.x + (flight.dir === 1 ? 1 : 0) * flight.w, recipe.grid) + flight.dir * .7, z = edge(flight.y + flight.h / 2, recipe.grid)
    home.walk.move(x, STOREY + .03, z, Math.PI / 2); home.look(20, 20)
    assert.equal(home.floor, 1)
    const inside = home.walk.grid!.nearest(-1, -1)!
    home.walk.move(inside.x, STOREY + .03, inside.z, 0)
    const master = home.housing()!.doors.doors.find(door => door.floor === 1 && /Master bedroom/.test(door.label))!
    toggleSafe(home, master)
    assert.equal(master.open, false)
    assert.equal(home.homeDoor.blocked, true, 'initial path to stair is blocked')
    toggleSafe(home, master)
    assert.equal(home.homeDoor.blocked, undefined)
  } finally { home.dispose(); kit.dispose() }
  const groundKit = createKit(), ground = buildProductionHomeScene(groundKit)
  try {
    ground.update(state); ground.walk.drive(true)
    const room = recipePlan(recipe).floors[0]!.find(room => /Guest toilet/.test(room.label))!
    const point = ground.walk.grid!.nearest(edge(room.x + room.w / 2, recipe.grid), edge(room.y + room.h / 2, recipe.grid))!
    ground.walk.move(point.x, .03, point.z, 0)
    const door = ground.housing()!.doors.doors.find(door => door.floor === 0)!
    toggleSafe(ground, door)
    assert.equal(ground.homeDoor.blocked, true, 'same-floor route to entrance is blocked')
    toggleSafe(ground, door)
    assert.equal(ground.homeDoor.blocked, undefined)
  } finally { ground.dispose(); groundKit.dispose() }
}))
