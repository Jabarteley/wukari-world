import type * as THREE from 'three'

type MeshMaterial = THREE.Material | THREE.Material[]
type MeshLike = THREE.Object3D & {
  isMesh: true
  material: MeshMaterial
}

export interface BodyViewHandle {
  (): void
  refresh(scale?: number): void
}

function isMeshLike(object: THREE.Object3D): object is MeshLike {
  return 'isMesh' in object && object.isMesh === true && 'material' in object
}

/** Keep the animated body in view, removing only the head and geometry too close to the eye. */
export function presentBody(root: THREE.Object3D, scale = 1): BodyViewHandle {
  const clones = new Map<THREE.Material, Map<string, THREE.Material>>()
  const meshes = new Map<MeshLike, { original: MeshMaterial; assigned: MeshMaterial }>()
  const nearEye = { value: 0.16 * scale }
  let restored = false

  const refresh = (nextScale = scale): void => {
    if (restored) return
    nearEye.value = 0.16 * nextScale
    root.traverse((object) => {
      if (!isMeshLike(object)) return
      const entry = meshes.get(object)
      if (entry && sameMaterial(object.material, entry.assigned)) return
      const original = object.material
      const bones = headBones(object, root)
      const material = (source: THREE.Material): THREE.Material => {
        const key = bones?.join(',') ?? 'hidden'
        let variants = clones.get(source)
        if (!variants) { variants = new Map(); clones.set(source, variants) }
        let clone = variants.get(key)
        if (!clone) { clone = viewMaterial(source, bones, nearEye); variants.set(key, clone) }
        return clone
      }
      const assigned = Array.isArray(original) ? original.map(material) : material(original)
      if (entry) { entry.original = original; entry.assigned = assigned }
      else meshes.set(object, { original, assigned })
      object.material = assigned
    })
  }
  refresh()

  const restore = (() => {
    if (restored) return
    restored = true
    for (const [mesh, entry] of meshes) if (sameMaterial(mesh.material, entry.assigned)) mesh.material = entry.original
    for (const variants of clones.values()) for (const clone of variants.values()) clone.dispose()
  }) as BodyViewHandle
  restore.refresh = refresh
  return restore
}

function sameMaterial(left: MeshMaterial, right: MeshMaterial): boolean {
  if (Array.isArray(left) !== Array.isArray(right)) return false
  if (!Array.isArray(left) || !Array.isArray(right)) return left === right
  return left.length === right.length && left.every((material, index) => material === right[index])
}

function headBones(mesh: MeshLike, root: THREE.Object3D): number[] | null {
  for (let parent: THREE.Object3D | null = mesh; parent && parent !== root; parent = parent.parent) {
    if (/^(Head|neck_01)$/i.test(parent.name)) return null
  }
  if ('isSkinnedMesh' in mesh && mesh.isSkinnedMesh === true && 'skeleton' in mesh) {
    const skinned = mesh as THREE.SkinnedMesh
    const indices = skinned.skeleton?.bones.flatMap((bone, index) => /^(Head|neck_01)$/i.test(bone.name) ? [index] : []) ?? []
    if (indices.length) return indices
  }
  // A rigid watch or held item stays visible. Head attachments and baked fallback figures stay out of the eye.
  return root.userData.canonicalCharacter === true ? [] : null
}

function viewMaterial(material: THREE.Material, bones: number[] | null, nearEye: { value: number }): THREE.Material {
  const clone = material.clone()
  if (!bones) { clone.colorWrite = false; clone.depthWrite = false; return clone }
  // Material.clone does not copy these hooks. Preserve the body's skin tint, face and clothing fabric.
  clone.onBeforeCompile = (shader, renderer) => {
    material.onBeforeCompile(shader, renderer)
    shader.uniforms.uFirstPersonNearEye = nearEye
    const weight = bones.length ? ['x', 'y', 'z', 'w'].map(channel =>
      `skinWeight.${channel} * (${bones.map(index => `skinIndex.${channel} == ${index.toFixed(1)}`).join(' || ')} ? 1.0 : 0.0)`).join(' + ') : '0.0'
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vFirstPersonHead;\nvarying vec3 vFirstPersonEye;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvFirstPersonHead = ${weight};`)
      .replace('#include <project_vertex>', '#include <project_vertex>\nvFirstPersonEye = mvPosition.xyz;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vFirstPersonHead;\nvarying vec3 vFirstPersonEye;\nuniform float uFirstPersonNearEye;')
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (vFirstPersonHead > 0.35 || length(vFirstPersonEye) < uFirstPersonNearEye) discard;')
  }
  clone.customProgramCacheKey = () => `${material.customProgramCacheKey()}-first-person-body-v1-${bones.join('-')}`
  return clone
}
