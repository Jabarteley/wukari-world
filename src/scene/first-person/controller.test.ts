import test from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import * as THREE from 'three'
import type { SceneViewContext, ViewTarget } from '../view-extension.ts'

class FakeElement extends EventTarget {
  className = ''
  classList = {
    add: (...names: string[]) => { for (const name of names) this.className += this.className ? ` ${name}` : name },
    remove: (...names: string[]) => { this.className = this.className.split(' ').filter((name) => name && !names.includes(name)).join(' ') },
    toggle: (name: string, force?: boolean) => { const present = this.className.split(' ').includes(name); const next = force ?? !present; if (next && !present) this.className += this.className ? ` ${name}` : name; if (!next && present) this.classList.remove(name); return next },
  }
  style: Record<string, string> = {}
  hidden = false
  textContent = ''
  type = ''
  width = 0
  height = 0
  children: FakeElement[] = []
  parentElement: FakeElement | null = null
  append(...items: unknown[]): void { for (const item of items) if (item instanceof FakeElement) { item.parentElement = this; this.children.push(item) } }
  appendChild<T extends FakeElement>(item: T): T { this.append(item); return item }
  remove(): void { this.parentElement?.children.splice(this.parentElement.children.indexOf(this), 1) }
  setAttribute(): void {}
  querySelector(): FakeElement | null { return null }
  getContext(): null { return null }
  setPointerCapture(): void {}
  releasePointerCapture(): void {}
}

class FakeDocument extends EventTarget {
  hidden = false
  body = new FakeElement()
  createElement(): FakeElement { return new FakeElement() }
  querySelector(): null { return null }
}

const documentStub = new FakeDocument()
const windowStub = new EventTarget()
const scheduling = { calls: 0 }
Object.assign(globalThis, {
  document: documentStub,
  window: windowStub,
  Element: FakeElement,
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  requestAnimationFrame: () => { scheduling.calls++; return 1 },
  setInterval: () => { scheduling.calls++; return 1 },
})

const cssHook = registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('/scene/first-person/first-person.css')) return { format: 'module', source: '', shortCircuit: true }
    return nextLoad(url, context)
  },
})
const { createFirstPerson } = await import('./controller.ts').finally(() => cssHook.deregister())

function inputEvent(type: string, values: Record<string, unknown> = {}): Event {
  const event = new Event(type, { cancelable: true }) as Event & Record<string, unknown>
  Object.assign(event, values)
  return event
}

interface Harness {
  context: SceneViewContext
  scene: THREE.Group
  body: THREE.Mesh
  canvas: FakeElement
  container: FakeElement
  activated: ViewTarget[]
  releases: number
  refreshes: number
  setEnabled(enabled: boolean): void
  setTargets(targets: ViewTarget[]): void
  setScene(scene: THREE.Group, body: THREE.Mesh): void
}

function harness(): Harness {
  const scene = new THREE.Group(); scene.position.set(10, 0.5, 20)
  const body = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshBasicMaterial())
  scene.add(body)
  const next: { scene: THREE.Group; body: THREE.Mesh } = { scene, body }
  const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 100)
  const canvas = new FakeElement(), container = new FakeElement()
  const activated: ViewTarget[] = []
  let enabled = true, allowed = true, releases = 0, refreshes = 0, targets: ViewTarget[] = [{ id: 'near', kind: 'object', label: 'Near', x: 1, y: 2.3, z: 3 }]
  const context = {
    THREE, container, camera, canvas,
    get scene() { return next.scene },
    get bodies() { return [null, next.body] },
    x: 1, y: 0, z: 2, facing: 0, scale: 1, pose: 'stand', seat: undefined,
    moving: false, phase: 0, get enabled() { return enabled }, canAct: true, location: 'park', activity: null,
    solids: [], targets: () => targets, activate: (target: ViewTarget) => activated.push(target), refresh: () => { refreshes++ }, release: () => { releases++ },
    screens: [], weakDevice: true,
  } as unknown as SceneViewContext & { screens: never[]; weakDevice: boolean }
  return {
    context, scene, body, canvas, container, activated, get releases() { return releases }, get refreshes() { return refreshes },
    setEnabled(value) { enabled = value }, setTargets(value) { targets = value },
    setScene(newScene, newBody) { next.scene = newScene; next.body = newBody; targets = [] },
  }
}

