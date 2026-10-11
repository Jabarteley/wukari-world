// The 3D shop: a goods shop (counter, shelf units, rail) or, for services, an office with a reception desk and a service menu board; built from
// boxes and planes in the shop's colours (roomBuild.ts), with the shop's name on the sign, its photos on a photos wall and the seller's own
// items as the only goods in the room. Loaded only when a visitor steps inside (never in the first download).
//
// Everything the seller wrote is drawn as text into a canvas; nothing here builds markup. Photos come only from the game's own photo
// store (roomPhotoUrl). The scene draws on demand: a frame is drawn when something changed (a size, a page, a picture that arrived,
// a drag) and, while the camera eases to a view, until it arrives; it never runs a timer of its own.
import type * as THREE_TYPES from 'three'
import { applyRendererLook, renderTier } from '../../../../scene/look.ts'
import { createKit } from '../../../../scene/kit.ts'
import { buildAvatar, normalizeLook } from '../../../../scene/characters.ts'
import { buildGoods, buildOffice, drawPhotoWall } from './roomBuild.ts'
import type { Build, Fittings } from './roomBuild.ts'
import { FONT, drawCover, drawMenuBoard, drawPanel, drawShelfLabel, roundedRect } from './roomCanvas.ts'
import { EASEL_LEDGE, clampPage, menuHit, menuPageOf, menuPages, mixHex, pageCount, pageOf, pageSizeOf, placementOf, roomColours, roomPhotoUrl } from './roomModel.ts'
import type { RoomData } from './roomModel.ts'

export type RoomPick = { kind: 'item'; index: number } | { kind: 'counter' } | { kind: 'page'; step: 1 | -1 } | { kind: 'photos' } | { kind: 'menu' }
export type RoomView = 'room' | 'left' | 'counter' | 'right' | 'more' | 'menu' | 'portfolio'
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

/** The camera: a visitor standing at the door, looking in. yaw 0 looks at the back wall; positive turns to the left wall. */
interface Look { x: number; yaw: number; pitch: number; dolly: number }
const START: Look = { x: 0, yaw: 0, pitch: -0.06, dolly: 0 }
const GOODS_VIEWS: Partial<Record<RoomView, Look>> = {
  room: START,
  left: { x: -0.9, yaw: 0.33, pitch: -0.05, dolly: 0.6 },
  right: { x: 0.9, yaw: -0.33, pitch: -0.05, dolly: 0.6 },
  counter: { x: 0.3, yaw: -0.05, pitch: -0.2, dolly: 0.72 },
  more: { x: 0.6, yaw: -0.85, pitch: 0.1, dolly: 0.6 },
}
const OFFICE_VIEWS: Partial<Record<RoomView, Look>> = {
  room: START,
  menu: { x: 1.3, yaw: 0, pitch: -0.01, dolly: 0.8 },
  portfolio: { x: 0.6, yaw: -0.87, pitch: -0.02, dolly: 0.4 },
}
const YAW_LIMIT = 1.25, PITCH_LIMIT = 0.5, X_LIMIT = 1.6
/** Where the camera stands: the door end of the room, moving in towards the visitor's spot as the visitor zooms. */
const CAMERA_FAR = { y: 1.6, z: 2.5 }, CAMERA_NEAR = { y: 1.5, z: 0.7 }

function canvasOf(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas')
  canvas.width = width; canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no 2d canvas')
  return { canvas, ctx }
}

