import type { SceneViewContext, SceneViewSource, SceneViewExtension, ViewTarget } from '../view-extension.ts'
import { clampPitch, eyePose, selectTarget, targetOccluded, wrapYaw } from './math.ts'
import { viewContext } from './venue-context.ts'
import { createTelevision } from './television.ts'
import { presentBody } from './visibility.ts'
import { onViewPreferencesChange, readViewPreferences } from './preferences.ts'
import './first-person.css'

/** Loaded only after choosing first person. It borrows the host's walker and render loop. */
export function createFirstPerson(source: SceneViewSource, inputAllowed: () => boolean = () => true): SceneViewExtension {
  const context = viewContext(source)
  const { camera, container, canvas, THREE } = context
  const television = createTelevision(context)
  const saved = { fov: camera.fov, near: camera.near, zoom: camera.zoom, view: camera.view && { ...camera.view } }
  const point = new THREE.Vector3(), look = new THREE.Vector3(), bodyEye = new THREE.Vector3()
  const bodyForward = new THREE.Vector3(), bodyOrigin = new THREE.Vector3()
  const headUp = new THREE.Vector3(), headFrame = new THREE.Matrix4()
  let yaw = renderedFacing(), lastBodyFacing = yaw, pitch = 0, scene = context.scene, pose = context.pose
  let preferences = readViewPreferences(), target: ViewTarget | null = null
  let pointer: { id: number; x: number; y: number; startX: number; startY: number; dragged: boolean; snap: number } | null = null
  let disposed = false, actingAt = -Infinity
  const hidden = new Map<NonNullable<SceneViewContext['scene']>, ReturnType<typeof presentBody>>()
  const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')
  const overlay = document.createElement('div')
  overlay.className = 'first-person-overlay'
  const reticle = document.createElement('i')
  reticle.className = 'first-person-reticle'; reticle.setAttribute('aria-hidden', 'true')
  const prompt = document.createElement('button')
  prompt.type = 'button'; prompt.className = 'first-person-prompt'; prompt.hidden = true
  overlay.append(reticle, prompt); container.appendChild(overlay)
  container.classList.add('is-first-person')
  const active = () => !disposed && context.enabled && inputAllowed() && !document.hidden

  function renderedFacing(): number {
    const body = context.bodies[1], group = context.scene
    if (!body?.userData.canonicalCharacter || !group) return context.facing
    body.getWorldPosition(bodyOrigin); body.getWorldDirection(bodyForward); bodyForward.add(bodyOrigin)
    group.worldToLocal(bodyOrigin); group.worldToLocal(bodyForward); bodyForward.sub(bodyOrigin)
    return Math.atan2(bodyForward.x, bodyForward.z)
  }
  function release(): void {
    if (pointer) { try { canvas.releasePointerCapture(pointer.id) } catch { /* already released */ } }
    pointer = null
    context.release()
  }
  function turn(dx: number, dy: number): void {
    yaw = wrapYaw(yaw + dx); pitch = clampPitch(pitch + dy)
    context.refresh()
  }
  function act(): void {
    if (!active() || !context.canAct || performance.now() - actingAt < 350) return
    render() // Recheck distance and occlusion at the moment of use.
    if (!target) return
    actingAt = performance.now()
    context.activate(target)
  }
  function down(event: PointerEvent): void {
    if (!active()) return
    event.stopImmediatePropagation()
    if (event.button !== 0 || pointer) return
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, dragged: false, snap: 0 }
    try { canvas.setPointerCapture(event.pointerId) } catch { /* capture is optional */ }
  }
  function move(event: PointerEvent): void {
    if (!active()) { release(); return }
    event.stopImmediatePropagation()
    if (!pointer || pointer.id !== event.pointerId) return
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y
    pointer.dragged ||= Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) > 5
    pointer.x = event.clientX; pointer.y = event.clientY
    if (!pointer.dragged) return
    event.preventDefault()
    if (preferences.snapTurn) {
      pointer.snap += dx
      if (Math.abs(pointer.snap) >= 60) { turn(-Math.sign(pointer.snap) * Math.PI / 6, 0); pointer.snap = 0 }
      turn(0, -dy * 0.003)
    } else turn(-dx * 0.004, -dy * 0.003)
  }
  function up(event: PointerEvent): void {
    if (!active() && !pointer) return
    event.stopImmediatePropagation()
    if (!pointer || pointer.id !== event.pointerId) return
    const tap = !pointer.dragged && event.type === 'pointerup'
    try { canvas.releasePointerCapture(event.pointerId) } catch { /* already released */ }
    pointer = null
    if (tap) act()
  }
  function suppress(event: Event): void { if (active()) { event.preventDefault(); event.stopImmediatePropagation() } }
  function key(event: KeyboardEvent): void {
    if (!active() || event.ctrlKey || event.metaKey || event.altKey || event.target instanceof Element && event.target.closest('input,textarea,select,button,a,[contenteditable="true"],[role="dialog"]')) return
    const name = event.key.toLowerCase()
    if (!['e', ' ', '[', ']', 'pageup', 'pagedown', '0', '+', '=', '-', '_'].includes(name)) return
    event.preventDefault(); event.stopImmediatePropagation()
    if (name === 'e' || name === ' ') { if (!event.repeat) act(); return }
    if (name === '0') { yaw = renderedFacing(); lastBodyFacing = yaw; pitch = 0; context.refresh(); return }
    if (preferences.snapTurn && event.repeat) return
    const step = preferences.snapTurn ? Math.PI / 6 : 0.12
    turn(name === '[' ? step : name === ']' ? -step : 0, name === 'pageup' ? 0.08 : name === 'pagedown' ? -0.08 : 0)
  }
  function render(): void {
    if (disposed) return
    television.render()
    const enabled = context.enabled
    const facing = renderedFacing()
    overlay.hidden = !enabled
    if (!active()) { target = null; prompt.hidden = true; release() }
    if (scene !== context.scene) {
      scene = context.scene; yaw = facing; lastBodyFacing = facing; pitch = 0
      if (!reduced?.matches) { overlay.classList.remove('is-entering'); void overlay.offsetWidth; overlay.classList.add('is-entering') }
    }
    // Activity seating faces the same direction as the character, then remains freely lookable.
    if (pose !== context.pose) { pose = context.pose; if (pose !== 'stand') { yaw = facing; pitch = 0 } }
    else if (pose !== 'stand' && !context.moving) yaw = wrapYaw(yaw + wrapYaw(facing - lastBodyFacing))
    lastBodyFacing = facing
    const bodies = context.bodies
    for (const [root, restore] of hidden) if (!bodies.includes(root)) { restore(); hidden.delete(root) }
    for (const body of bodies) if (body && !hidden.has(body)) hidden.set(body, presentBody(body, context.scale))
    for (const handle of hidden.values()) handle.refresh(context.scale)
    const eye = eyePose({ x: context.x, y: context.y, z: context.z, yaw, pitch, scale: context.scale,
      pose: context.pose, seat: context.seat, moving: context.moving, phase: context.phase,
      bob: preferences.bob, reducedMotion: reduced?.matches })
    // The home object sequence moves its body independently of the navigation waypoint.
    // Follow that rendered head during seats, beds and door motion; walking keeps optional bob only.
    const head = !context.moving && bodies[1]?.getObjectByName('Head')
    const lying = Boolean(head && bodies[1]?.userData.canonicalCharacter && (pose === 'lie' || pose === 'sleep'))
    if (head && scene) {
      head.updateWorldMatrix(true, false); head.getWorldPosition(bodyEye); scene.worldToLocal(bodyEye)
      const dx = bodyEye.x - eye.x, dy = bodyEye.y + (lying ? 0 : 0.12 * context.scale) - eye.y, dz = bodyEye.z - eye.z
      eye.x += dx; eye.y += dy; eye.z += dz; eye.lookX += dx; eye.lookY += dy; eye.lookZ += dz
    }
    const body = bodies[1]
    if (body?.userData.canonicalCharacter && scene) {
      // The eye turns around the head joint without pitching into the collar or upper torso.
      if (lying && head) {
        // In sleep/lie-down the face points upward. Offset in the rendered anatomical
        // frame (+Y toward the crown, +Z out of the face), not the upright world frame.
        headFrame.copy(scene.matrixWorld).invert().multiply(head.matrixWorld)
        headUp.set(0, 1, 0).transformDirection(headFrame).multiplyScalar(0.12 * context.scale)
        bodyForward.set(0, 0, 1).transformDirection(headFrame).multiplyScalar(0.28 * context.scale).add(headUp)
      } else bodyForward.set(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(0.28 * context.scale)
      eye.x += bodyForward.x; eye.y += bodyForward.y; eye.z += bodyForward.z
      eye.lookX += bodyForward.x; eye.lookY += bodyForward.y; eye.lookZ += bodyForward.z
    }
    point.set(eye.x, eye.y, eye.z); look.set(eye.lookX, eye.lookY, eye.lookZ)
    if (scene) { scene.updateWorldMatrix(true, false); scene.localToWorld(point); scene.localToWorld(look) }
    camera.position.copy(point); camera.lookAt(look)
    if (camera.fov !== 75 || camera.near !== 0.04 || camera.zoom !== 1 || camera.view?.enabled) {
      camera.fov = 75; camera.near = 0.04; camera.zoom = 1; camera.clearViewOffset(); camera.updateProjectionMatrix()
    }
    overlay.classList.toggle('has-vignette', preferences.vignette && context.moving)
    target = active() && context.canAct ? selectTarget(eye, { x: eye.lookX - eye.x, y: eye.lookY - eye.y, z: eye.lookZ - eye.z }, context.targets(), 3.4 * context.scale,
      candidate => targetOccluded(eye, candidate, context.solids)) : null
    prompt.hidden = !target
    const label = target ? `${target.label} · E / Space` : ''
    if (prompt.textContent !== label) prompt.textContent = label
    reticle.classList.toggle('has-target', Boolean(target))
  }
  const stopPreferences = onViewPreferencesChange(() => { preferences = readViewPreferences(); context.refresh() })
  const changeMotion = () => context.refresh()
  reduced?.addEventListener('change', changeMotion)
  prompt.addEventListener('click', act)
  const pointers = { pointerdown: down, pointermove: move, pointerup: up, pointercancel: up, lostpointercapture: up }
  for (const [type, listener] of Object.entries(pointers)) canvas.addEventListener(type, listener as EventListener, { capture: true, passive: false })
  canvas.addEventListener('click', suppress, true); canvas.addEventListener('wheel', suppress, { capture: true, passive: false })
  window.addEventListener('keydown', key, true); window.addEventListener('blur', release); document.addEventListener('visibilitychange', release)
  return {
    get inputEnabled() { return active() },
    get azimuth() { return yaw + Math.PI }, render,
    dispose() {
      if (disposed) return
      release(); disposed = true; stopPreferences(); reduced?.removeEventListener('change', changeMotion)
      for (const [type, listener] of Object.entries(pointers)) canvas.removeEventListener(type, listener as EventListener, true)
      canvas.removeEventListener('click', suppress, true); canvas.removeEventListener('wheel', suppress, true)
      window.removeEventListener('keydown', key, true); window.removeEventListener('blur', release); document.removeEventListener('visibilitychange', release)
      for (const restore of hidden.values()) restore()
      television.dispose(); hidden.clear(); overlay.remove(); container.classList.remove('is-first-person')
      camera.fov = saved.fov; camera.near = saved.near; camera.zoom = saved.zoom; camera.view = saved.view; camera.updateProjectionMatrix()
    },
  }
}
