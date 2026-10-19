import { createKit } from '../scene/kit.ts'
import { buildVenueScene } from '../scene/venue-scenes.ts'
import { citySceneDef, loadCityScenes } from '../scene/city-scenes.ts'
import { applyRendererLook, createSky, renderTier } from '../scene/look.ts'
import { createHostLights } from '../venue-world.ts'
import { sceneEvidence } from './evidence.ts'
import type { SceneEvidence } from './evidence.ts'
import type { CityVenueContent } from '../types/content.ts'
import type { RenderScene } from './render-scene.ts'
import { geometryFingerprint } from './fingerprint.ts'
import type { Fingerprint } from './fingerprint.ts'

export interface Inspection { triangles: number; drawCalls: number; meshes: number; anchors: number; runtimeStatus: string }
export interface Viewer {
  dispose(): void
  turn(dx: number, dy: number): void
  zoom(amount: number): void
  reset(): void
  fingerprint(): Fingerprint
  evidence: SceneEvidence
  locations?: readonly { id: string; label: string }[]
  selectLocation?(id: string): boolean
}

export async function openScene(stage: HTMLElement, cityId: string, venue: CityVenueContent, isCurrent: () => boolean, changed: (metrics: Inspection) => void): Promise<Viewer> {
  await loadCityScenes(cityId)
  const campus = cityId === 'lagos' && venue.id === 'unilag' ? await import('./campus.ts') : undefined
  if (!isCurrent()) return { dispose() {}, turn() {}, zoom() {}, reset() {}, fingerprint: () => ({ key: '', meshes: 0, vertices: 0 }), evidence: { source: '', group: '', detail: '' } }
  const kit = createKit(), { THREE } = kit, scene = new THREE.Scene()
  let renderer: InstanceType<typeof THREE.WebGLRenderer> | undefined, entry: RenderScene | undefined
  let sky: ReturnType<typeof createSky> | undefined, lights: ReturnType<typeof createHostLights> | undefined
  let observer: ResizeObserver | undefined, poll: ReturnType<typeof setInterval> | undefined, frame = 0, disposed = false
  const events = new AbortController()
  const dispose = () => {
    if (disposed) return
    disposed = true; events.abort(); observer?.disconnect(); if (poll) clearInterval(poll); cancelAnimationFrame(frame)
    kit.requestRender = undefined
    entry?.dispose(); lights?.dispose(); sky?.dispose(); kit.dispose()
    renderer?.dispose(); renderer?.forceContextLoss(); renderer?.domElement.remove()
  }
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true })
    applyRendererLook(THREE, renderer, renderTier())
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, renderTier().pixelRatio))
    const canvas = renderer.domElement
    canvas.tabIndex = 0; canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', `${venue.name} scene. Drag to orbit, arrow keys to rotate, plus or minus to zoom, Home to reset.`)
    stage.append(canvas)
    const camera = new THREE.PerspectiveCamera(43, 1, .1, 1000)
    lights = createHostLights(THREE, scene, { shadowMap: renderTier().shadowMap })
    sky = createSky(THREE); scene.background = sky.texture
    entry = campus ? campus.buildCampusInspection(kit) : buildVenueScene(kit, { ...venue.definition, scene: { ...venue.definition.scene, spots: Object.values(venue.definition.spots).map(spot => ({ id: spot.id, label: spot.label })) } }, cityId)
    if (entry.kind === 'generic') throw new Error(`No dedicated renderer is registered for scene kind ${venue.definition.scene.kind}. Its generic fallback is not shown in this inspector.`)
    scene.add(entry.group)
    const definition = citySceneDef(cityId, venue.definition.scene.kind, venue.definition.scene.variant ?? '')
    const recipeDefinition = citySceneDef(cityId, `recipe:${venue.id}`, '')
    const evidence = campus ? { source: 'Mapped campus scene', group: 'campus:unilag', detail: 'The actual campus scene and its position-dependent geometry. Choose an area to inspect its resident geometry. Visual uniqueness has not been certified.' } : sceneEvidence(venue.definition, recipeDefinition ?? definition, recipeDefinition ? 'registered-recipe' : 'standard')
    const target = new THREE.Vector3(0, .7, 0), spherical = new THREE.Spherical()
    function draw() {
      frame = 0
      if (disposed || !entry || !renderer || !lights || !sky) return
      const width = Math.max(1, stage.clientWidth), height = Math.max(1, stage.clientHeight)
      renderer.setSize(width, height, false)
      camera.aspect = width / height; camera.updateProjectionMatrix()
      camera.position.setFromSpherical(spherical).add(target); camera.lookAt(target)
      entry.look(camera.position.x, camera.position.z)
      lights.apply(entry.lighting(), entry.camera.bounds); lights.aim(camera, target.x, target.y, target.z)
      sky.set(...entry.sky); renderer.render(scene, camera)
      const stats = entry.stats()
      changed({ triangles: renderer.info.render.triangles, drawCalls: renderer.info.render.calls, meshes: stats.meshes, anchors: Object.keys(entry.anchors).length, runtimeStatus: entry.group.userData.runtimeError ? `Asset error: ${String(entry.group.userData.runtimeError)}. Use Reload scene to retry.` : entry.group.userData.runtimeStatus ? `Runtime asset: ${String(entry.group.userData.runtimeStatus)}${entry.group.userData.runtimeTier ? ` (${String(entry.group.userData.runtimeTier)})` : ''}.` : 'Rendered scene snapshot; visual distinctness has not been certified.' })
    }
    const schedule = () => { if (!disposed && !frame) frame = requestAnimationFrame(draw) }
    kit.requestRender = schedule; entry.onAmbient = schedule
    function reset() {
      if (!entry) return
      const position = stage.clientWidth / Math.max(1, stage.clientHeight) < .85 ? entry.camera.portrait : entry.camera.landscape
      target.set(...(entry.target?.() ?? [0, .7, 0]))
      if (entry.camera.bounds && !entry.target) { const [x, y, z, xx, yy, zz] = entry.camera.bounds; target.set((x + xx) / 2, (y + yy) / 2, (z + zz) / 2) }
      spherical.setFromVector3(new THREE.Vector3(...position).sub(new THREE.Vector3(0, .7, 0)))
      schedule()
    }
    function turn(dx: number, dy: number) { spherical.theta += dx; spherical.phi = Math.max(.08, Math.min(Math.PI / 2 + .3, spherical.phi + dy)); schedule() }
    function zoom(amount: number) { spherical.radius = Math.max(2, Math.min(500, spherical.radius * amount)); schedule() }
    let pointer: { id: number; x: number; y: number } | null = null
    canvas.addEventListener('pointerdown', event => { pointer = { id: event.pointerId, x: event.clientX, y: event.clientY }; canvas.setPointerCapture(event.pointerId); canvas.focus() }, { signal: events.signal })
    canvas.addEventListener('pointermove', event => { if (!pointer || pointer.id !== event.pointerId) return; turn((pointer.x - event.clientX) * .008, (pointer.y - event.clientY) * .008); pointer.x = event.clientX; pointer.y = event.clientY }, { signal: events.signal })
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(name, () => { pointer = null }, { signal: events.signal })
    canvas.addEventListener('wheel', event => { event.preventDefault(); zoom(event.deltaY > 0 ? 1.1 : 1 / 1.1) }, { signal: events.signal, passive: false })
    canvas.addEventListener('keydown', event => {
      const actions: Record<string, () => void> = { ArrowLeft: () => turn(-.15, 0), ArrowRight: () => turn(.15, 0), ArrowUp: () => turn(0, -.12), ArrowDown: () => turn(0, .12), '+': () => zoom(.85), '=': () => zoom(.85), '-': () => zoom(1.15), Home: reset }
      const action = actions[event.key]; if (action) { event.preventDefault(); action() }
    }, { signal: events.signal })
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); changed({ triangles: 0, drawCalls: 0, meshes: 0, anchors: 0, runtimeStatus: 'Graphics context lost. Use Reload scene to retry.' }) }, { signal: events.signal })
    observer = new ResizeObserver(schedule); observer.observe(stage)
    // Runtime asset owners may finish without requesting a render. Sample slowly, with no continuous animation loop.
    poll = setInterval(() => { if (!document.hidden) schedule() }, 1500)
    reset()
    return {
      dispose, turn, zoom, reset, evidence, locations: entry.locations,
      selectLocation(id) { const changed = entry?.selectLocation?.(id) ?? false; if (changed) reset(); return changed },
      fingerprint() {
        if (!entry || disposed) throw new Error('Scene is no longer open')
        return geometryFingerprint(entry.group)
      },
    }
  } catch (error) { dispose(); throw error }
}
