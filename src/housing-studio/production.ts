import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { SCENE_CROWD_TRIANGLES, SCENE_DRAW_CALLS } from '../budgets.ts'
import { FURNITURE } from '../game/content/furniture.ts'
import { HOUSE_STYLE } from '../game/content/world.ts'
import { bodyAllowed } from '../scene/body/gate.ts'
import { buildHomeScene, type HomeScene } from '../scene/home-scene.ts'
import type { Kit } from '../scene/kit.ts'
import type { WalkGrid } from '../scene/walk-grid.ts'
import type { LifeState } from '../types/life.ts'
import type { VisitHomeProjection } from '../types/visit.ts'
import { housingAssetManifest, type HousingAssetManifestEntry } from './asset-manifest.ts'
import { compactHousingTemplate } from './compact-template.ts'
import { buildHousingDoors } from './doors.ts'
import { buildHousingFurnishings } from './furnishings.ts'
import type { HousingRecipe } from './fixtures.ts'
import { productionHousingOf } from './production-mapping.ts'
import { buildHousingShell } from './shell.ts'
import { withHousingFrontDoor } from './front-door.ts'
import type { SceneCamera } from '../scene/types.ts'

interface HousingLayer {
  readonly recipe: HousingRecipe
  readonly shell: ReturnType<typeof buildHousingShell>
  readonly furnishings: ReturnType<typeof buildHousingFurnishings>
  readonly doors: ReturnType<typeof buildHousingDoors>
  readonly signature: string
  dispose(): void
}

export type ProductionHomeScene = HomeScene & {
  readonly frontDoor: ReturnType<typeof withHousingFrontDoor>['frontDoor']
  housing(): HousingLayer | null
  startCrowd(renderer: THREE.WebGLRenderer, changed: () => void): void
}

interface ProductionHomeOptions {
  visit?: VisitHomeProjection
  decodeAsset?: (entry: HousingAssetManifestEntry) => Promise<THREE.Group>
}

// Host ground/background uses three calls; player, guests and action props retain sixteen.
const RETAINED_DRAW_CALLS = 3 + 16

const assetFor = new Map<string, (typeof housingAssetManifest)[number]>(housingAssetManifest.map((entry) => [entry.id, entry]))
const SHAPES: Readonly<Record<string, string>> = { sofa: 'two-seat-sofa', bed: 'single-bed', wardrobe: 'wardrobe', chair: 'dining-chair', desk: 'dining-table', plant: 'broadleaf-planter', basin: 'knee-clearance-public-washbasin', fridge: 'display-fridge', cooker: 'four-burner-stove', floorlamp: 'floor-lamp' }

function visibleGeometryCost(root: THREE.Object3D): { triangles: number; drawCalls: number } {
  let triangles = 0, drawCalls = 0
  root.traverseVisible((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const count = object.geometry.index?.count ?? object.geometry.getAttribute('position')?.count ?? 0
    triangles += count / 3
    drawCalls += 1
  })
  return { triangles, drawCalls }
}

function assetReserve(recipe: HousingRecipe, floor: number): { triangles: number; drawCalls: number } {
  let triangles = 0, drawCalls = 0
  for (const item of recipe.items) {
    if ((item.floor ?? 0) !== floor) continue
    const def = FURNITURE[item.itemId]
    if (!def || def.wall || def.kind === 'tv') continue
    const assetId = item.itemId === 'lounge-armchair' ? 'wood-armchair' : SHAPES[def.shape]
    const asset = assetId && assetFor.get(assetId)
    if (asset) {
      triangles += asset.triangles
      // The compacted template has one draw and replaces one solid proxy.
      // A failed load keeps that same proxy, so it adds no simultaneous draw.
    }
  }
  return { triangles, drawCalls }
}

function signatureOf(recipe: HousingRecipe): string {
  return JSON.stringify([recipe.city, recipe.grid, recipe.style, recipe.items])
}

const frame = (): void => { globalThis.window?.dispatchEvent?.(new CustomEvent('jaw:home-frame')) }