test('first-person lifecycle places camera, hides body, gates action, rotates and restores cleanly', () => {
  const h = harness(), originalFov = h.context.camera.fov, originalNear = h.context.camera.near
  const view = createFirstPerson(h.context, () => true)
  view.render()
  assert.deepEqual(h.context.camera.position.toArray(), [11, 2.8, 22])
  assert.equal(h.context.camera.fov, 75); assert.equal(h.context.camera.near, 0.04)
  assert.equal((h.body.material as THREE.Material).colorWrite, false)

  windowStub.dispatchEvent(inputEvent('keydown', { key: 'e', repeat: false, ctrlKey: false, metaKey: false, altKey: false }))
  assert.equal(h.activated.length, 1)
  h.setScene(h.scene, h.body)
  h.setTargets([])
  windowStub.dispatchEvent(inputEvent('keydown', { key: 'e', repeat: false, ctrlKey: false, metaKey: false, altKey: false }))
  assert.equal(h.activated.length, 1, 'no target means no modal/action dispatch')

  h.canvas.dispatchEvent(inputEvent('pointerdown', { button: 0, pointerId: 1, clientX: 100, clientY: 100 }))
  h.canvas.dispatchEvent(inputEvent('pointermove', { pointerId: 1, clientX: 120, clientY: 100 }))
  assert.ok(Math.abs(view.azimuth - (Math.PI - 0.08)) < 1e-9)
  assert.ok(h.refreshes > 0)

  h.setEnabled(false)
  h.canvas.dispatchEvent(inputEvent('pointermove', { pointerId: 1, clientX: 130, clientY: 100 }))
  assert.ok(h.releases > 0)
  view.dispose(); view.dispose()
  assert.equal((h.body.material as THREE.Material).colorWrite, true)
  assert.equal(h.context.camera.fov, originalFov); assert.equal(h.context.camera.near, originalNear)
  assert.equal(scheduling.calls, 0, 'controller does not create an animation or interval loop')
  const before = h.refreshes
  windowStub.dispatchEvent(inputEvent('keydown', { key: '[', repeat: false, ctrlKey: false, metaKey: false, altKey: false }))
  assert.equal(h.refreshes, before)
  h.body.geometry.dispose(); (h.body.material as THREE.Material).dispose()
})

test('scene replacement restores old body and hides the new body on the next render', () => {
  const h = harness(), scene = new THREE.Group(), body = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial())
  const view = createFirstPerson(h.context)
  view.render()
  h.setScene(scene, body); view.render()
  assert.equal((h.body.material as THREE.Material).colorWrite, true)
  assert.equal((body.material as THREE.Material).colorWrite, false)
  view.dispose(); body.geometry.dispose(); (body.material as THREE.Material).dispose(); h.body.geometry.dispose(); (h.body.material as THREE.Material).dispose()
})

test('seated and door presentation follows the rendered head instead of a navigation waypoint', () => {
  const h = harness(), head = new THREE.Bone()
  head.name = 'Head'; head.position.set(0, 1.2, 0)
  h.body.add(head); h.body.position.set(3, 0.4, 4)
  const view = createFirstPerson(h.context)
  view.render()
  assert.deepEqual(h.context.camera.position.toArray().map(n => Math.round(n * 100)), [1300, 222, 2400])
  h.body.position.set(3.2, 0.1, 4.1)
  head.position.y = 0.35
  view.render()
  assert.deepEqual(h.context.camera.position.toArray().map(n => Math.round(n * 100)), [1320, 107, 2410])
  Reflect.set(h.context, 'moving', true)
  view.render()
  assert.deepEqual(h.context.camera.position.toArray(), [11, 2.8, 22], 'walking does not force the rig animation head bob')
  view.dispose(); h.body.geometry.dispose(); (h.body.material as THREE.Material).dispose()
})

test('canonical eye sits ahead of the collar in the rendered body direction while looking down', () => {
  const h = harness()
  h.body.userData.canonicalCharacter = true
  h.body.rotation.y = Math.PI / 2
  const view = createFirstPerson(h.context)
  view.render()
  assert.deepEqual(h.context.camera.position.toArray().map(n => Math.round(n * 100)), [1128, 280, 2200])
  h.canvas.dispatchEvent(inputEvent('pointerdown', { button: 0, pointerId: 1, clientX: 100, clientY: 100 }))
  h.canvas.dispatchEvent(inputEvent('pointermove', { pointerId: 1, clientX: 100, clientY: 570 }))
  view.render()
  assert.deepEqual(h.context.camera.position.toArray().map(n => Math.round(n * 100)), [1128, 280, 2200], 'look pitch never moves the eye inside the torso')
  assert.ok(h.context.camera.getWorldDirection(new THREE.Vector3()).y < -0.98)
  view.dispose(); h.body.geometry.dispose(); (h.body.material as THREE.Material).dispose()
})

test('seated view follows the rendered body turn and retains independent head look', () => {
  const h = harness()
  h.body.userData.canonicalCharacter = true
  const view = createFirstPerson(h.context)
  view.render()
  Reflect.set(h.context, 'pose', 'sit')
  h.body.rotation.y = 0.4; view.render()
  assert.ok(Math.abs(view.azimuth - (Math.PI + 0.4)) < 1e-9)
  h.canvas.dispatchEvent(inputEvent('pointerdown', { button: 0, pointerId: 1, clientX: 100, clientY: 100 }))
  h.canvas.dispatchEvent(inputEvent('pointermove', { pointerId: 1, clientX: 200, clientY: 100 }))
  h.body.rotation.y = 1.2; view.render()
  assert.ok(Math.abs(view.azimuth - (Math.PI + 0.8)) < 1e-9, 'the seat turn preserves the relative head turn')
  windowStub.dispatchEvent(inputEvent('keydown', { key: '0' }))
  view.render()
  assert.ok(Math.abs(view.azimuth - (Math.PI + 1.2)) < 1e-9, 'reset faces the seated body, not the old walking heading')
  Reflect.set(h.context, 'moving', true)
  h.body.rotation.y = 1.5; view.render()
  assert.ok(Math.abs(view.azimuth - (Math.PI + 1.2)) < 1e-9, 'walking cannot feed body turns back into the movement heading')
  view.dispose(); h.body.geometry.dispose(); (h.body.material as THREE.Material).dispose()
})
