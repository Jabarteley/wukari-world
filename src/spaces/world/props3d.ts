// The built-in shapes (src/spaces/props.ts) as meshes: a few primitives each, in physically based materials, sized as the catalogue says,
// standing on y = 0 and centred on x and z, so a placement puts them down exactly as it does a player's model.
import { PROPS, type PropId } from '../props.ts'
import { THREE } from './look.ts'

type Mat = InstanceType<typeof THREE.MeshStandardMaterial>
const mat = (color: string, extra: Partial<{ metalness: number; roughness: number; emissive: string; emissiveIntensity: number; transparent: boolean; opacity: number }> = {}): Mat =>
  new THREE.MeshStandardMaterial({ color, roughness: extra.roughness ?? 0.6, metalness: extra.metalness ?? 0, ...(extra.emissive ? { emissive: extra.emissive, emissiveIntensity: extra.emissiveIntensity ?? 1 } : {}), ...(extra.transparent ? { transparent: true, opacity: extra.opacity ?? 1 } : {}) })

export function propMesh(id: PropId): InstanceType<typeof THREE.Group> {
  const def = PROPS[id], [w, h, d] = def.size
  const group = new THREE.Group()
  const add = (geometry: NonNullable<ConstructorParameters<typeof THREE.Mesh>[0]>, material: Mat, x = 0, y = 0, z = 0, rx = 0, rz = 0): void => {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(x, y, z); mesh.rotation.set(rx, 0, rz)
    mesh.castShadow = true; mesh.receiveShadow = true
    group.add(mesh)
  }
  if (id === 'coin') add(new THREE.CylinderGeometry(w / 2, w / 2, d, 24), mat(def.color, { metalness: 0.9, roughness: 0.25 }), 0, h / 2, 0, Math.PI / 2)
  else if (id === 'gem') add(new THREE.OctahedronGeometry(w / 2), mat(def.color, { metalness: 0.2, roughness: 0.1, emissive: def.color, emissiveIntensity: 0.35 }), 0, h / 2)
  else if (id === 'crate') { add(new THREE.BoxGeometry(w, h, d), mat(def.color, { roughness: 0.8 }), 0, h / 2); add(new THREE.BoxGeometry(w * 1.02, h * 0.12, d * 1.02), mat('#6f4c28'), 0, h / 2) }
  else if (id === 'block') add(new THREE.BoxGeometry(w, h, d), mat(def.color, { roughness: 0.7 }), 0, h / 2)
  else if (id === 'ramp') {
    const shape = new THREE.Shape(); shape.moveTo(-d / 2, 0); shape.lineTo(d / 2, 0); shape.lineTo(d / 2, h); shape.closePath()
    const geo = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false }); geo.translate(0, 0, -w / 2); geo.rotateY(Math.PI / 2)
    add(geo, mat(def.color, { roughness: 0.7 }))
  } else if (id === 'pillar') add(new THREE.CylinderGeometry(w / 2, w / 2, h, 32), mat(def.color, { roughness: 0.5 }), 0, h / 2)
  else if (id === 'ball') add(new THREE.SphereGeometry(w / 2, 24, 16), mat(def.color, { roughness: 0.4 }), 0, h / 2)
  else if (id === 'cone') { add(new THREE.ConeGeometry(w / 2, h, 16), mat(def.color, { roughness: 0.5 }), 0, h / 2); add(new THREE.CylinderGeometry(w * 0.32, w * 0.36, h * 0.12, 16), mat('#ffffff'), 0, h * 0.55) }
  else if (id === 'flag') { add(new THREE.CylinderGeometry(0.04, 0.04, h, 8), mat('#d9d9d9', { metalness: 0.8, roughness: 0.3 }), -w / 2, h / 2); add(new THREE.BoxGeometry(w, h * 0.25, 0.03), mat(def.color, { roughness: 0.8 }), 0, h - h * 0.15) }
  else if (id === 'ring') add(new THREE.TorusGeometry(w / 2 - d / 2, d / 2, 12, 32), mat(def.color, { metalness: 0.8, roughness: 0.3, emissive: def.color, emissiveIntensity: 0.25 }), 0, h / 2)
  else if (id === 'tree') { add(new THREE.CylinderGeometry(0.15, 0.22, h * 0.45, 8), mat('#6b4a2b', { roughness: 0.9 }), 0, h * 0.225); add(new THREE.IcosahedronGeometry(w / 2, 1), mat(def.color, { roughness: 0.85 }), 0, h * 0.68); add(new THREE.IcosahedronGeometry(w / 2.8, 1), mat('#4a8f45', { roughness: 0.85 }), 0, h * 0.92) }
  else if (id === 'lamp') { add(new THREE.CylinderGeometry(0.05, 0.08, h, 8), mat(def.color, { metalness: 0.7, roughness: 0.4 }), 0, h / 2); add(new THREE.SphereGeometry(w / 2, 16, 12), mat('#fff3c4', { emissive: '#ffe08a', emissiveIntensity: 1.6 }), 0, h) }
  else if (id === 'bench') { add(new THREE.BoxGeometry(w, 0.08, d), mat(def.color), 0, 0.45); add(new THREE.BoxGeometry(w, 0.4, 0.06), mat(def.color), 0, 0.7, -d / 2 + 0.03); for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.08, 0.45, d), mat('#2b2f36', { metalness: 0.6 }), sx * (w / 2 - 0.1), 0.225) }
  else if (id === 'arch') { for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.5, h, d), mat(def.color), sx * (w / 2 - 0.25), h / 2); add(new THREE.BoxGeometry(w, 0.5, d), mat(def.color), 0, h - 0.25) }
  return group
}
