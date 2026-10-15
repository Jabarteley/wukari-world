import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { presentBody } from './visibility.ts'

test('baked fallback bodies without a separable head retain shadows and geometry', () => {
  const root = new THREE.Group()
  const geometry = new THREE.BoxGeometry(1, 2, 1)
  const material = new THREE.MeshStandardMaterial({ color: '#ff0000' })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  const skinnedMaterial = new THREE.MeshStandardMaterial({ color: '#00ff00' })
  const skinned = new THREE.SkinnedMesh(geometry, skinnedMaterial)
  skinned.castShadow = false
  root.add(mesh, skinned)

  const originalGeometry = mesh.geometry
  const originalMeshMaterial = mesh.material
  const originalSkinnedMaterial = skinned.material
  const disposeCalls = { mesh: 0, skinned: 0 }
  const meshCloneDispose = THREE.Material.prototype.dispose
  const originalClone = material.clone.bind(material)
  material.clone = () => {
    const clone = originalClone()
    clone.dispose = () => { disposeCalls.mesh += 1 }
    return clone
  }
  const originalSkinnedClone = skinnedMaterial.clone.bind(skinnedMaterial)
  skinnedMaterial.clone = () => {
    const clone = originalSkinnedClone()
    clone.dispose = () => { disposeCalls.skinned += 1 }
    return clone
  }

  try {
    const restore = presentBody(root)
    assert.equal(root.visible, true)
    assert.equal(mesh.castShadow, true)
    assert.equal(skinned.castShadow, false)
    assert.equal(mesh.geometry, originalGeometry)
    assert.equal(skinned.geometry, originalGeometry)
    assert.notEqual(mesh.material, originalMeshMaterial)
    assert.notEqual(skinned.material, originalSkinnedMaterial)
    assert.equal((mesh.material as THREE.Material).colorWrite, false)
    assert.equal((mesh.material as THREE.Material).depthWrite, false)
    assert.equal((skinned.material as THREE.Material).colorWrite, false)
    assert.equal((skinned.material as THREE.Material).depthWrite, false)

    restore()
    restore()
    assert.equal(mesh.material, originalMeshMaterial)
    assert.equal(skinned.material, originalSkinnedMaterial)
    assert.deepEqual(disposeCalls, { mesh: 1, skinned: 1 })
    assert.equal(mesh.geometry, originalGeometry)
  } finally {
    material.clone = originalClone
    skinnedMaterial.clone = originalSkinnedClone
    meshCloneDispose.call(material)
    skinnedMaterial.dispose()
    geometry.dispose()
  }
})

test('body presentation preserves material array shape and reuses one clone per shared original', () => {
  const root = new THREE.Group()
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const shared = new THREE.MeshBasicMaterial()
  const mesh = new THREE.Mesh(geometry, [shared, shared])
  const sibling = new THREE.Mesh(geometry, shared)
  root.add(mesh, sibling)
  const restore = presentBody(root)
  assert.ok(Array.isArray(mesh.material))
  assert.equal((mesh.material as THREE.Material[])[0], (mesh.material as THREE.Material[])[1])
  assert.equal((sibling.material as THREE.Material), (mesh.material as THREE.Material[])[0])
  restore()
  assert.ok(Array.isArray(mesh.material))
  assert.equal((mesh.material as THREE.Material[])[0], shared)
  assert.equal((mesh.material as THREE.Material[])[1], shared)
  assert.equal(sibling.material, shared)
  geometry.dispose()
  shared.dispose()
})

test('refresh hides wardrobe meshes and restores only materials still owned by the handle', () => {
  const root = new THREE.Group()
  const firstGeometry = new THREE.BoxGeometry(1, 1, 1)
  const firstMaterial = new THREE.MeshBasicMaterial({ color: '#ff0000' })
  const first = new THREE.Mesh(firstGeometry, firstMaterial)
  root.add(first)
  const handle = presentBody(root)
  const replacementGeometry = new THREE.BoxGeometry(1, 1, 1)
  const replacementMaterial = new THREE.MeshBasicMaterial({ color: '#00ff00' })
  const replacement = new THREE.Mesh(replacementGeometry, replacementMaterial)
  root.add(replacement)
  handle.refresh()
  assert.equal((replacement.material as THREE.Material).colorWrite, false)

  const external = new THREE.MeshBasicMaterial({ color: '#0000ff' })
  first.material = external
  handle.refresh()
  assert.equal((first.material as THREE.Material).colorWrite, false)
  const hiddenReplacement = replacement.material
  replacement.material = external
  handle()
  handle()
  assert.equal(first.material, external, 'an external edit after refresh is preserved')
  assert.equal(replacement.material, external, 'a replaced material is not clobbered on restore')
  assert.notEqual(hiddenReplacement, replacement.material)

  firstGeometry.dispose(); replacementGeometry.dispose(); firstMaterial.dispose(); replacementMaterial.dispose(); external.dispose()
})