export async function createRoomScene(canvas: HTMLCanvasElement, data: RoomData, events: RoomEvents): Promise<RoomScene> {
  const THREE = await import('three')
  const service = data.kind === 'service'
  const colours = roomColours(data.colours)
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' })
  const tier = applyRendererLook(THREE, renderer, renderTier(), { shadows: false })
  renderer.setPixelRatio(Math.min(tier.pixelRatio, globalThis.devicePixelRatio || 1))
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(mixHex(colours.sign, '#000000', 0.72))
  const camera = new THREE.PerspectiveCamera(60, 1, 0.05, 40)

  const disposables: { dispose(): void }[] = []
  const track = <T extends { dispose(): void }>(item: T): T => { disposables.push(item); return item }
  let renders = 0, looping = false, frame = 0, dirty = false, gone = false
  let calls = 0, triangles = 0
  const anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())
  const texture = (source: HTMLCanvasElement): THREE_TYPES.CanvasTexture => {
    const made = track(new THREE.CanvasTexture(source))
    made.colorSpace = THREE.SRGBColorSpace; made.anisotropy = anisotropy
    return made
  }
  const basic = (map: THREE_TYPES.Texture): THREE_TYPES.MeshBasicMaterial => track(new THREE.MeshBasicMaterial({ map, color: '#f4eee4', toneMapped: false }))

  // ---- the room: walls tinted from the shop's colour, a warm light and a soft fill ----
  const build: Build = { THREE, parent: scene, colours, data, track, texture, canvas: canvasOf }
  const fittings: Fittings = service ? buildOffice(build) : buildGoods(build, data.theme)
  scene.add(new THREE.HemisphereLight('#fff1d9', '#b98a5e', 1.5))
  const bulb = new THREE.PointLight('#ffdfae', 14, 11, 1.6)
  bulb.position.set(0, 2.85, 0.4)
  scene.add(bulb)

  const pickables: THREE_TYPES.Object3D[] = []
  fittings.deskHit.userData['pick'] = { kind: 'counter' } satisfies RoomPick
  pickables.push(fittings.deskHit)

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

  // ---- the photos wall ----
  if (fittings.photos) {
    const wall = fittings.photos, { canvas: wallCanvas, ctx: wallCtx } = canvasOf(wall.width, wall.height)
    const shown = data.photos.slice(0, wall.cols * wall.rows), photoImages: (HTMLImageElement | null)[] = shown.map(() => null)
    const wallTexture = texture(wallCanvas)
    wall.mesh.material = basic(wallTexture)
    const repaint = (): void => { drawPhotoWall(wallCtx, wall.width, wall.height, wall.cols, wall.rows, photoImages, colours, shown.length, drawCover); wallTexture.needsUpdate = true }
    repaint()
    shown.forEach((photo, at) => {
      const image = picture(photo.id, () => { photoImages[at] = images.get(photo.id) as HTMLImageElement; repaint(); invalidate() })
      if (image) { photoImages[at] = image; repaint() }
    })
    wall.mesh.userData['pick'] = { kind: 'photos' } satisfies RoomPick
    pickables.push(wall.mesh)
  }

  // ---- a goods shop: each item is a product panel on a shelf, on an easel or on a hanger ----
  const cards = new THREE.Group()
  scene.add(cards)
  let page = 0
  const size = pageSizeOf(data.kind)
  const frameGeometry = track(new THREE.BoxGeometry(1, 1, 1))
  const frameMaterial = track(new THREE.MeshLambertMaterial({ color: mixHex('#3a2a1c', colours.sign, 0.25) }))
  const ledgeMaterial = track(new THREE.MeshLambertMaterial({ color: '#a07040' }))
  const wireMaterial = track(new THREE.MeshLambertMaterial({ color: '#8a8a90' }))
  const faceGeometries = new Map<string, THREE_TYPES.PlaneGeometry>()
  const faceGeometry = (w: number, h: number): THREE_TYPES.PlaneGeometry => { const key = `${w}x${h}`; let found = faceGeometries.get(key); if (!found) { found = track(new THREE.PlaneGeometry(w, h)); faceGeometries.set(key, found) } return found }
  let cardResources: { dispose(): void }[] = []
  function clearCards(): void {
    for (const child of [...cards.children]) cards.remove(child)
    for (const item of cardResources) item.dispose()
    cardResources = []
    for (let at = pickables.length - 1; at >= 0; at -= 1) { const kind = (pickables[at]?.userData['pick'] as RoomPick | undefined)?.kind; if (kind === 'item') pickables.splice(at, 1) }
  }
  function buildCards(): void {
    clearCards()
    for (const { item, slot, index } of pageOf(data.items, page)) {
      const place = placementOf(slot)
      const holder = new THREE.Group()
      holder.position.set(place.x, place.y, place.z); holder.rotation.x = place.tilt
      const frame = new THREE.Mesh(frameGeometry, frameMaterial)
      frame.scale.set(place.w + 0.04, place.h + 0.04, 0.03); frame.position.z = -0.016
      holder.add(frame)
      const { canvas: art, ctx } = canvasOf(320, Math.round(320 * (place.h / place.w)))
      const draw = (): void => { drawPanel(ctx, art.width, art.height, item, colours, item.photo ? ((images.get(item.photo) as HTMLImageElement | undefined) ?? null) : null) }
      draw()
      const map = new THREE.CanvasTexture(art)
      map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = anisotropy
      const material = new THREE.MeshBasicMaterial({ map, color: '#f4eee4', toneMapped: false })
      const face = new THREE.Mesh(faceGeometry(place.w, place.h), material)
      face.userData['pick'] = { kind: 'item', index } satisfies RoomPick
      holder.add(face); cards.add(holder); pickables.push(face)
      cardResources.push(map, material)
      if (place.label) {
        const { canvas: tag, ctx: tagCtx } = canvasOf(320, Math.round(320 * (place.label.h / place.label.w)))
        drawShelfLabel(tagCtx, tag.width, tag.height, item, colours)
        const tagMap = new THREE.CanvasTexture(tag)
        tagMap.colorSpace = THREE.SRGBColorSpace; tagMap.anisotropy = anisotropy
        const tagMaterial = new THREE.MeshBasicMaterial({ map: tagMap, color: '#f4eee4', toneMapped: false })
        const label = new THREE.Mesh(faceGeometry(place.label.w, place.label.h), tagMaterial)
        label.position.set(place.label.x, place.label.y, place.label.z)
        label.userData['pick'] = { kind: 'item', index } satisfies RoomPick
        cards.add(label); pickables.push(label)
        cardResources.push(tagMap, tagMaterial)
      }
      if (slot.kind === 'counter') {
        const ledge = new THREE.Mesh(frameGeometry, ledgeMaterial)
        ledge.scale.set(place.w + 0.06, EASEL_LEDGE, 0.16); ledge.position.set(slot.x, slot.y + EASEL_LEDGE / 2, slot.z + 0.015)
        cards.add(ledge)
      } else if (slot.kind === 'rail') {
        const hook = new THREE.Mesh(frameGeometry, wireMaterial); hook.scale.set(0.015, 0.2, 0.015); hook.position.set(slot.x, slot.y + 0.05, slot.z)
        const bar = new THREE.Mesh(frameGeometry, wireMaterial); bar.scale.set(place.w * 0.7, 0.018, 0.018); bar.position.set(slot.x, slot.y - 0.055, slot.z + 0.02)
        cards.add(hook, bar)
      }
      if (item.photo) picture(item.photo, () => { if (!cardResources.includes(map)) return; draw(); map.needsUpdate = true; invalidate() })
    }
    buildPageBoard()
  }

  // ---- goods: the board on the right-hand wall for more items ----
  function buildPageBoard(): void {
    const board = fittings.pageBoard
    if (!board) return
    const pages = pageCount(data.items.length, size)
    board.visible = pages > 1
    for (let at = pickables.length - 1; at >= 0; at -= 1) if (pickables[at] === board) pickables.splice(at, 1)
    if (pages < 2) return
    const { canvas: face, ctx } = canvasOf(768, 240)
    ctx.fillStyle = colours.sign; ctx.fillRect(0, 0, 768, 240)
    ctx.strokeStyle = colours.accent; ctx.lineWidth = 6; roundedRect(ctx, 10, 10, 748, 220, 18); ctx.stroke()
    ctx.fillStyle = colours.signInk; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.font = `800 64px ${FONT}`
    ctx.globalAlpha = page > 0 ? 1 : 0.28; ctx.fillText('←', 100, 112)
    ctx.globalAlpha = page < pages - 1 ? 1 : 0.28; ctx.fillText('→', 668, 112)
    ctx.globalAlpha = 1
    ctx.font = `800 46px ${FONT}`; ctx.fillText(page < pages - 1 ? 'More items' : 'Earlier items', 384, 98, 440)
    ctx.font = `600 32px ${FONT}`; ctx.fillText(`Page ${page + 1} of ${pages}`, 384, 156)
    const old = board.material as THREE_TYPES.MeshBasicMaterial
    old.map?.dispose(); old.dispose()
    board.material = new THREE.MeshBasicMaterial({ map: (() => { const m = new THREE.CanvasTexture(face); m.colorSpace = THREE.SRGBColorSpace; m.anisotropy = anisotropy; return m })(), color: '#f4eee4', toneMapped: false })
    board.userData['pick'] = { kind: 'page', step: 1 } satisfies RoomPick
    pickables.push(board)
  }

  // ---- an office: the service menu board ----
  const menuCanvas = service ? canvasOf(1536, 922) : null
  const menuMap = menuCanvas ? texture(menuCanvas.canvas) : null
  function drawMenu(): void {
    if (!menuCanvas || !menuMap || !fittings.menu) return
    drawMenuBoard(menuCanvas.ctx, menuCanvas.canvas.width, menuCanvas.canvas.height, { name: data.name }, data.items, page, colours)
    menuMap.needsUpdate = true
  }
  if (menuMap && fittings.menu) {
    fittings.menu.material = basic(menuMap)
    fittings.menu.userData['pick'] = { kind: 'menu' } satisfies RoomPick
    pickables.push(fittings.menu)
    drawMenu()
  }
  /** Empty goods shops and empty offices say so on their own fittings: the menu board above, and here a small stand on the counter. */
  function buildOpeningSoon(): void {
    if (service || data.items.length) return
    const { canvas: stand, ctx } = canvasOf(512, 320)
    ctx.fillStyle = colours.label; ctx.fillRect(0, 0, 512, 320)
    ctx.fillStyle = colours.sign; ctx.fillRect(0, 0, 512, 78)
    ctx.fillStyle = colours.signInk; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `800 52px ${FONT}`; ctx.fillText('Opening soon', 256, 42, 470)
    ctx.fillStyle = colours.labelInk; ctx.font = `600 30px ${FONT}`
    ;['Nothing is on the shelves yet.', 'Tap the counter to message', 'the seller.'].forEach((line, at) => ctx.fillText(line, 256, 128 + at * 44))
    const map = texture(stand)
    const holder = new THREE.Group(); holder.position.set(0.85, 1.36, -0.62); holder.rotation.x = -0.12
    const back = new THREE.Mesh(frameGeometry, frameMaterial); back.scale.set(0.88, 0.56, 0.03); back.position.z = -0.016
    const boardFace = new THREE.Mesh(track(new THREE.PlaneGeometry(0.84, 0.52)), basic(map))
    boardFace.userData['pick'] = { kind: 'counter' } satisfies RoomPick
    holder.add(back, boardFace); scene.add(holder); pickables.push(boardFace)
  }
  buildOpeningSoon()

  // ---- the shopkeeper (or the person at the desk), behind the counter ----
  const kit = createKit()
  // A neat figure behind the counter: the first look this shop's name gives that is not in a hard hat.
  let seed = `keeper:${data.name}`
  for (let at = 0; at < 12 && normalizeLook(undefined, seed).outfit === 'sitework'; at += 1) seed = `keeper:${data.name}:${at}`
  const keeper = buildAvatar(kit, undefined, { seed, pose: 'stand', scale: 0.6, detail: 'medium', x: fittings.keeper.x, z: fittings.keeper.z, ry: 0 })
  scene.add(keeper)
  keeper.traverse((node) => { node.userData['pick'] = { kind: 'counter' } satisfies RoomPick; if ((node as THREE_TYPES.Mesh).isMesh) pickables.push(node) })

  // ---- the camera ----
  let portrait = false
  const now: Look = { ...START }
  let goal: Look | null = null
  const point = (): void => {
    const f = now.dolly
    camera.position.set(now.x, CAMERA_FAR.y + (CAMERA_NEAR.y - CAMERA_FAR.y) * f, CAMERA_FAR.z + (CAMERA_NEAR.z - CAMERA_FAR.z) * f)
    camera.rotation.order = 'YXZ'
    camera.rotation.set(now.pitch, now.yaw, 0)
  }
  function fit(): void {
    const width = Math.max(1, canvas.clientWidth || canvas.width), height = Math.max(1, canvas.clientHeight || canvas.height)
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    // A tall, narrow screen needs a wide vertical angle to see the room's width; a wide screen a normal one.
    camera.fov = camera.aspect < 0.5 ? 80 : camera.aspect < 0.8 ? 72 : camera.aspect < 1.2 ? 64 : 58
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
    now.x += (goal.x - now.x) * k; now.yaw += (goal.yaw - now.yaw) * k; now.pitch += (goal.pitch - now.pitch) * k; now.dolly += (goal.dolly - now.dolly) * k
    const done = Math.abs(goal.x - now.x) < 0.004 && Math.abs(goal.yaw - now.yaw) < 0.002 && Math.abs(goal.pitch - now.pitch) < 0.002 && Math.abs(goal.dolly - now.dolly) < 0.004
    if (done) { Object.assign(now, goal); goal = null }
    draw()
    if (goal) frame = requestAnimationFrame(ease)
    else { looping = false; if (dirty) invalidate() }
  }
  function goTo(next: Look, home: boolean): void {
    // A tall narrow screen sees little of the width: it looks down a little more and stands further back at the sides.
    goal = portrait ? { x: next.x, yaw: next.yaw * 1.3, pitch: next.pitch - 0.1, dolly: home ? 0 : next.dolly * 0.7 } : { ...next }
    if (!looping) { looping = true; if (frame) cancelAnimationFrame(frame); frame = requestAnimationFrame(ease) }
  }

  // ---- looking and tapping ----
  const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2()
  const pointers = new Map<number, { x: number; y: number }>()
  let travelled = 0, pinch = 0
  const clampLook = (): void => { now.x = Math.min(X_LIMIT, Math.max(-X_LIMIT, now.x)); now.yaw = Math.min(YAW_LIMIT, Math.max(-YAW_LIMIT, now.yaw)); now.pitch = Math.min(PITCH_LIMIT, Math.max(-PITCH_LIMIT, now.pitch)); now.dolly = Math.min(1, Math.max(0, now.dolly)) }
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
      const apart = spread()
      if (pinch > 0 && apart > 0) { now.dolly += (apart - pinch) / 320; pinch = apart }
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
    const hit = raycaster.intersectObjects(pickables, false).find((found) => found.object.visible)
    const pick = hit?.object.userData['pick'] as RoomPick | undefined
    if (!hit || !pick) return
    const pages = pageCount(data.items.length, size)
    if (pick.kind === 'menu') {
      const onPage = menuPageOf(data.items, page)
      const found = menuHit(hit.uv?.x ?? 0, 1 - (hit.uv?.y ?? 0), onPage.length, page, menuPages(data.items.length))
      if (found?.kind === 'item') { const entry = onPage[found.row]; if (entry) events.pick({ kind: 'item', index: entry.index }) }
      else if (found?.kind === 'page') { api.setPage(page + found.step); events.pick({ kind: 'page', step: found.step }) }
      return
    }
    if (pick.kind === 'page') {
      const right = (hit.uv?.x ?? 1) >= 0.5
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
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { fit(); invalidate() }) : null
  observer?.observe(canvas)
  const hidden = (): void => { if (!document.hidden) invalidate() }
  document.addEventListener('visibilitychange', hidden)

  const api: RoomScene = {
    setPage(next) {
      const at = clampPage(next, data.items.length, size)
      if (at === page && (service || cards.children.length || !data.items.length)) return
      page = at
      if (service) drawMenu(); else buildCards()
      invalidate()
    },
    view(name) { const views = service ? OFFICE_VIEWS : GOODS_VIEWS; const look = views[name]; if (look) goTo(look, name === 'room') },
    nudge,
    resize() { fit(); invalidate() },
    diagnostics: () => ({ renders, looping, triangles, calls, page, pages: pageCount(data.items.length, size) }),
    dispose() {
      gone = true
      if (frame) cancelAnimationFrame(frame)
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up)
      canvas.removeEventListener('wheel', wheel)
      observer?.disconnect(); document.removeEventListener('visibilitychange', hidden)
      clearCards()
      const board = fittings.pageBoard?.material as THREE_TYPES.MeshBasicMaterial | undefined
      board?.map?.dispose(); board?.dispose()
      for (const item of disposables) item.dispose()
      kit.dispose()
      renderer.dispose(); renderer.forceContextLoss()
    },
  }
  fit(); if (portrait) now.pitch = START.pitch - 0.1
  if (!service) buildCards()
  draw()
  return api
}
