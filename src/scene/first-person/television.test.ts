import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import type { SceneViewContext } from '../view-extension.ts'
import { createTelevision } from './television.ts'

function fakeCanvas(): { canvas: HTMLCanvasElement; markCreated: () => void; created: () => number } {
  let count = 0
  const context = {
    fillStyle: '', font: '', textAlign: '', textBaseline: '',
    fillRect() {}, beginPath() {}, arc() {}, fill() {}, fillText() {},
  }
  const canvas = { width: 0, height: 0, getContext: () => context } as unknown as HTMLCanvasElement
  return { canvas, markCreated: () => { count += 1 }, created: () => count }
}

test('television mounts the nearest 3D screen as two triangles and releases every GPU resource', () => {
  const previousDocument = Reflect.get(globalThis, 'document')
  const made = fakeCanvas()
  let hidden = false, x = 0, enabled = true
  const doc = { get hidden() { return hidden }, createElement: () => { made.markCreated(); return made.canvas } }
  Reflect.set(globalThis, 'document', doc)

  const scene = new THREE.Group()
  const context = {
    THREE, scene,
    get x() { return x }, y: 10, z: 0,
    get enabled() { return enabled },
    activity: { kind: 'activity', id: 'home-watch-tv' }, weakDevice: true,
    screens: [
      { id: 'ground-near-in-plan', x: 0.2, y: 1, z: 0, ry: 0.2, width: 2.4, height: 1.2 },
      { id: 'upper-floor', x: 2, y: 10, z: 0, ry: -0.4, width: 1.6, height: 0.9 },
    ],
  } as unknown as SceneViewContext

  try {
    const television = createTelevision(context)
    assert.equal(made.canvas.width, 128)
    assert.equal(made.canvas.height, 64)

    television.render()
    assert.equal(scene.children.length, 1)
    const first = scene.children[0] as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
    assert.equal(first.name, 'first-person-tv:upper-floor')
    assert.deepEqual(first.position.toArray(), [2, 10, 0])
    assert.equal(first.rotation.y, -0.4)
    assert.deepEqual(first.scale.toArray(), [1.6, 0.9, 1])
    assert.equal(first.geometry.index?.count, 6, 'one plane adds exactly two triangles')
    assert.equal((first.material.map as THREE.CanvasTexture).image, made.canvas)

    const disposed = { geometry: 0, material: 0, texture: 0 }
    first.geometry.dispose = () => { disposed.geometry += 1 }
    first.material.dispose = () => { disposed.material += 1 }
    ;(first.material.map as THREE.CanvasTexture).dispose = () => { disposed.texture += 1 }
    hidden = true
    television.render()
    assert.equal(scene.children.length, 0)
    assert.deepEqual(disposed, { geometry: 1, material: 1, texture: 1 })

    hidden = false
    x = 0
    television.render()
    assert.equal((scene.children[0] as THREE.Mesh).name, 'first-person-tv:upper-floor')
    assert.equal(made.created(), 1, 'the generated still canvas is reused')
    enabled = false
    television.render()
    assert.equal(scene.children.length, 0)
    television.dispose()
    television.dispose()
  } finally {
    if (previousDocument === undefined) Reflect.deleteProperty(globalThis, 'document')
    else Reflect.set(globalThis, 'document', previousDocument)
  }
})

test('television gates on the real home-watch-tv activity id', () => {
  const previousDocument = Reflect.get(globalThis, 'document')
  const scene = new THREE.Group()
  const made = fakeCanvas()
  Reflect.set(globalThis, 'document', { hidden: false, createElement: () => made.canvas })
  try {
    let activity = { kind: 'activity', id: 'watch-tv' }
    const context = {
      THREE, scene, x: 0, y: 0, z: 0, enabled: true, weakDevice: false,
      screens: [{ id: 'tv', x: 0, y: 1, z: 1, ry: 0, width: 1, height: 0.6 }],
      get activity() { return activity },
    } as unknown as SceneViewContext
    const television = createTelevision(context)
    television.render()
    assert.equal(scene.children.length, 0)
    activity = { kind: 'activity', id: 'home-watch-tv' }
    television.render()
    assert.equal(scene.children.length, 1)
    television.dispose()
  } finally {
    if (previousDocument === undefined) Reflect.deleteProperty(globalThis, 'document')
    else Reflect.set(globalThis, 'document', previousDocument)
  }
})
