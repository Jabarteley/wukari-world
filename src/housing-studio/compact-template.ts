import * as THREE from 'three'
import type { Kit } from '../scene/kit.ts'

const textureIn = (material: THREE.Material): boolean => Object.values(material).some((value) => value instanceof THREE.Texture)

function supported(material: THREE.Material): material is THREE.MeshStandardMaterial {
  return material instanceof THREE.MeshStandardMaterial
    && !textureIn(material)
    && !material.transparent && material.opacity === 1 && material.alphaTest === 0
    && material.blending === THREE.NormalBlending && !material.wireframe
    && material.emissive.getHex() === 0 && material.emissiveIntensity === 1
    && material.metalness === 0
}

/**
 * Bake a decoded, opaque static GLB into one world-space vertex-coloured draw.
 * Unsupported render features throw so the caller can retain its normal proxy.
 * The decoded source and all of its GPU resources remain caller-owned.
 */
export function compactHousingTemplate(source: THREE.Group, kit: Kit): THREE.Group {
  source.updateWorldMatrix(true, true)
  const positions: number[] = [], normals: number[] = [], colours: number[] = [], roughnesses: number[] = []
  let side: THREE.Side | null = null, meshes = 0
  const position = new THREE.Vector3(), normal = new THREE.Vector3(), colour = new THREE.Color(), normalMatrix = new THREE.Matrix3()

  source.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    if (object instanceof THREE.SkinnedMesh || object instanceof THREE.InstancedMesh || object.morphTargetInfluences?.length || Object.keys(object.geometry.morphAttributes).length) throw new Error('Housing template must be a static mesh')
    if (!object.visible) throw new Error('Housing template cannot contain hidden meshes')
    const geometry = object.geometry, positionAttribute = geometry.getAttribute('position'), normalAttribute = geometry.getAttribute('normal')
    if (!positionAttribute || positionAttribute.itemSize < 3 || !normalAttribute || normalAttribute.itemSize < 3) throw new Error('Housing template requires positions and normals')
    const colorAttribute = geometry.getAttribute('color')
    if (colorAttribute && colorAttribute.itemSize < 3) throw new Error('Housing template vertex colours must be RGB')
    const materialArray = Array.isArray(object.material)
    const materials: THREE.Material[] = materialArray ? object.material : [object.material]
    if (!materials.length || materials.some((material) => !supported(material))) throw new Error('Housing template uses an unsupported material')
    for (const material of materials) {
      if (side !== null && material.side !== side) throw new Error('Housing template mixes material sides')
      side = material.side
    }
    const index = geometry.getIndex(), elementCount = index?.count ?? positionAttribute.count
    const groups = geometry.groups.length ? geometry.groups : [{ start: 0, count: elementCount, materialIndex: 0 }]
    normalMatrix.getNormalMatrix(object.matrixWorld)
    const reversed = object.matrixWorld.determinant() < 0
    for (const group of groups) {
      if (group.start < 0 || group.count < 0 || group.start + group.count > elementCount || group.count % 3) throw new Error('Housing template has an invalid triangle group')
      const material = materials[materialArray ? group.materialIndex ?? 0 : 0]
      if (!material || !supported(material)) throw new Error('Housing template has an invalid material group')
      for (let offset = 0; offset < group.count; offset += 3) {
        for (const corner of reversed ? [0, 2, 1] : [0, 1, 2]) {
          const at = group.start + offset + corner, vertex = index ? index.getX(at) : at
          position.fromBufferAttribute(positionAttribute as THREE.BufferAttribute, vertex).applyMatrix4(object.matrixWorld)
          normal.fromBufferAttribute(normalAttribute as THREE.BufferAttribute, vertex).applyMatrix3(normalMatrix).normalize()
          colour.copy(material.color)
          if (colorAttribute) colour.multiply(new THREE.Color(
            colorAttribute.getX(vertex), colorAttribute.getY(vertex), colorAttribute.getZ(vertex)))
          positions.push(position.x, position.y, position.z)
          normals.push(normal.x, normal.y, normal.z)
          colours.push(colour.r, colour.g, colour.b)
          roughnesses.push(material.roughness)
        }
      }
    }
    meshes += 1
  })
  if (!meshes || !positions.length) throw new Error('Housing template has no triangles')

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3))
  geometry.setAttribute('housingRoughness', new THREE.Float32BufferAttribute(roughnesses, 1))
  geometry.computeBoundingBox(); geometry.computeBoundingSphere()
  const material = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, metalness: 0,
    roughness: 1, side: side ?? THREE.FrontSide })
  kit.adopt(material)
  const inheritedCompile = material.onBeforeCompile.bind(material)
  const inheritedKey = material.customProgramCacheKey.bind(material)
  material.onBeforeCompile = (shader, renderer) => {
    inheritedCompile(shader, renderer)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float housingRoughness;\nvarying float vHousingRoughness;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHousingRoughness = housingRoughness;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vHousingRoughness;')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = vHousingRoughness;')
  }
  material.customProgramCacheKey = () => `${inheritedKey()}|housing-roughness-v1`
  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true; mesh.receiveShadow = true
  const group = new THREE.Group(); group.add(mesh)
  return group
}
