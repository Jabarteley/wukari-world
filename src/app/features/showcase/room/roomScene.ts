// The 3D shop: the room model for the shop's kind, tinted in the shop's colours, with its name on the sign, its photos on the photos
// wall and the seller's items in the twelve display slots. Loaded only when a visitor steps inside (never in the first download).
//
// Everything the seller wrote is drawn as text into a canvas; nothing here builds markup. Photos come only from the game's own photo
// store (roomPhotoUrl). The scene draws on demand: a frame is drawn when something changed (a size, a page, a picture that arrived,
// a drag) and, while the camera eases to a view, until it arrives; it never runs a timer of its own.
import type * as THREE_TYPES from 'three'
import { applyRendererLook, renderTier } from '../../../../scene/look.ts'
import { createKit } from '../../../../scene/kit.ts'
import { buildAvatar } from '../../../../scene/characters.ts'
import electronicsUrl from './assets/shop-electronics.glb?url'
import fashionUrl from './assets/shop-fashion.glb?url'
import foodUrl from './assets/shop-food.glb?url'
import { drawCover, drawItemCard, FONT, roundedRect } from './roomCanvas.ts'
import { coveredTriangles } from './roomGeometry.ts'
import type { Tri, V3 } from './roomGeometry.ts'
import { cardPlace, clampPage, mixHex, pageCount, pageOf, roomColours, roomPhotoUrl, wrapLines } from './roomModel.ts'
import type { RoomData, RoomTheme } from './roomModel.ts'

type Three = typeof THREE_TYPES

export type RoomPick = { kind: 'item'; index: number } | { kind: 'counter' } | { kind: 'page'; step: 1 | -1 } | { kind: 'photos' }
export type RoomView = 'room' | 'left' | 'counter' | 'right' | 'more'
export interface RoomEvents {
  pick(pick: RoomPick): void
}
export interface RoomScene {
  setPage(page: number): void
  view(view: RoomView): void
  /** An arrow key or + or -: turns, tilts or moves the view. True when it was one of those. */
  nudge(key: string): boolean
  resize(): void
  /** Frames drawn so far (the on-demand rule is tested with it) and whether the easing loop is running. */
  diagnostics(): { renders: number; looping: boolean; triangles: number; calls: number; page: number; pages: number }
  dispose(): void
}

const FILES: Record<RoomTheme, string> = { fashion: fashionUrl, food: foodUrl, electronics: electronicsUrl }
const FRAME_DARK = '#3a2a1c'

/** The camera: a visitor standing at the door, looking in. yaw 0 looks at the back wall; positive turns to the left wall. */
interface Look { yaw: number; pitch: number; dolly: number }
const START: Look = { yaw: 0, pitch: -0.06, dolly: 0 }
const VIEWS: Record<RoomView, Look> = {
  room: START,
  left: { yaw: 0.78, pitch: -0.12, dolly: 0.55 },
  right: { yaw: -0.78, pitch: -0.12, dolly: 0.55 },
  counter: { yaw: -0.1, pitch: -0.22, dolly: 0.72 },
  more: { yaw: -0.95, pitch: 0.1, dolly: 0.35 },
}
const YAW_LIMIT = 1.25, PITCH_LIMIT = 0.5
/** Where the camera stands: the door end of the room, moving in towards the visitor's spot as the visitor zooms. */
const CAMERA_FAR = { x: 0, y: 1.6, z: 2.5 }, CAMERA_NEAR = { x: 0, y: 1.5, z: 0.7 }