/** Production Home adapter. The canonical scene remains save, action, body and transition authority. */
export function buildProductionHomeScene(kit: Kit): ProductionHomeScene
export function buildProductionHomeScene(kit: Kit, options?: ProductionHomeOptions): HomeScene | ProductionHomeScene
export function buildProductionHomeScene(kit: Kit, options: ProductionHomeOptions = {}): HomeScene | ProductionHomeScene {
  const home = buildHomeScene(kit, options)
  if (options.visit) return home

  let active: HousingLayer | null = null, gone = false, camera = { x: 20, z: 20 }
  let rejectedSignature = ''
  let hostElement: HTMLElement | null = null, changed = frame
  let solids: readonly number[][] = home.walk.solids
  let solidsBase = home.walk.solids, solidsLayer: HousingLayer | null = null, solidsFloor = -1, solidsDoors = ''
  let doorButton: HTMLButtonElement | null = null, frontButton: HTMLButtonElement | null = null, overviewButton: HTMLButtonElement | null = null
  let overview = false
  let projectNavigation: ((base: WalkGrid, floor: number) => WalkGrid) | null = null

  const currentGrid = (): WalkGrid | null => active?.doors.grid(home.walk.grid!, home.floor) ?? home.walk.grid
  const stableGrid: WalkGrid = {
    get bounds() { return currentGrid()!.bounds }, get cell() { return currentGrid()!.cell },
    get cols() { return currentGrid()!.cols }, get rows() { return currentGrid()!.rows }, get cells() { return currentGrid()!.cells },
    free: (...args) => currentGrid()!.free(...args), nearest: (...args) => currentGrid()!.nearest(...args),
    clearLine: (...args) => currentGrid()!.clearLine(...args), path: (...args) => currentGrid()!.path(...args), ascii: (...args) => currentGrid()!.ascii(...args),
  }
  const refreshSolids = (): void => {
    const base = home.walk.solids, floor = home.floor
    const doors = active?.doors.doors.map((door) => `${door.id}:${door.open ? 1 : 0}`).join('|') ?? ''
    if (base === solidsBase && active === solidsLayer && floor === solidsFloor && doors === solidsDoors) return
    solidsBase = base; solidsLayer = active; solidsFloor = floor; solidsDoors = doors
    solids = active ? [...base, ...active.doors.solids(floor)] : base
  }
  const requestFrame = (): void => {
    if (gone) return
    if (active?.furnishings.failures.length) { rejectedSignature = active.signature; drop() }
    changed(); frame()
  }

  function drop(): void {
    if (!active) return
    home.setNavigationProjection(null)
    home.setVisualLayer('canonical')
    active.dispose()
    active = null
    refreshSolids()
  }

  function build(recipe: HousingRecipe, signature: string): HousingLayer | null {
    const shell = buildHousingShell(kit, recipe, { wall: HOUSE_STYLE.wall[recipe.style.wall]?.hex })
    const rendered = { ...recipe, items: recipe.items.filter((item) => {
      const def = FURNITURE[item.itemId]
      return Boolean(def && !def.wall && def.kind !== 'tv')
    }) }
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
    const load = async (entry: HousingAssetManifestEntry): Promise<THREE.Group> => {
      const source = options.decodeAsset ? await options.decodeAsset(entry) : (await loader.loadAsync(entry.url)).scene
      try { return compactHousingTemplate(source, kit) } finally {
        const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>()
        source.traverse(object => {
          if (!(object instanceof THREE.Mesh)) return
          geometries.add(object.geometry)
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material)
        })
        geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose())
      }
    }
    const furnishings = buildHousingFurnishings(kit, rendered, requestFrame, load)
    const doors = buildHousingDoors(kit, recipe)
    if (doors.clearanceFailures.length) { doors.dispose(); furnishings.dispose(); shell.dispose(); return null }
    const group = new kit.THREE.Group()
    group.add(shell.group, furnishings.group, doors.group)
    home.setVisualLayer('housing')
    let triangles = 0, drawCalls = 0
    for (let floor = 0; floor < shell.plan.plot.floors; floor++) for (const first of [false, true]) for (const camera of [{ x: 20, z: 20 }, { x: -20, z: -20 }]) {
      shell.visible(floor, first, false, camera)
      furnishings.visible(floor, first, camera)
      doors.visible(floor, first)
      const fallback = visibleGeometryCost(group), shellCost = visibleGeometryCost(shell.group), doorCost = visibleGeometryCost(doors.group)
      const retained = home.housingVisualCost(floor), assets = assetReserve(rendered, floor)
      const actualTriangles = retained.triangles + shellCost.triangles + doorCost.triangles + assets.triangles
      const actualCalls = retained.drawCalls + shellCost.drawCalls + doorCost.drawCalls + assets.drawCalls
      triangles = Math.max(triangles, retained.triangles + fallback.triangles, actualTriangles)
      drawCalls = Math.max(drawCalls, actualCalls)
    }
    if (triangles > SCENE_CROWD_TRIANGLES.value || drawCalls + RETAINED_DRAW_CALLS > SCENE_DRAW_CALLS.value) {
      home.setVisualLayer('canonical'); doors.dispose(); furnishings.dispose(); shell.dispose(); return null
    }
    home.group.add(group)
    return { recipe, shell, furnishings, doors, signature, dispose() { group.removeFromParent(); doors.dispose(); furnishings.dispose(); shell.dispose() } }
  }

  function updateDoorControl(): void {
    const inVenue = (globalThis.document?.querySelector<HTMLElement>('.life-ui')?.dataset.mode ?? 'venue') === 'venue'
    if (frontButton) {
      frontButton.hidden = !inVenue || !active || home.placing || home.floor !== 0
      frontButton.style.display = frontButton.hidden ? 'none' : ''
      frontButton.disabled = frontHome.frontDoor.busy
      frontButton.setAttribute('aria-label', `${frontHome.frontDoor.open ? 'Close' : 'Open'} front door`)
      frontButton.title = frontButton.getAttribute('aria-label') ?? ''
    }
    if (overviewButton) {
      overviewButton.hidden = !inVenue || !active || home.placing || hostElement?.classList.contains('is-first-person') === true
      overviewButton.style.display = overviewButton.hidden ? 'none' : ''
      overviewButton.setAttribute('aria-pressed', String(overview))
    }
    if (!doorButton) return
    const avatar = home.walk.avatar.position, door = active?.doors.nearest(avatar.x, avatar.z, home.floor) ?? null
    doorButton.hidden = !inVenue || !active || !door || home.placing
    doorButton.style.display = doorButton.hidden ? 'none' : ''
    doorButton.disabled = !door
    if (door) {
      const action = door.open ? 'Close' : 'Open'
      doorButton.textContent = '🚪'
      doorButton.setAttribute('aria-label', `${action} ${door.label} door`)
      doorButton.title = `${action} ${door.label} door (F)`
    }
  }

  function toggleFront(): void {
    if (!active || home.placing || home.floor !== 0) return
    if (frontHome.frontDoor.toggle()) { updateDoorControl(); requestFrame() }
  }
  function toggleOverview(): void {
    overview = !overview; present(); requestFrame()
    globalThis.window?.dispatchEvent?.(new CustomEvent('jaw:key', { detail: { action: 'zoom-fit', mode: 'venue' } }))
  }

  function toggleDoor(): boolean {
    if (!active || home.placing) return false
    const avatar = home.walk.avatar.position
    if (!active.doors.toggleNearest(avatar.x, avatar.z, home.floor)) return false
    projectNavigation = (base, floor) => active?.doors.grid(base, floor) ?? base
    refreshSolids(); present(); updateDoorControl(); requestFrame(); return true
  }

  const onKey = (event: KeyboardEvent): void => {
    if (event.key.toLowerCase() !== 'f' || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return
    if (event.target instanceof Element && event.target.closest('input,select,textarea,[contenteditable=true]')) return
    if (globalThis.document?.querySelector<HTMLElement>('.life-ui')?.dataset.mode !== 'venue') return
    if (!home.group.visible || !home.group.parent) return
    if (toggleDoor()) event.preventDefault()
  }

  function present(): void {
    const housing = Boolean(active) && !home.placing
    home.setVisualLayer(housing ? 'housing' : 'canonical')
    home.setNavigationProjection(housing ? projectNavigation : null)
    if (!active) { updateDoorControl(); return }
    active.shell.group.visible = housing
    active.furnishings.group.visible = housing
    active.doors.group.visible = housing
    if (housing) {
      const first = hostElement?.classList.contains('is-first-person') === true
      if (first) overview = false
      active.shell.visible(home.floor, first, false, camera, overview)
      active.furnishings.visible(home.floor, first, camera)
      active.doors.visible(home.floor, first || !overview)
    }
    refreshSolids(); updateDoorControl()
  }

  function sync(state: LifeState): void {
    const recipe = productionHousingOf(state)
    if (!recipe || !bodyAllowed()) { rejectedSignature = ''; drop(); return }
    const signature = JSON.stringify([signatureOf(recipe), state.achievements.displayed, state.achievements.displayed ? state.achievements.earned[state.achievements.displayed] : null, state.projects.mementos, state.episodes.mementos])
    if (signature === active?.signature || signature === rejectedSignature) return
    const next = build(recipe, signature)
    if (!next) { rejectedSignature = signature; drop(); return }
    rejectedSignature = ''
    const previous = active
    active = next
    projectNavigation = (base, floor) => active?.doors.grid(base, floor) ?? base
    previous?.dispose()
    refreshSolids()
  }

  const frontHome = withHousingFrontDoor(home, { open: false }, () => home.floor === 0)
  const wrapper = Object.create(frontHome) as ProductionHomeScene
  wrapper.walk = Object.create(home.walk)
  Object.defineProperty(wrapper.walk, 'grid', { get: () => home.walk.grid ? stableGrid : null })
  Object.defineProperty(wrapper.walk, 'solids', { get: () => { refreshSolids(); return solids } })
  Object.defineProperty(wrapper, 'camera', { get: (): SceneCamera => {
    if (!active || home.placing) return home.camera
    const k = Math.max(1, Math.max(active.shell.plan.plot.w, active.shell.plan.plot.d) / active.recipe.grid)
    return { landscape: [15*k, 27*k, 15*k], portrait: [19*k, 32*k, 19*k], start: overview ? 5 : 3.6 }
  } })
  wrapper.housing = () => active
  wrapper.update = (state: LifeState) => { const canonical = frontHome.update(state); sync(state); present(); return canonical }
  wrapper.look = (x: number, z: number) => { const canonical = frontHome.look(x, z); camera = { x, z }; present(); return canonical }
  wrapper.startCrowd = (renderer: THREE.WebGLRenderer, nextChanged: () => void) => {
    hostElement = renderer.domElement.parentElement; changed = nextChanged
    const pad = hostElement?.querySelector<HTMLElement>('.scene-pad')
    if (pad && !doorButton) {
      doorButton = document.createElement('button'); doorButton.type = 'button'; doorButton.dataset.scene = 'housing-door'
      doorButton.addEventListener('click', toggleDoor); pad.append(doorButton)
      frontButton = document.createElement('button'); frontButton.type = 'button'; frontButton.textContent = '↔'; frontButton.dataset.scene = 'housing-front-door'
      frontButton.addEventListener('click', toggleFront); pad.append(frontButton)
      overviewButton = document.createElement('button'); overviewButton.type = 'button'; overviewButton.textContent = '▦'; overviewButton.dataset.scene = 'housing-overview'
      overviewButton.setAttribute('aria-label', 'Floor overview'); overviewButton.title = 'Floor overview'
      overviewButton.addEventListener('click', toggleOverview); pad.append(overviewButton)
      globalThis.window?.addEventListener('keydown', onKey)
    }
    present()
  }
  wrapper.dispose = () => {
    if (gone) return
    gone = true; globalThis.window?.removeEventListener('keydown', onKey)
    doorButton?.removeEventListener('click', toggleDoor); doorButton?.remove(); doorButton = null
    frontButton?.removeEventListener('click', toggleFront); frontButton?.remove(); frontButton = null
    overviewButton?.removeEventListener('click', toggleOverview); overviewButton?.remove(); overviewButton = null
    drop(); home.dispose()
  }
  return wrapper
}
