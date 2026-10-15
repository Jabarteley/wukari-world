import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { createKit } from '../scene/kit.ts'
import { housingAssetManifest } from './asset-manifest.ts'
import { compactHousingTemplate } from './compact-template.ts'

const triangles = (root: THREE.Object3D): number => {
  let count = 0
  root.traverse((object) => { if (object instanceof THREE.Mesh) count += (object.geometry.index?.count ?? object.geometry.getAttribute('position')?.count ?? 0) / 3 })
  return count
}

test('all real housing GLBs compact to one compatible static draw', async () => {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
  for (const asset of housingAssetManifest) {
    const bytes = readFileSync(new URL(asset.url)), buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    const source = (await loader.parseAsync(buffer, '')).scene
    source.position.set(0.13, 0.07, -0.19); source.rotation.set(0.03, -0.08, 0.02); source.scale.set(1.03, 0.97, 1.01)
    source.updateWorldMatrix(true, true)
    const beforeBounds = new THREE.Box3().setFromObject(source, true), beforeTriangles = triangles(source)
    const expectedRoughness: number[] = []
    let expectedSide: THREE.Side | null = null
    source.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      const materialArray = Array.isArray(object.material), materials = materialArray ? object.material : [object.material]
      const count = object.geometry.index?.count ?? object.geometry.getAttribute('position').count
      const groups = object.geometry.groups.length ? object.geometry.groups : [{ start: 0, count, materialIndex: 0 }]
      for (const group of groups) {
        const material = materials[materialArray ? group.materialIndex ?? 0 : 0] as THREE.MeshStandardMaterial
        expectedSide ??= material.side
        for (let index = 0; index < group.count; index++) expectedRoughness.push(material.roughness)
      }
    })
    const beforeChildren = source.children.slice(), beforeMatrices: number[][] = []
    source.traverse((object) => beforeMatrices.push(object.matrix.toArray()))
    const kit = createKit(), compact = compactHousingTemplate(source, kit)
    try {
      const meshes: THREE.Mesh[] = []; compact.traverse((object) => { if (object instanceof THREE.Mesh) meshes.push(object) })
      assert.equal(meshes.length, 1, `${asset.id}: one mesh`)
      assert.ok(meshes[0]!.material instanceof THREE.MeshStandardMaterial && !Array.isArray(meshes[0]!.material), `${asset.id}: one standard material`)
      const material = meshes[0]!.material as THREE.MeshStandardMaterial
      assert.equal(material.side, expectedSide, `${asset.id}: material side`)
      assert.equal(material.roughness, 1, `${asset.id}: shader uses the neutral roughness factor`)
      assert.equal(triangles(compact), beforeTriangles, `${asset.id}: triangles`)
      const afterBounds = new THREE.Box3().setFromObject(compact, true)
      for (const axis of ['x', 'y', 'z'] as const) {
        assert.ok(Math.abs(afterBounds.min[axis] - beforeBounds.min[axis]) < 1e-5, `${asset.id}: min ${axis}`)
        assert.ok(Math.abs(afterBounds.max[axis] - beforeBounds.max[axis]) < 1e-5, `${asset.id}: max ${axis}`)
      }
      const color = meshes[0]!.geometry.getAttribute('color')
      assert.ok(color && color.count === meshes[0]!.geometry.getAttribute('position').count, `${asset.id}: per-vertex colour`)
      const distinct = new Set<string>()
      for (let index = 0; index < color.count; index++) for (let channel = 0; channel < 3; channel++) {
        const value = channel === 0 ? color.getX(index) : channel === 1 ? color.getY(index) : color.getZ(index)
        assert.ok(value >= 0 && value <= 1, `${asset.id}: bounded colour`)
        if (channel === 2) distinct.add(`${color.getX(index).toFixed(4)},${color.getY(index).toFixed(4)},${color.getZ(index).toFixed(4)}`)
      }
      assert.ok(distinct.size > 1, `${asset.id}: source colour variation retained`)
      const roughness = meshes[0]!.geometry.getAttribute('housingRoughness')
      assert.equal(roughness.count, expectedRoughness.length, `${asset.id}: per-vertex roughness`)
      for (let index = 0; index < roughness.count; index++) assert.ok(Math.abs(roughness.getX(index) - expectedRoughness[index]!) < 1e-6, `${asset.id}: roughness ${index}`)
      assert.deepEqual(source.children, beforeChildren, `${asset.id}: source children unchanged`)
      const afterMatrices: number[][] = []; source.traverse((object) => afterMatrices.push(object.matrix.toArray()))
      assert.deepEqual(afterMatrices, beforeMatrices, `${asset.id}: source transforms unchanged`)
      meshes[0]!.geometry.dispose(); (meshes[0]!.material as THREE.Material).dispose()
    } finally { kit.dispose() }
  }
})

test('roughness shader composes after the kit ghost patch', () => {
  const kit = createKit()
  kit.eachMaterial((material) => {
    material.onBeforeCompile = (shader) => { shader.fragmentShader = `// ghost-marker\n${shader.fragmentShader}` }
    material.customProgramCacheKey = () => 'ghost-key'
  })
  const source = new THREE.Group(), geometry = new THREE.BoxGeometry()
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Array(geometry.getAttribute('position').count * 3).fill(0.5), 3))
  const sourceMaterial = new THREE.MeshStandardMaterial({ roughness: 0.42, metalness: 0, side: THREE.DoubleSide, vertexColors: true })
  source.add(new THREE.Mesh(geometry, sourceMaterial))
  const compact = compactHousingTemplate(source, kit), mesh = compact.children[0] as THREE.Mesh, material = mesh.material as THREE.MeshStandardMaterial
  const shader = {
    vertexShader: '#include <common>\nvoid main(){\n#include <begin_vertex>\n}',
    fragmentShader: '#include <common>\nvoid main(){ float roughnessFactor;\n#include <roughnessmap_fragment>\n}',
    uniforms: {},
  }
  try {
    material.onBeforeCompile(shader as never, {} as THREE.WebGLRenderer)
    assert.match(shader.fragmentShader, /ghost-marker/)
    assert.match(shader.vertexShader, /attribute float housingRoughness/)
    assert.match(shader.fragmentShader, /roughnessFactor = vHousingRoughness/)
    assert.equal(material.customProgramCacheKey(), 'ghost-key|housing-roughness-v1')
  } finally {
    mesh.geometry.dispose(); material.dispose(); geometry.dispose(); sourceMaterial.dispose(); kit.dispose()
  }
})

test('unsupported material features reject instead of losing them', () => {
  const kit = createKit(), source = new THREE.Group()
  const material = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.5 })
  source.add(new THREE.Mesh(new THREE.BoxGeometry(), material))
  try { assert.throws(() => compactHousingTemplate(source, kit), /unsupported material/) }
  finally { (source.children[0] as THREE.Mesh).geometry.dispose(); material.dispose(); kit.dispose() }
})