test('canonical bodies keep hands, clothing and legs while masking head weights only in the colour pass', () => {
  const root = new THREE.Group(), geometry = new THREE.BoxGeometry(1, 2, 1)
  const material = new THREE.MeshStandardMaterial({ color: '#b06b40', side: THREE.DoubleSide })
  const head = new THREE.Bone(), hand = new THREE.Bone(), neck = new THREE.Bone(), foot = new THREE.Bone()
  head.name = 'Head'; hand.name = 'hand_l'; neck.name = 'neck_01'; foot.name = 'foot_l'
  const mesh = new THREE.SkinnedMesh(geometry, material)
  mesh.skeleton = new THREE.Skeleton([hand, head, foot, neck])
  mesh.castShadow = true
  const shadowMaterial = new THREE.MeshDepthMaterial()
  mesh.customDepthMaterial = shadowMaterial
  root.add(mesh)
  let originalHookCalls = 0
  material.onBeforeCompile = shader => { originalHookCalls++; shader.uniforms.uOriginalTint = { value: 0.7 } }
  material.customProgramCacheKey = () => 'original-body-tint'
  const restore = presentBody(root, 0.75)
  const shown = mesh.material
  assert.notEqual(shown, material)
  assert.equal(shown.colorWrite, true)
  assert.equal(shown.depthWrite, true)
  assert.equal(shown.side, THREE.DoubleSide, 'two-sided sleeves and shoes retain their authored surfaces')
  assert.equal(shown.shadowSide, material.shadowSide, 'the original shadow sidedness remains')
  assert.equal(mesh.geometry, geometry)
  assert.equal(mesh.customDepthMaterial, shadowMaterial, 'full body still casts its original shadow')
  const shader = {
    uniforms: {},
    vertexShader: '#include <common>\nvoid main() {\n#include <begin_vertex>\n#include <project_vertex>\n}',
    fragmentShader: '#include <common>\nvoid main() {\n#include <clipping_planes_fragment>\n}',
  } as Parameters<THREE.Material['onBeforeCompile']>[0]
  shown.onBeforeCompile(shader, {} as THREE.WebGLRenderer)
  assert.equal(originalHookCalls, 1)
  assert.equal(shader.uniforms.uOriginalTint?.value, 0.7)
  assert.equal(shader.uniforms.uFirstPersonNearEye?.value, 0.12)
  assert.match(shader.vertexShader, /skinIndex.x == 1.0 \|\| skinIndex.x == 3.0/)
  assert.doesNotMatch(shader.vertexShader, /skinIndex.x == (0|2).0/, 'hand and foot weights stay visible')
  assert.match(shader.fragmentShader, /vFirstPersonHead > 0.35/)
  assert.match(shown.customProgramCacheKey(), /^original-body-tint-first-person-body/)
  restore.refresh(1)
  assert.equal(shader.uniforms.uFirstPersonNearEye?.value, 0.16)
  restore()
  assert.equal(mesh.material, material)
  assert.equal(material.side, THREE.DoubleSide, 'third person keeps the original garment surface')
  mesh.skeleton.dispose(); geometry.dispose(); material.dispose(); shadowMaterial.dispose()
})

test('rigid head accessories are hidden while hand attachments remain visible', () => {
  const root = new THREE.Group(), head = new THREE.Bone(), hand = new THREE.Bone()
  root.userData.canonicalCharacter = true
  head.name = 'Head'; hand.name = 'hand_l'; root.add(head, hand)
  const geometry = new THREE.BoxGeometry(), material = new THREE.MeshStandardMaterial()
  const glasses = new THREE.Mesh(geometry, material), watch = new THREE.Mesh(geometry, material)
  head.add(glasses); hand.add(watch)
  const restore = presentBody(root)
  assert.equal(glasses.material.colorWrite, false)
  assert.equal(watch.material.colorWrite, true)
  assert.notEqual(glasses.material, watch.material)
  restore()
  assert.equal(glasses.material, material); assert.equal(watch.material, material)
  geometry.dispose(); material.dispose()
})
