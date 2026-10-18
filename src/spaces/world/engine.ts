/**
 * OWNER: spaces
 * THE 3D SPACE SCREEN'S ENGINE (docs/SPACES-3D.md, phase 2): one renderer in the realistic look, the space (./space.ts), a walker
 * (./walk.ts) in first or third person, and the editing of players' models. The Vue screen (WorldScreen.vue) owns the buttons;
 * this owns the canvas, the frame loop and the input on it.
 *
 * Input. Phone: the left thumb's stick walks (src/app/features/spaces/WorldScreen.vue sends it here), dragging anywhere else looks.
 * Computer: W A S D or the arrows walk, Shift runs, dragging looks. While editing, a tap on a floor puts the chosen model there.
 */
import { WORLD, type Placement } from '../layout.ts'
import { createLook, aimSun, THREE } from './look.ts'
import { buildSpace, type BuiltSpace, type SpaceInput } from './space.ts'
import { moveOf, step, WALKER, type Ground, type Walker } from './walk.ts'
import type { Physics } from './physics.ts'
import { playSound, runScript, type ScriptRunner } from './scripting.ts'
import type { ScriptOp, SpaceScript } from '../script.ts'
import type { PlacedModel } from '../../types/spaces.ts'

export type View = 'first' | 'third'
export interface EngineEvents {
  /** The walker changed floor, or the view changed. */
  status(status: { floor: number; floors: number; view: View }): void
  /** In edit mode, a tap picked a placed model (or nothing). */
  picked(key: string | null): void
  /** In edit mode, a tap on a floor: where the chosen model should go. */
  tapped(at: { x: number; y: number; z: number; floor: number }): void
  /** Physics is running (or could not start: the walker then keeps to the floor plan). */
  physics?(state: 'on' | 'off'): void
  /** A running script showed one of the space's lines, set the score, or stopped / reported an error. */
  said?(text: string, line: number, values: number[]): void
  scored?(value: number): void
  scriptProblem?(message: string, stopped: boolean): void
}

export interface Engine {
  setStick(forward: number, right: number): void
  /** Jump (with physics). */
  jump(): void
  /** Pick up the loose model in front, or put down the one held; answers whether one is held now. */
  grab(): boolean
  throwHeld(): void
  setView(view: View): void
  setEditing(on: boolean): void
  setModels(list: readonly PlacedModel[]): Promise<void>
  /** Move one placed model's drawing at once (the layout is the screen's; this only shows it). */
  placeModel(p: Placement): void
  highlight(key: string | null): void
  /** Run a space's script (stopping the one before); null stops it. `names` are the models' names by placement key. */
  runScript(script: SpaceScript | null, names: ReadonlyMap<string, string>): void
  /** Together (phase 5): whether this device moves the models (the host), or follows the host's. */
  setAuthority(host: boolean): void
  /** Where the walker is: [x, y, z, yaw]. */
  pose(): number[]
  /** Send every model again on the next tick (someone new came in). */
  resendModels(): void
  /** The models that moved since the last call: [index in the layout, x, y, z, qx, qy, qz, qw]. */
  movedModels(order: readonly string[]): number[][]
  /** The host's models: put each where the host has it. */
  followModels(order: readonly string[], rows: readonly number[][]): void
  /** The other people here, by id: their name and where they are. */
  setPeers(peers: ReadonlyMap<string, { name: string; p: number[] }>): void
  /** A point a step in front of the walker, on its floor: where a newly chosen model appears. */
  inFront(): { x: number; z: number; floor: number }
  dispose(): void
}

