import { Matrix4, Vector3 } from 'three'
import type { InstancedMesh, Mesh, Object3D } from 'three'
export interface Fingerprint { key: string; meshes: number; vertices: number }

/** A visible geometry snapshot only: excludes names, materials, skinned actors and hidden objects. */
export function geometryFingerprint(root: Object3D): Fingerprint {
  root.updateMatrixWorld(true)
  let hash = 2166136261, meshes = 0, vertices = 0
  const feed = (value: number) => { hash ^= Math.round(value * 10000); hash = Math.imul(hash, 16777619) >>> 0 }
  root.traverseVisible(object => {
    const mesh = object as Mesh
    if (!mesh.isMesh || mesh.type === 'SkinnedMesh') return
    for (let ancestor: Object3D | null = object; ancestor; ancestor = ancestor.parent) if (ancestor.userData.characterFoundation === 'native53' || ancestor.userData.canonicalCharacter === true || ancestor.name === 'avatar' || ancestor.name === 'ambient') return
    const position = mesh.geometry.getAttribute('position'); if (!position) return
    const instanced = mesh as InstancedMesh, instances = instanced.isInstancedMesh ? instanced.count : 1
    meshes++; vertices += position.count * instances; feed(position.count); feed(instances)
    const point = new Vector3(), transform = new Matrix4(), instance = new Matrix4()
    for (let index = 0; index < instances; index++) {
      transform.copy(mesh.matrixWorld)
      if (instanced.isInstancedMesh) { instanced.getMatrixAt(index, instance); transform.multiply(instance) }
      for (let i = 0; i < position.count; i++) { point.fromBufferAttribute(position, i).applyMatrix4(transform); feed(point.x); feed(point.y); feed(point.z) }
    }
    const indices = mesh.geometry.index; if (indices) for (let i = 0; i < indices.count; i++) feed(indices.getX(i))
  })
  return { key: hash.toString(16).padStart(8, '0'), meshes, vertices }
}
