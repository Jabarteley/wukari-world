/**
 * OWNER: spaces
 * THE REALISTIC LOOK of the 3D space screens (docs/SPACES-3D.md): physically based materials lit by an image of a room
 * (image-based lighting), a sun with soft shadows, filmic (AgX) tone mapping and sRGB output, so a model looks as it did in
 * Blender. Lazy: only the 3D space screens import this, never the first download or the city scene.
 *
 * Players' models are parsed from their bytes. Nothing in a model runs; any outside link a file might still carry is replaced
 * with nothing before it is fetched (the server already refuses such files: src/spaces/glb.ts).
 */
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

export { THREE }

export interface Look { renderer: THREE.WebGLRenderer; scene: THREE.Scene; sun: THREE.DirectionalLight; dispose(): void }

/** A renderer and scene with the realistic look. `quality` 'high' uses 2× pixels and 2048 px shadows; 'normal' 1.5× and 1024. */
export function createLook(canvas: HTMLCanvasElement, { quality = 'high', background = '#cfd8dc' }: { quality?: 'high' | 'normal'; background?: string } = {}): Look {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false })
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, quality === 'high' ? 2 : 1.5))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.AgXToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(background)
  const pmrem = new THREE.PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const environment = pmrem.fromScene(room, 0.04).texture
  room.dispose?.()
  pmrem.dispose()
  scene.environment = environment
  scene.environmentIntensity = 0.9

  const sun = new THREE.DirectionalLight(0xfff4e5, 2.4)
  sun.position.set(4, 8, 5)
  sun.castShadow = true
  const size = quality === 'high' ? 2048 : 1024
  sun.shadow.mapSize.set(size, size)
  sun.shadow.bias = -0.0004
  sun.shadow.normalBias = 0.02
  sun.shadow.radius = 4
  const box = sun.shadow.camera
  box.near = 0.5; box.far = 40; box.left = -8; box.right = 8; box.top = 8; box.bottom = -8
  scene.add(sun, sun.target)
  scene.add(new THREE.HemisphereLight(0xdfe9f3, 0x6b5a4a, 0.35))

  return {
    renderer, scene, sun,
    dispose() {
      disposeTree(scene)
      environment.dispose()
      renderer.dispose()
      renderer.forceContextLoss?.()
    },
  }
}

/** Point the sun's shadow box at a region (centre and half-size in metres) so shadows stay sharp where the player is. */
export function aimSun(look: Look, centre: THREE.Vector3, half: number): void {
  look.sun.position.set(centre.x + half * 0.6, centre.y + half * 1.6 + 4, centre.z + half * 0.8)
  look.sun.target.position.copy(centre)
  const box = look.sun.shadow.camera
  box.left = -half; box.right = half; box.top = half; box.bottom = -half; box.far = half * 6 + 20
  box.updateProjectionMatrix()
}

let loader: GLTFLoader | null = null
function gltfLoader(): GLTFLoader {
  if (loader) return loader
  const manager = new THREE.LoadingManager()
  // Pictures inside a .glb become blob: links the loader makes itself; anything else would be an outside fetch, so it reads nothing.
  manager.setURLModifier((url) => (url.startsWith('blob:') || url.startsWith('data:') ? url : 'data:,'))
  loader = new GLTFLoader(manager)
  loader.setMeshoptDecoder(MeshoptDecoder)
  return loader
}

export interface LoadedModel { root: THREE.Group; clips: THREE.AnimationClip[]; size: THREE.Vector3 }
/**
 * Parse a .glb into a group that stands on y = 0, centred on x and z, casting and receiving shadows. Lights and cameras in the
 * file are dropped: the space has its own.
 */
export async function parseModel(bytes: ArrayBuffer, maxAnisotropy = 8): Promise<LoadedModel> {
  const gltf = await gltfLoader().parseAsync(bytes, '')
  const root = new THREE.Group()
  const content = gltf.scene
  const drop: THREE.Object3D[] = []
  content.traverse((node) => {
    if ((node as THREE.Light).isLight || (node as THREE.Camera).isCamera) { drop.push(node); return }
    const mesh = node as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.castShadow = true
    mesh.receiveShadow = true
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      for (const value of Object.values(material)) if ((value as THREE.Texture | null)?.isTexture) (value as THREE.Texture).anisotropy = maxAnisotropy
    }
  })
  for (const node of drop) node.removeFromParent()
  const box = new THREE.Box3().setFromObject(content)
  const size = box.getSize(new THREE.Vector3())
  const centre = box.getCenter(new THREE.Vector3())
  content.position.sub(new THREE.Vector3(centre.x, box.min.y, centre.z))
  root.add(content)
  return { root, clips: gltf.animations, size }
}

/** Free every geometry, material and texture under `root`. */
export function disposeTree(root: THREE.Object3D): void {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh
    if (!mesh.isMesh && !(node as THREE.Points).isPoints && !(node as THREE.Line).isLine) return
    mesh.geometry?.dispose()
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      if (!material) continue
      for (const value of Object.values(material)) if ((value as THREE.Texture | null)?.isTexture) (value as THREE.Texture).dispose()
      material.dispose()
    }
  })
}

/** A floor that only shows shadows (for a model on its own), and a soft grid under it. */
export function shadowFloor(radius = 6): THREE.Group {
  const group = new THREE.Group()
  const floor = new THREE.Mesh(new THREE.CircleGeometry(radius, 48), new THREE.ShadowMaterial({ opacity: 0.28 }))
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  const grid = new THREE.GridHelper(radius * 2, Math.round(radius * 4), 0x90a4ae, 0xb0bec5)
  ;(grid.material as THREE.Material).transparent = true
  ;(grid.material as THREE.Material).opacity = 0.35
  grid.position.y = 0.001
  group.add(floor, grid)
  return group
}