function canvasOf(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas')
  canvas.width = width; canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no 2d canvas')
  return { canvas, ctx }
}
export async function createRoomScene(canvas: HTMLCanvasElement, data: RoomData, events: RoomEvents): Promise<RoomScene> {
  const THREE = await import('three')
  const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([import('three/examples/jsm/loaders/GLTFLoader.js'), import('three/examples/jsm/libs/meshopt_decoder.module.js')])
  await MeshoptDecoder.ready
  const colours = roomColours(data.colours)
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' })
  const tier = applyRendererLook(THREE, renderer, renderTier(), { shadows: false })
  renderer.setPixelRatio(Math.min(tier.pixelRatio, globalThis.devicePixelRatio || 1))
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(mixHex(colours.sign, '#000000', 0.72))
  const camera = new THREE.PerspectiveCamera(60, 1, 0.05, 40)
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(FILES[data.theme])
  const room = gltf.scene
  scene.add(room)
  room.updateMatrixWorld(true)

  const disposables: { dispose(): void }[] = []
  const track = <T extends { dispose(): void }>(item: T): T => { disposables.push(item); return item }
  let renders = 0, looping = false, frame = 0, dirty = false, gone = false
  let calls = 0, triangles = 0

  /** Some walls of the models have a plain swatch sheet at the same place as the wall's picture: leave those triangles out so the wall does not flicker. */
  function leaveOutCovered(mesh: THREE_TYPES.Mesh): void {
    const geometry = mesh.geometry, position = geometry.getAttribute('position'), uv = geometry.getAttribute('uv'), held = geometry.getIndex()
    if (!uv) return
    // A model without an index lists its triangles in order.
    const index = { count: held ? held.count : position.count, getX: (n: number): number => (held ? held.getX(n) : n) }
    const world = new THREE.Vector3(), tris: Tri[] = []
    const at = (i: number): { p: V3; uv: [number, number] } => { world.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld); return { p: [world.x, world.y, world.z], uv: [uv.getX(i), uv.getY(i)] } }
    for (let t = 0; t < index.count; t += 3) { const [a, b, c] = [at(index.getX(t)), at(index.getX(t + 1)), at(index.getX(t + 2))]; tris.push({ p: [a.p, b.p, c.p], uv: [a.uv, b.uv, c.uv] }) }
    const drop = coveredTriangles(tris)
    if (!drop.size) return
    const kept: number[] = []
    tris.forEach((_, n) => { if (!drop.has(n)) kept.push(index.getX(n * 3), index.getX(n * 3 + 1), index.getX(n * 3 + 2)) })
    geometry.setIndex(kept)
  }

  // ---- the room: walls tinted from the shop's colour, a ceiling, a warm light and a soft fill ----
  room.traverse((node) => {
    const mesh = node as THREE_TYPES.Mesh
    if (!mesh.isMesh) return
    const material = mesh.material as THREE_TYPES.MeshStandardMaterial
    // The two quads that carry the sign and the photos are replaced by the scene's own planes (below); the room itself is tinted.
    if (node.parent?.name === 'shop_sign' || node.parent?.name === 'photos_area') return
    leaveOutCovered(mesh)
    material.color = new THREE.Color(mixHex('#ffffff', colours.wall, 0.45))
    material.roughness = 0.95
    // The room's picture is an atlas: smaller sizes of it blend neighbouring parts together at a slant, so it is sampled at full size only.
    if (material.map) { material.map.minFilter = THREE.LinearFilter; material.map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); material.map.needsUpdate = true }
  })
  const ceilingMaterial = track(new THREE.MeshLambertMaterial({ color: mixHex('#fff6e6', colours.wall, 0.2), side: THREE.DoubleSide }))
  const ceiling = new THREE.Mesh(track(new THREE.PlaneGeometry(6.3, 5.6)), ceilingMaterial)
  ceiling.rotation.x = Math.PI / 2; ceiling.position.set(0, 3.2, 0.1)
  scene.add(ceiling)
  const lamp = new THREE.Mesh(track(new THREE.CylinderGeometry(0.32, 0.4, 0.07, 18)), track(new THREE.MeshBasicMaterial({ color: '#fff1cf' })))
  lamp.position.set(0, 3.15, 0.2)
  scene.add(lamp)
  scene.add(new THREE.HemisphereLight('#fff1d9', '#b98a5e', 1.5))
  const bulb = new THREE.PointLight('#ffdfae', 14, 11, 1.6)
  bulb.position.set(0, 2.85, 0.4)
  scene.add(bulb)

  // The room's own sign and photos nodes: their world boxes say where the planes go.
  const boxOf = (name: string): THREE_TYPES.Box3 | null => { const node = room.getObjectByName(name); return node ? new THREE.Box3().setFromObject(node) : null }
  const textureOf = (canvasElement: HTMLCanvasElement): THREE_TYPES.CanvasTexture => {
    const texture = track(new THREE.CanvasTexture(canvasElement))
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())
    return texture
  }
  const basic = (map: THREE_TYPES.Texture): THREE_TYPES.MeshBasicMaterial => track(new THREE.MeshBasicMaterial({ map, color: '#f4eee4', toneMapped: false }))

  const pickables: THREE_TYPES.Object3D[] = []

  // ---- the sign: the shop's name, in a canvas ----
  const signBox = boxOf('shop_sign')
  if (signBox) {
    const { canvas: signCanvas, ctx } = canvasOf(1280, 180)
    ctx.fillStyle = colours.sign; ctx.fillRect(0, 0, 1280, 180)
    ctx.strokeStyle = colours.accent; ctx.lineWidth = 6; roundedRect(ctx, 14, 14, 1252, 152, 16); ctx.stroke()
    ctx.fillStyle = colours.signInk; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    let size = 104
    do { ctx.font = `800 ${size}px ${FONT}`; size -= 4 } while (ctx.measureText(data.name).width > 1140 && size > 36)
    ctx.fillText(data.name, 640, data.sign ? 78 : 92)
    if (data.sign) { ctx.font = `600 34px ${FONT}`; ctx.globalAlpha = 0.85; ctx.fillText(data.sign, 640, 142, 1100); ctx.globalAlpha = 1 }
    const width = signBox.max.x - signBox.min.x, height = signBox.max.y - signBox.min.y
    const plane = new THREE.Mesh(track(new THREE.PlaneGeometry(width * 0.94, height * 0.82)), basic(textureOf(signCanvas)))
    plane.position.set((signBox.min.x + signBox.max.x) / 2, (signBox.min.y + signBox.max.y) / 2, signBox.max.z + 0.012)
    scene.add(plane)
  }

  // ---- the photos wall: the shop's photos side by side, never stretched ----
  const photosBox = boxOf('photos_area')
  let photosTexture: THREE_TYPES.CanvasTexture | null = null
  const photoImages: (HTMLImageElement | null)[] = data.photos.slice(0, 6).map(() => null)
  const photosCanvas = canvasOf(1344, 360)
  const paintPhotos = (): void => {
    const { ctx } = photosCanvas, w = 1344, h = 360
    ctx.fillStyle = mixHex(colours.accent, '#ffffff', 0.5); ctx.fillRect(0, 0, w, h)
    const count = Math.max(1, photoImages.length), gap = 12, tile = (w - gap * (count + 1)) / count
    if (!data.photos.length) {
      ctx.fillStyle = colours.sign; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `700 48px ${FONT}`
      ctx.fillText('Photos coming soon', w / 2, h / 2, w - 80)
    }
    photoImages.forEach((image, at) => {
      const x = gap + at * (tile + gap)
      ctx.save(); roundedRect(ctx, x, gap, tile, h - gap * 2, 10); ctx.clip()
      if (image && image.naturalWidth > 0) drawCover(ctx, image, x, gap, tile, h - gap * 2)
      else { ctx.fillStyle = mixHex(colours.tile, '#ffffff', 0.3); ctx.fillRect(x, gap, tile, h - gap * 2) }
      ctx.restore()
    })
    if (photosTexture) photosTexture.needsUpdate = true
  }
  if (photosBox) {
    paintPhotos()
    photosTexture = textureOf(photosCanvas.canvas)
    const depth = photosBox.max.z - photosBox.min.z, height = photosBox.max.y - photosBox.min.y
    const plane = new THREE.Mesh(track(new THREE.PlaneGeometry(depth * 0.94, height * 0.8)), basic(photosTexture))
    plane.rotation.y = Math.PI / 2
    plane.position.set(photosBox.max.x + 0.012, (photosBox.min.y + photosBox.max.y) / 2, (photosBox.min.z + photosBox.max.z) / 2)
    plane.userData['pick'] = { kind: 'photos' } satisfies RoomPick
    scene.add(plane); pickables.push(plane)
  }

  // ---- pictures: the shop's photos and each item's photo, from the game's own store, loaded one by one ----
  const images = new Map<string, HTMLImageElement | 'failed'>()
  const waiting = new Map<string, (() => void)[]>()
  function picture(id: string, then: () => void): HTMLImageElement | null {
    const known = images.get(id)
    if (known && known !== 'failed') return known
    if (known === 'failed') return null
    const src = roomPhotoUrl(id)
    if (!src) { images.set(id, 'failed'); return null }
    const callbacks = waiting.get(id)
    if (callbacks) { callbacks.push(then); return null }
    waiting.set(id, [then])
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => { images.set(id, image); const done = waiting.get(id) ?? []; waiting.delete(id); if (!gone) done.forEach((run) => run()) }
    image.onerror = () => { images.set(id, 'failed'); waiting.delete(id) }
    image.src = src
    return null
  }
  data.photos.slice(0, 6).forEach((photo, at) => {
    const ready = (): void => { photoImages[at] = images.get(photo.id) as HTMLImageElement; paintPhotos(); invalidate() }
    const image = picture(photo.id, ready)
    if (image) photoImages[at] = image
  })
  if (photosBox) paintPhotos()

  // ---- items: a framed card in each slot of the page ----
  const cards = new THREE.Group()
  scene.add(cards)
  let page = 0
  const frameGeometry = track(new THREE.BoxGeometry(1, 1, 1))
  const frameMaterial = track(new THREE.MeshLambertMaterial({ color: mixHex(FRAME_DARK, colours.sign, 0.25) }))
  const faceGeometries = new Map<string, THREE_TYPES.PlaneGeometry>()
  const faceGeometry = (w: number, h: number): THREE_TYPES.PlaneGeometry => { const key = `${w}x${h}`; let found = faceGeometries.get(key); if (!found) { found = track(new THREE.PlaneGeometry(w, h)); faceGeometries.set(key, found) } return found }
  let cardResources: { dispose(): void }[] = []
  function clearCards(): void {
    for (const child of [...cards.children]) cards.remove(child)
    for (const item of cardResources) item.dispose()
    cardResources = []
    for (let at = pickables.length - 1; at >= 0; at -= 1) { const kind = (pickables[at]?.userData['pick'] as RoomPick | undefined)?.kind; if (kind === 'item' || kind === 'page') pickables.splice(at, 1) }
  }
  function buildCards(): void {
    clearCards()
    const shown = pageOf(data.items, page)
    for (const { item, slot, index } of shown) {
      const place = cardPlace(slot)
      const holder = new THREE.Group()
      holder.position.set(place.x, place.y, place.z); holder.rotation.y = place.yaw; holder.rotation.x = place.tilt
      const frame = new THREE.Mesh(frameGeometry, frameMaterial)
      frame.scale.set(place.w + 0.04, place.h + 0.04, 0.03); frame.position.z = -0.016
      holder.add(frame)
      const { canvas: art, ctx } = canvasOf(320, Math.round(320 * (place.h / place.w)))
      const draw = (): void => { drawItemCard(ctx, art.width, art.height, item, colours, item.photo ? ((images.get(item.photo) as HTMLImageElement | undefined) ?? null) : null) }
      draw()
      const texture = new THREE.CanvasTexture(art)
      texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())
      const material = new THREE.MeshBasicMaterial({ map: texture, color: '#f4eee4', toneMapped: false })
      const face = new THREE.Mesh(faceGeometry(place.w, place.h), material)
      face.userData['pick'] = { kind: 'item', index } satisfies RoomPick
      holder.add(face); cards.add(holder); pickables.push(face)
      cardResources.push(texture, material)
      if (item.photo) picture(item.photo, () => { if (!cardResources.includes(texture)) return; draw(); texture.needsUpdate = true; invalidate() })
    }
    if (!data.items.length) {
      // An empty shop: a tidy "Opening soon" stand on the counter.
      const { canvas: stand, ctx } = canvasOf(512, 320)
      ctx.fillStyle = colours.label; ctx.fillRect(0, 0, 512, 320)
      ctx.fillStyle = colours.sign; ctx.fillRect(0, 0, 512, 78)
      ctx.fillStyle = colours.signInk; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `800 52px ${FONT}`; ctx.fillText('Opening soon', 256, 42, 470)
      ctx.fillStyle = colours.labelInk; ctx.font = `600 30px ${FONT}`
      wrapLines('Nothing is on the shelves yet. Tap the counter to message the seller.', 450, 3, (text) => ctx.measureText(text).width).forEach((line, at) => ctx.fillText(line, 256, 128 + at * 44))
      const texture = new THREE.CanvasTexture(stand)
      texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4
      const material = new THREE.MeshBasicMaterial({ map: texture, color: '#f4eee4', toneMapped: false })
      const board = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.56), material)
      const holder = new THREE.Group(); holder.position.set(0.65, 1.28, -0.5); holder.rotation.x = -0.12
      const back = new THREE.Mesh(frameGeometry, frameMaterial); back.scale.set(0.94, 0.6, 0.03); back.position.z = -0.016
      board.userData['pick'] = { kind: 'counter' } satisfies RoomPick
      holder.add(back, board); cards.add(holder); pickables.push(board)
      cardResources.push(texture, material, board.geometry)
    }
    buildPlaque()
  }

  // ---- "more items": an arrow board on the right-hand wall, only when there is more than one page ----
  let plaque: THREE_TYPES.Mesh | null = null
  function buildPlaque(): void {
    if (plaque) { cards.remove(plaque); const material = plaque.material as THREE_TYPES.MeshBasicMaterial; material.map?.dispose(); material.dispose(); plaque.geometry.dispose(); plaque = null }
    const pages = pageCount(data.items.length)
    if (pages < 2) return
    const { canvas: board, ctx } = canvasOf(768, 240)
    ctx.fillStyle = colours.sign; ctx.fillRect(0, 0, 768, 240)
    ctx.strokeStyle = colours.accent; ctx.lineWidth = 6; roundedRect(ctx, 10, 10, 748, 220, 18); ctx.stroke()
    ctx.fillStyle = colours.signInk; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.font = `800 64px ${FONT}`
    ctx.globalAlpha = page > 0 ? 1 : 0.28; ctx.fillText('←', 100, 112)
    ctx.globalAlpha = page < pages - 1 ? 1 : 0.28; ctx.fillText('→', 668, 112)
    ctx.globalAlpha = 1
    ctx.font = `800 46px ${FONT}`; ctx.fillText(page < pages - 1 ? 'More items' : 'Earlier items', 384, 98, 440)
    ctx.font = `600 32px ${FONT}`; ctx.fillText(`Page ${page + 1} of ${pages}`, 384, 156)
    const texture = new THREE.CanvasTexture(board)
    texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4
    plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.47), new THREE.MeshBasicMaterial({ map: texture, color: '#f4eee4', toneMapped: false }))
    plaque.position.set(2.96, 2.55, 0.1); plaque.rotation.y = -Math.PI / 2
    plaque.userData['pick'] = { kind: 'page', step: 1 } satisfies RoomPick
    cards.add(plaque); pickables.push(plaque)
  }

  // ---- the shopkeeper, behind the counter ----
  const kit = createKit()
  const keeper = buildAvatar(kit, undefined, { seed: `keeper:${data.name}`, pose: 'stand', scale: 0.6, detail: 'medium', x: -0.2, z: -1.25, ry: 0 })
  scene.add(keeper)
  keeper.traverse((node) => { node.userData['pick'] = { kind: 'counter' } satisfies RoomPick; if ((node as THREE_TYPES.Mesh).isMesh) pickables.push(node) })
  const counterHit = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.1, 0.9), new THREE.MeshBasicMaterial({ visible: false }))
  counterHit.position.set(0, 0.55, -0.55); counterHit.userData['pick'] = { kind: 'counter' } satisfies RoomPick
  scene.add(counterHit); pickables.push(counterHit)

  // ---- the camera ----
  let portrait = false
  const now: Look = { ...START }
  let goal: Look | null = null
  const point = (): void => {
    const f = now.dolly
    camera.position.set(CAMERA_FAR.x + (CAMERA_NEAR.x - CAMERA_FAR.x) * f, CAMERA_FAR.y + (CAMERA_NEAR.y - CAMERA_FAR.y) * f, CAMERA_FAR.z + (CAMERA_NEAR.z - CAMERA_FAR.z) * f)
    camera.rotation.order = 'YXZ'
    camera.rotation.set(now.pitch, now.yaw, 0)
  }
  function size(): void {
    const width = Math.max(1, canvas.clientWidth || canvas.width), height = Math.max(1, canvas.clientHeight || canvas.height)
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    // A tall, narrow screen needs a wide vertical angle to see the room's width; a wide screen a normal one.
    camera.fov = camera.aspect < 0.8 ? 72 : camera.aspect < 1.2 ? 64 : 52
    portrait = camera.aspect < 0.8
    camera.updateProjectionMatrix()
  }
  function draw(): void {
    frame = 0; dirty = false
    if (gone) return
    point()
    renderer.render(scene, camera)
    renders += 1
    calls = renderer.info.render.calls; triangles = renderer.info.render.triangles
  }
  function invalidate(): void { if (gone || frame || looping) { dirty = true; return } frame = requestAnimationFrame(draw) }
  function ease(): void {
    if (gone || !goal) { looping = false; return }
    const k = 0.2
    now.yaw += (goal.yaw - now.yaw) * k; now.pitch += (goal.pitch - now.pitch) * k; now.dolly += (goal.dolly - now.dolly) * k
    const done = Math.abs(goal.yaw - now.yaw) < 0.002 && Math.abs(goal.pitch - now.pitch) < 0.002 && Math.abs(goal.dolly - now.dolly) < 0.004
    if (done) { Object.assign(now, goal); goal = null }
    draw()
    if (goal) frame = requestAnimationFrame(ease)
    else { looping = false; if (dirty) invalidate() }
  }
  function goTo(next: Look): void {
    // A tall narrow screen sees little of the width: it looks down a little more and stands further in at the sides.
    goal = portrait ? { yaw: next.yaw * 1.15, pitch: next.pitch - 0.1, dolly: next === VIEWS.room ? 0 : next.dolly * 0.7 } : { ...next }
    if (!looping) { looping = true; if (frame) cancelAnimationFrame(frame); frame = requestAnimationFrame(ease) }
  }

  // ---- looking and tapping ----
  const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2()
  const pointers = new Map<number, { x: number; y: number }>()
  let travelled = 0, pinch = 0
  const clampLook = (): void => { now.yaw = Math.min(YAW_LIMIT, Math.max(-YAW_LIMIT, now.yaw)); now.pitch = Math.min(PITCH_LIMIT, Math.max(-PITCH_LIMIT, now.pitch)); now.dolly = Math.min(1, Math.max(0, now.dolly)) }
  const spread = (): number => { const [a, b] = [...pointers.values()]; return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0 }
  function down(event: PointerEvent): void {
    canvas.setPointerCapture?.(event.pointerId)
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    travelled = 0; pinch = spread()
  }
  function move(event: PointerEvent): void {
    const last = pointers.get(event.pointerId)
    if (!last) return
    const dx = event.clientX - last.x, dy = event.clientY - last.y
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    travelled += Math.abs(dx) + Math.abs(dy)
    goal = null
    if (pointers.size >= 2) {
      const now2 = spread()
      if (pinch > 0 && now2 > 0) { now.dolly += (now2 - pinch) / 320; pinch = now2 }
    } else if (travelled > 6) {
      const per = camera.fov * (Math.PI / 180) / Math.max(1, canvas.clientHeight)
      now.yaw += dx * per; now.pitch += dy * per
    }
    clampLook(); invalidate()
  }
  function up(event: PointerEvent): void {
    const had = pointers.delete(event.pointerId)
    canvas.releasePointerCapture?.(event.pointerId)
    if (!had || travelled > 6 || pointers.size > 0) return
    const rect = canvas.getBoundingClientRect()
    ndc.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -(((event.clientY - rect.top) / rect.height) * 2 - 1))
    point(); camera.updateMatrixWorld(true)
    raycaster.setFromCamera(ndc, camera)
    const hit = raycaster.intersectObjects(pickables, false)[0]
    const pick = hit?.object.userData['pick'] as RoomPick | undefined
    if (!hit || !pick) return
    if (pick.kind === 'page') {
      const pages = pageCount(data.items.length), right = (hit.uv?.x ?? 1) >= 0.5
      const target = right ? Math.min(pages - 1, page + 1) : Math.max(0, page - 1)
      if (target === page) return
      const step = target > page ? 1 : -1
      api.setPage(target)
      events.pick({ kind: 'page', step })
      return
    }
    events.pick(pick)
  }
  function wheel(event: WheelEvent): void { event.preventDefault(); goal = null; now.dolly -= event.deltaY / 900; clampLook(); invalidate() }
  /** Arrows turn and tilt the view, + and - move in and out. True when the key was one of those. */
  function nudge(name: string): boolean {
    const turn: Record<string, [number, number, number]> = { ArrowLeft: [0.12, 0, 0], ArrowRight: [-0.12, 0, 0], ArrowUp: [0, 0.06, 0], ArrowDown: [0, -0.06, 0], '+': [0, 0, 0.1], '=': [0, 0, 0.1], '-': [0, 0, -0.1] }
    const step = turn[name]
    if (!step) return false
    goal = null; now.yaw += step[0]; now.pitch += step[1]; now.dolly += step[2]; clampLook(); invalidate()
    return true
  }
  canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up)
  canvas.addEventListener('wheel', wheel, { passive: false })
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { size(); invalidate() }) : null
  observer?.observe(canvas)
  const hidden = (): void => { if (!document.hidden) invalidate() }
  document.addEventListener('visibilitychange', hidden)

  const api: RoomScene = {
    setPage(next) { const at = clampPage(next, data.items.length); if (at === page && cards.children.length) return; page = at; buildCards(); invalidate() },
    view(name) { goTo(VIEWS[name]) },
    nudge,
    resize() { size(); invalidate() },
    diagnostics: () => ({ renders, looping, triangles, calls, page, pages: pageCount(data.items.length) }),
    dispose() {
      gone = true
      if (frame) cancelAnimationFrame(frame)
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up)
      canvas.removeEventListener('wheel', wheel)
      observer?.disconnect(); document.removeEventListener('visibilitychange', hidden)
      clearCards(); if (plaque) { (plaque.material as THREE_TYPES.MeshBasicMaterial).map?.dispose(); (plaque.material as THREE_TYPES.Material).dispose(); plaque.geometry.dispose() }
      for (const item of disposables) item.dispose()
      room.traverse((node) => { const mesh = node as THREE_TYPES.Mesh; if (!mesh.isMesh) return; mesh.geometry.dispose(); const material = mesh.material as THREE_TYPES.MeshStandardMaterial; material.map?.dispose(); material.dispose() })
      kit.dispose(); counterHit.geometry.dispose()
      renderer.dispose(); renderer.forceContextLoss()
    },
  }
  size(); if (portrait) now.pitch = START.pitch - 0.1
  buildCards(); draw()
  return api
}
