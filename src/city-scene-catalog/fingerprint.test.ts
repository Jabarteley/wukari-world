import test from 'node:test'
import assert from 'node:assert/strict'
import { BoxGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial } from 'three'
import { geometryFingerprint } from './fingerprint.ts'

test('geometry comparison ignores names and colours but detects layout changes', () => {
  const geometry = new BoxGeometry(1, 1, 1), firstMaterial = new MeshBasicMaterial({ color: '#ff0000' }), secondMaterial = new MeshBasicMaterial({ color: '#00ff00' })
  const first = new Mesh(geometry, firstMaterial), second = new Mesh(geometry, secondMaterial)
  first.name = 'Paris market'; second.name = 'Tokyo market'
  try {
    assert.deepEqual(geometryFingerprint(first), geometryFingerprint(second))
    second.position.x = 3
    assert.notEqual(geometryFingerprint(first).key, geometryFingerprint(second).key)
    const parent = new Group(); parent.add(first); parent.position.z = 2
    parent.updateMatrixWorld(true)
    assert.notEqual(geometryFingerprint(parent).key, geometryFingerprint(second).key)
  } finally { geometry.dispose(); firstMaterial.dispose(); secondMaterial.dispose() }
})

test('visible instances affect the snapshot and hidden geometry does not', () => {
  const geometry = new BoxGeometry(1, 1, 1), material = new MeshBasicMaterial(), mesh = new InstancedMesh(geometry, material, 2), group = new Group()
  group.add(mesh); mesh.setMatrixAt(0, new Matrix4()); mesh.setMatrixAt(1, new Matrix4().makeTranslation(2, 0, 0))
  try {
    const initial = geometryFingerprint(group)
    mesh.setMatrixAt(1, new Matrix4().makeTranslation(5, 0, 0))
    assert.notEqual(geometryFingerprint(group).key, initial.key)
    assert.equal(initial.vertices, geometry.getAttribute('position').count * 2)
    const hidden = new Mesh(geometry, material); hidden.visible = false; group.add(hidden)
    assert.deepEqual(geometryFingerprint(group), geometryFingerprint(mesh))
  } finally { geometry.dispose(); material.dispose(); mesh.dispose() }
})

test('static native actor geometry does not change a scenery fingerprint', () => {
  const geometry = new BoxGeometry(1, 1, 1), replacement = new BoxGeometry(7, 2, 3), material = new MeshBasicMaterial(), scenery = new Mesh(geometry, material), actor = new Group(), group = new Group()
  actor.userData.characterFoundation = 'native53'
  const actorMesh = new Mesh(geometry, material); actor.add(actorMesh); group.add(scenery, actor)
  try {
    const before = geometryFingerprint(group)
    actorMesh.geometry = replacement; actor.position.x = 18
    assert.deepEqual(geometryFingerprint(group), before)
    delete actor.userData.characterFoundation; actor.userData.canonicalCharacter = true
    assert.deepEqual(geometryFingerprint(group), before)
    delete actor.userData.canonicalCharacter
    assert.notEqual(geometryFingerprint(group).key, before.key)
  } finally { geometry.dispose(); replacement.dispose(); material.dispose() }
})