export function startEngine(canvas: HTMLCanvasElement, input: SpaceInput & { models: readonly PlacedModel[] }, bytesOf: (hash: string) => Promise<ArrayBuffer | null>, events: EngineEvents): Engine {
  const phone = globalThis.matchMedia?.('(pointer: coarse)').matches ?? false
  const look = createLook(canvas, { quality: phone ? 'normal' : 'high', background: '#a9c7de' })
  const maxAniso = look.renderer.capabilities.getMaxAnisotropy()
  const space: BuiltSpace = buildSpace(input, maxAniso)
  look.scene.add(space.root)
  const { plot } = space.plan
  const W = plot.w * WORLD.tile, D = plot.d * WORLD.tile
  aimSun(look, new THREE.Vector3(W / 2, 0, D / 2), Math.max(W, D) * 0.8 + 2)
  look.scene.fog = new THREE.Fog('#a9c7de', 30, 90)

  // Warm light in each room of the floor the walker is on (no shadows: the sun and the room image do those).
  const lights: InstanceType<typeof THREE.PointLight>[] = []
  const lightRooms = (floor: number): void => {
    for (const light of lights) look.scene.remove(light)
    lights.length = 0
    for (const room of (space.plan.floors[floor] ?? []).slice(0, 8)) {
      const light = new THREE.PointLight('#ffe2b8', 6, Math.max(room.w, room.h) * 1.6, 2)
      light.position.set((room.x + room.w / 2) * WORLD.tile, floor * WORLD.storey + 2.5, (room.y + room.h / 2) * WORLD.tile)
      look.scene.add(light)
      lights.push(light)
    }
  }

  // A stand-in body for third person: the player's own avatar can come later.
  const body = new THREE.Group()
  const skin = new THREE.MeshStandardMaterial({ color: '#8d5a3b', roughness: 0.6 }), shirt = new THREE.MeshStandardMaterial({ color: '#2f6fb0', roughness: 0.8 })
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.75, 6, 16), shirt)
  torso.position.y = 0.95
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 16), skin)
  head.position.y = 1.6
  for (const part of [torso, head]) { part.castShadow = true; body.add(part) }
  look.scene.add(body)

  const ground: Ground = {
    walls: (f) => space.walls(f), blocks: (f) => space.blocks(f), stairs: space.plan.stairs.map((s) => ({ ...s })),
    bounds: [-WORLD.margin + 0.5, -WORLD.margin + 0.5, W + WORLD.margin - 0.5, D + WORLD.margin - 0.5], floors: plot.floors,
  }
  // Start in the yard facing the front door (the left wall), a little outside.
  const doorZ = (plot.grid - 2 + 0.5) * WORLD.tile
  let walker: Walker = { x: -2, z: doorZ, y: 0, floor: 0, yaw: -Math.PI / 2, pitch: -0.08 }
  let view: View = 'third', editing = false
  const camera = new THREE.PerspectiveCamera(phone ? 70 : 62, 1, 0.05, 200)
  const keys = new Set<string>()
  let stick = { forward: 0, right: 0 }
  let lastFloor = -1, lastOutdoors: boolean | null = null
  const outdoorsAt = (x: number, z: number): boolean => x < 0 || z < 0 || x > W || z > D

  const report = (): void => { events.status({ floor: walker.floor, floors: plot.floors, view }) }
  const resize = (): void => {
    const w = canvas.clientWidth || 360, h = canvas.clientHeight || 640
    look.renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  resize()

  // Looking: drag on the canvas. A short tap (no drag) is a pick or a placement while editing. While editing, a drag that
  // starts on the chosen (highlighted) model slides it over the floors instead of looking round.
  const raycaster = new THREE.Raycaster()
  let drag: { id: number; x: number; y: number; moved: number; model: boolean } | null = null
  let lit: string | null = null
  const aim = (event: PointerEvent): void => {
    const rect = canvas.getBoundingClientRect()
    raycaster.setFromCamera(new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1), camera)
  }
  const modelAt = (event: PointerEvent): string | null => {
    aim(event)
    let node: InstanceType<typeof THREE.Object3D> | null = raycaster.intersectObjects(space.modelObjects().filter((o) => o.visible), true)[0]?.object ?? null
    while (node && !node.userData['key']) node = node.parent
    return node ? String(node.userData['key']) : null
  }
  /** Where the pointer meets a floor; while dragging `held`, where it meets the level that model stands on, so a drag across a wall still lands. */
  const floorAt = (event: PointerEvent, held: InstanceType<typeof THREE.Object3D> | null = null): { x: number; y: number; z: number; floor: number } | null => {
    aim(event)
    const floor = raycaster.intersectObjects(space.surfaces().filter((o) => o.visible && (o.parent?.visible ?? true)), false)[0]
    if (floor) {
      const f = typeof floor.object.userData['floor'] === 'number' ? floor.object.userData['floor'] as number : 0
      return { x: floor.point.x, y: 0, z: floor.point.z, floor: f }
    }
    if (!held) return null
    const level = new THREE.Plane(new THREE.Vector3(0, 1, 0), -held.position.y)
    const point = raycaster.ray.intersectPlane(level, new THREE.Vector3())
    return point ? { x: point.x, y: 0, z: point.z, floor: typeof held.userData['floor'] === 'number' ? held.userData['floor'] as number : 0 } : null
  }
  const onDown = (event: PointerEvent): void => {
    if (drag) return
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: 0, model: editing && lit !== null && modelAt(event) === lit }
    try { canvas.setPointerCapture?.(event.pointerId) } catch { /* a pointer the browser no longer tracks: the drag still works */ }
  }
  const onMove = (event: PointerEvent): void => {
    if (!drag || event.pointerId !== drag.id) return
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y
    drag.moved += Math.abs(dx) + Math.abs(dy)
    drag.x = event.clientX; drag.y = event.clientY
    if (drag.model) { const at = floorAt(event, lit ? space.modelObject(lit) ?? null : null); if (at) events.tapped(at); return }
    walker = { ...walker, yaw: walker.yaw - dx * 0.006, pitch: Math.max(-1.2, Math.min(0.9, walker.pitch - dy * 0.005)) }
  }
  const onUp = (event: PointerEvent): void => {
    if (!drag || event.pointerId !== drag.id) return
    const tap = drag.moved < 8 && !drag.model
    drag = null
    if (tap && !editing && script) {
      // A tap on a model reaches the script (space.on('tap', …)).
      const rect = canvas.getBoundingClientRect()
      raycaster.setFromCamera(new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1), camera)
      let node: InstanceType<typeof THREE.Object3D> | null = raycaster.intersectObjects(space.modelObjects().filter((o) => o.visible), true)[0]?.object ?? null
      while (node && !node.userData['key']) node = node.parent
      const name = node ? scriptNames.get(String(node.userData['key'])) : undefined
      if (name) script.tap(name)
      return
    }
    if (!tap || !editing) return
    const rect = canvas.getBoundingClientRect()
    raycaster.setFromCamera(new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1), camera)
    const models = raycaster.intersectObjects(space.modelObjects().filter((o) => o.visible), true)[0]
    if (models) {
      let node: InstanceType<typeof THREE.Object3D> | null = models.object
      while (node && !node.userData['key']) node = node.parent
      if (node) { events.picked(String(node.userData['key'])); return }
    }
    const floor = raycaster.intersectObjects(space.surfaces().filter((o) => o.visible && (o.parent?.visible ?? true)), false)[0]
    if (floor) {
      const f = typeof floor.object.userData['floor'] === 'number' ? floor.object.userData['floor'] as number : 0
      events.tapped({ x: floor.point.x, y: 0, z: floor.point.z, floor: f })
    } else events.picked(null)
  }
  const onKey = (event: KeyboardEvent): void => {
    const target = event.target as HTMLElement | null
    if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
    if (event.type === 'keydown') keys.add(event.key.toLowerCase()); else keys.delete(event.key.toLowerCase())
  }
  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointercancel', onUp)
  globalThis.addEventListener('keydown', onKey)
  globalThis.addEventListener('keyup', onKey)

  const blockers = (): InstanceType<typeof THREE.Object3D>[] => space.root.children.filter((c) => c.name.startsWith('floor-') && c.visible)
  const camTarget = new THREE.Vector3(), camWant = new THREE.Vector3()
  const clock = new THREE.Clock()
  let frame = 0
  const tick = (): void => {
    frame = requestAnimationFrame(tick)
    const dt = Math.min(clock.getDelta(), 0.1)
    let forward = stick.forward, right = stick.right
    if (keys.has('w') || keys.has('arrowup')) forward += 1
    if (keys.has('s') || keys.has('arrowdown')) forward -= 1
    if (keys.has('d')) right += 1
    if (keys.has('a')) right -= 1
    if (keys.has('arrowleft')) walker = { ...walker, yaw: walker.yaw + WALKER.turn * dt }
    if (keys.has('arrowright')) walker = { ...walker, yaw: walker.yaw - WALKER.turn * dt }
    const fast = keys.has('shift') || Math.hypot(stick.forward, stick.right) > 0.92
    const move = moveOf(walker.yaw, forward, right, fast ? WALKER.run : WALKER.walk, dt)
    if (physics) {
      const at = physics.walk({ x: move.dx, z: move.dz }, dt, jumping || keys.has(' '))
      jumping = false
      if (at.y < -10) physics.place({ x: -2, y: 0, z: doorZ })
      walker = { ...walker, x: at.x, y: at.y, z: at.z, floor: Math.max(0, Math.min(plot.floors - 1, Math.round(at.y / WORLD.storey))) }
    } else if (move.dx || move.dz) walker = { ...step(ground, walker, move.dx, move.dz), yaw: walker.yaw, pitch: walker.pitch }
    const outdoors = outdoorsAt(walker.x, walker.z)
    if (walker.floor !== lastFloor || outdoors !== lastOutdoors) { lastFloor = walker.floor; lastOutdoors = outdoors; space.show(walker.floor, view === 'first', outdoors); lightRooms(walker.floor); report() }

    body.position.set(walker.x, walker.y, walker.z)
    body.rotation.y = walker.yaw
    body.visible = view === 'third'
    const eye = walker.y + WALKER.eye
    if (view === 'first') {
      camera.position.set(walker.x, eye, walker.z)
      camera.rotation.set(walker.pitch, walker.yaw, 0, 'YXZ')
    } else {
      // Behind the walker and a little above, pulled in when a wall is in the way.
      camTarget.set(walker.x, eye - 0.15, walker.z)
      const back = 3.2, pitch = Math.max(-0.2, Math.min(1.1, 0.35 - walker.pitch))
      camWant.set(walker.x + Math.sin(walker.yaw) * Math.cos(pitch) * back, eye + Math.sin(pitch) * back, walker.z + Math.cos(walker.yaw) * Math.cos(pitch) * back)
      const dir = camWant.clone().sub(camTarget), len = dir.length()
      raycaster.set(camTarget, dir.normalize())
      raycaster.far = len
      const hit = raycaster.intersectObjects(blockers(), true)[0]
      raycaster.far = Infinity
      camera.position.copy(hit ? camTarget.clone().addScaledVector(dir, Math.max(0.3, hit.distance - 0.2)) : camWant)
      camera.lookAt(camTarget)
    }
    script?.tick(dt)
    // Other people glide to where they last said they were; the host's models glide to where the host has them.
    const k = Math.min(1, dt * 10)
    for (const peer of peers.values()) {
      const [x = 0, y = 0, z = 0, yaw = 0] = peer.target
      peer.group.position.lerp(new THREE.Vector3(x, y, z), k)
      peer.group.rotation.y += (((yaw - peer.group.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * k
      peer.group.visible = Math.round(peer.group.position.y / WORLD.storey) <= walker.floor || outdoorsAt(walker.x, walker.z)
    }
    if (!authority) for (const [key, want] of following) {
      const object = space.modelObject(key)
      if (!object) continue
      object.position.lerp(want.p, k)
      object.quaternion.slerp(want.q, k)
      physics?.moveModel(key, object)
    }
    if (physics) {
      eyeAt.set(walker.x, walker.y + WALKER.eye, walker.z)
      lookAt.set(-Math.sin(walker.yaw) * Math.cos(walker.pitch), Math.sin(walker.pitch), -Math.cos(walker.yaw) * Math.cos(walker.pitch))
      physics.step(dt, eyeAt, lookAt)
    }
    look.renderer.render(look.scene, camera)
  }
  // The space's script (phase 4): it runs in the sandbox; what it asks for is checked (src/spaces/script.ts) and applied here.
  let script: ScriptRunner | null = null, scriptRun = 0
  // Together: the host moves the models; everyone else follows them. Other people are drawn as walkers with their names.
  let authority = true
  const lastSentPose = new Map<string, string>()
  const peers = new Map<string, { group: InstanceType<typeof THREE.Group>; target: number[]; label: InstanceType<typeof THREE.Sprite> }>()
  const following = new Map<string, { p: InstanceType<typeof THREE.Vector3>; q: InstanceType<typeof THREE.Quaternion> }>()
  const shirtOf = (id: string): string => `hsl(${[...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)}, 55%, 45%)`
  const nameTag = (name: string): InstanceType<typeof THREE.Sprite> => {
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 64
    const g = canvas.getContext('2d')!
    g.fillStyle = 'rgba(20,24,28,0.7)'; g.beginPath(); g.roundRect(4, 8, 248, 48, 24); g.fill()
    g.fillStyle = '#fff'; g.font = '600 28px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
    g.fillText(name.slice(0, 18), 128, 33)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }))
    sprite.scale.set(1.2, 0.3, 1)
    sprite.position.y = 2.05
    sprite.renderOrder = 10
    return sprite
  }
  let scriptNames: ReadonlyMap<string, string> = new Map()
  const byName = (name: string): InstanceType<typeof THREE.Object3D> | undefined => {
    for (const [key, n] of scriptNames) if (n === name) return space.modelObject(key)
    return undefined
  }
  const tinted = new WeakSet<InstanceType<typeof THREE.Object3D>>()
  const applyOp = (op: ScriptOp): void => {
    if (op.op === 'say') { events.said?.(op.text, op.line, op.values); return }
    if (op.op === 'score') { events.scored?.(op.value); return }
    if (op.op === 'sound') { playSound(op.name); return }
    const object = byName(op.name)
    if (!object) return
    const key = String(object.userData['key'])
    if (op.op === 'move') { object.position.set(op.x, op.y, op.z); physics?.moveModel(key, object) }
    else if (op.op === 'turn') { object.rotation.y = (op.degrees * Math.PI) / 180; physics?.moveModel(key, object) }
    else if (op.op === 'push') physics?.pushModel(key, op)
    else if (op.op === 'show') { object.userData['hidden'] = !op.on; object.visible = op.on && (object.userData['floor'] ?? 0) <= walker.floor; physics?.showModel(key, op.on) }
    else if (op.op === 'color') {
      // Each placement gets its own copies of its materials the first time, so one model's colour leaves its copies alone.
      if (!tinted.has(object)) {
        tinted.add(object)
        object.traverse((n) => { const mesh = n as InstanceType<typeof THREE.Mesh>; if (mesh.isMesh) mesh.material = Array.isArray(mesh.material) ? mesh.material.map((m) => m.clone()) : mesh.material.clone() })
      }
      object.traverse((n) => {
        const mesh = n as InstanceType<typeof THREE.Mesh>
        if (mesh.isMesh) for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) (m as InstanceType<typeof THREE.MeshStandardMaterial>).color?.set(op.hex)
      })
    }
  }
  const scriptHost = {
    objects: () => [...scriptNames].flatMap(([key, name]) => {
      const o = space.modelObject(key)
      return o ? [{ name, x: o.position.x, y: o.position.y, z: o.position.z, ry: (o.rotation.y * 180) / Math.PI, loose: o.userData['loose'] === true }] : []
    }),
    walker: () => ({ x: walker.x, y: walker.y, z: walker.z, yaw: walker.yaw }),
    apply: applyOp,
    problem: (message: string, stopped: boolean) => events.scriptProblem?.(message, stopped),
  }

  // Physics: loaded beside the first frames; until it is ready (or if it cannot start) the walker keeps to the floor plan.
  let physics: Physics | null = null, jumping = false
  const eyeAt = new THREE.Vector3(), lookAt = new THREE.Vector3()
  const syncModels = (): void => {
    if (!physics) return
    const objects = space.modelObjects()
    const keyed = (o: InstanceType<typeof THREE.Object3D>) => ({ key: String(o.userData['key']), object: o })
    // A guest's device does not move loose models itself: they follow the host's, so every one of them is held where it is told.
    if (!authority) { physics.setModels(objects.map(keyed), []); return }
    physics.setModels(objects.filter((o) => !o.userData['loose']).map(keyed), objects.filter((o) => o.userData['loose']).map(keyed))
  }
  let closed = false
  const modelsReady = space.setModels(input.models, bytesOf)
  void import('./physics.ts').then(async ({ startPhysics }) => {
    const started = await startPhysics()
    if (closed) { started.dispose(); return }
    started.addStatic(space.root, (node) => !space.isShell(node) || node.name === 'models')
    started.addBoxes(space.furnitureBoxes())
    started.place({ x: walker.x, y: walker.y, z: walker.z })
    physics = started
    await modelsReady
    syncModels()
    events.physics?.('on')
  }).catch(() => { events.physics?.('off') })
  tick()

  return {
    setStick(f, r) { stick = { forward: f, right: r } },
    jump() { jumping = true },
    grab() { return physics ? physics.grab(eyeAt, lookAt) !== null : false },
    throwHeld() { physics?.throwHeld(lookAt) },
    setView(next) { view = next; space.show(walker.floor, view === 'first', outdoorsAt(walker.x, walker.z)); report() },
    setEditing(on) { editing = on },
    setModels: async (list) => { await space.setModels(list, bytesOf); syncModels() },
    placeModel(p) {
      const object = space.modelObject(p.k)
      if (!object) return
      object.position.set(p.x, p.floor * WORLD.storey + p.y, p.z)
      object.rotation.y = (p.ry * Math.PI) / 180
      object.scale.setScalar(p.s)
      object.userData['floor'] = p.floor
      object.userData['loose'] = p.loose === true
      syncModels()
    },
    highlight(key) {
      lit = key
      for (const object of space.modelObjects()) object.traverse((n) => {
        const mesh = n as InstanceType<typeof THREE.Mesh>
        if (!mesh.isMesh) return
        for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
          const std = m as InstanceType<typeof THREE.MeshStandardMaterial>
          if (!std.emissive) continue
          std.userData['emissive'] ??= std.emissive.getHex()
          std.emissive.setHex(object.userData['key'] === key ? 0x335577 : std.userData['emissive'] as number)
        }
      })
    },
    setAuthority(host) {
      if (host === authority) return
      authority = host
      following.clear()
      syncModels()
    },
    resendModels() { lastSentPose.clear() },
    pose: () => [walker.x, walker.y, walker.z, walker.yaw].map((v) => Math.round(v * 100) / 100),
    movedModels(order) {
      const rows: number[][] = []
      order.forEach((key, i) => {
        const o = space.modelObject(key)
        if (!o) return
        const row = [i, o.position.x, o.position.y, o.position.z, o.quaternion.x, o.quaternion.y, o.quaternion.z, o.quaternion.w].map((v, j) => (j === 0 ? v : Math.round(v * 1000) / 1000))
        const text = row.join()
        if (lastSentPose.get(key) === text) return
        lastSentPose.set(key, text)
        rows.push(row)
      })
      return rows.slice(0, 40)
    },
    followModels(order, rows) {
      for (const [i, x, y, z, qx, qy, qz, qw] of rows) {
        const key = order[i ?? -1]
        if (!key) continue
        following.set(key, { p: new THREE.Vector3(x, y, z), q: new THREE.Quaternion(qx, qy, qz, qw).normalize() })
      }
    },
    setPeers(next) {
      for (const [id, peer] of peers) if (!next.has(id)) { look.scene.remove(peer.group); disposeGroup(peer.group); peers.delete(id) }
      for (const [id, { name, p }] of next) {
        let peer = peers.get(id)
        if (!peer) {
          const group = new THREE.Group()
          const shirtMat = new THREE.MeshStandardMaterial({ color: shirtOf(id), roughness: 0.8 })
          const t = new THREE.Mesh(torso.geometry, shirtMat), h = new THREE.Mesh(head.geometry, skin)
          t.position.y = 0.95; h.position.y = 1.6; t.castShadow = h.castShadow = true
          t.userData['shirt'] = true
          const label = nameTag(name)
          group.add(t, h, label)
          const [x = 0, y = 0, z = 0] = p
          group.position.set(x, y, z)
          look.scene.add(group)
          peer = { group, target: p, label }
          peers.set(id, peer)
        }
        peer.target = p
      }
    },
    runScript(next, names) {
      script?.stop()
      script = null
      scriptNames = names
      const run = ++scriptRun
      // Once the models are drawn, so the script finds every one of them.
      if (next && next.code.trim()) void modelsReady.then(() => { if (run === scriptRun && !closed) script = runScript(next, { w: W, d: D }, scriptHost) })
    },
    inFront() { return { x: walker.x - Math.sin(walker.yaw) * 1.5, z: walker.z - Math.cos(walker.yaw) * 1.5, floor: walker.floor } },
    dispose() {
      closed = true
      script?.stop()
      script = null
      for (const peer of peers.values()) disposeGroup(peer.group)
      peers.clear()
      physics?.dispose()
      physics = null
      cancelAnimationFrame(frame)
      observer.disconnect()
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp)
      globalThis.removeEventListener('keydown', onKey); globalThis.removeEventListener('keyup', onKey)
      space.dispose()
      torso.geometry.dispose(); head.geometry.dispose(); skin.dispose(); shirt.dispose()
      look.dispose()
    },
  }
}

/** Free a peer's walker: its own shirt and its name tag (the body's shapes and the skin are shared, and freed with the walker's own). */
function disposeGroup(group: InstanceType<typeof THREE.Group>): void {
  for (const child of group.children) {
    if ((child as InstanceType<typeof THREE.Sprite>).isSprite) {
      const material = (child as InstanceType<typeof THREE.Sprite>).material
      material.map?.dispose()
      material.dispose()
    } else if (child.userData['shirt']) ((child as InstanceType<typeof THREE.Mesh>).material as InstanceType<typeof THREE.Material>).dispose()
  }
}
