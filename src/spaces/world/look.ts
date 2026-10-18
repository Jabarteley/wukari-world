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
import type { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
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

// The loader and the meshopt decoder are fetched the way the skinned body fetches them (vite.config.ts leaves them to the bundler),
// so they stay in the body's lazy chunk and nothing the city scene loads changes.
let loader: Promise<GLTFLoader> | null = null
function gltfLoader(): Promise<GLTFLoader> {
  loader ??= Promise.all([import('three/examples/jsm/loaders/GLTFLoader.js'), import('three/examples/jsm/libs/meshopt_decoder.module.js')]).then(([gltf, meshopt]) => {
    const manager = new THREE.LoadingManager()
    // Pictures inside a .glb become blob: links the loader makes itself; anything else would be an outside fetch, so it reads nothing.
    manager.setURLModifier((url) => (url.startsWith('blob:') || url.startsWith('data:') ? url : 'data:,'))
    return new gltf.GLTFLoader(manager).setMeshoptDecoder(meshopt.MeshoptDecoder)
  })
  return loader
}

export interface LoadedModel { root: THREE.Group; clips: THREE.AnimationClip[]; size: THREE.Vector3 }
/**
 * Parse a .glb into a group that stands on y = 0, centred on x and z, casting and receiving shadows. Lights and cameras in the
 * file are dropped: the space has its own.
 */
export async function parseModel(bytes: ArrayBuffer, maxAnisotropy = 8): Promise<LoadedModel> {
  const gltf = await (await gltfLoader()).parseAsync(bytes, '')
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

/** A floor that only shows shadows, for a model on its own. */
export function shadowFloor(radius = 6): THREE.Group {
  const group = new THREE.Group()
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), new THREE.ShadowMaterial({ opacity: 0.3 }))
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  group.add(floor)
  return group
}

/**
 * Turn the camera around a point with a finger or the mouse, and come closer with a pinch or the wheel. A few lines of our own:
 * three's OrbitControls would ride in the three chunk every city scene fetches (vite.config.ts).
 */
export function orbit(camera: THREE.PerspectiveCamera, element: HTMLElement, target: THREE.Vector3, { onStart }: { onStart?: () => void } = {}) {
  let yaw = 0.6, pitch = 0.35, distance = 4, min = 0.5, max = 40
  const pointers = new Map<number, { x: number; y: number }>()
  let pinch = 0
  const place = (): void => {
    pitch = Math.max(-0.2, Math.min(1.45, pitch))
    distance = Math.max(min, Math.min(max, distance))
    camera.position.set(target.x + Math.sin(yaw) * Math.cos(pitch) * distance, target.y + Math.sin(pitch) * distance, target.z + Math.cos(yaw) * Math.cos(pitch) * distance)
    camera.lookAt(target)
  }
  const spread = (): number => { const [a, b] = [...pointers.values()]; return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0 }
  const down = (event: PointerEvent): void => { element.setPointerCapture?.(event.pointerId); pointers.set(event.pointerId, { x: event.clientX, y: event.clientY }); pinch = spread(); onStart?.() }
  const move = (event: PointerEvent): void => {
    const last = pointers.get(event.pointerId)
    if (!last) return
    if (pointers.size === 1) { yaw -= (event.clientX - last.x) * 0.008; pitch += (event.clientY - last.y) * 0.006 }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.size === 2) { const now = spread(); if (pinch > 0 && now > 0) distance *= pinch / now; pinch = now }
    place()
  }
  const up = (event: PointerEvent): void => { pointers.delete(event.pointerId); pinch = spread() }
  const wheel = (event: WheelEvent): void => { event.preventDefault(); distance *= Math.exp(event.deltaY * 0.001); onStart?.(); place() }
  element.addEventListener('pointerdown', down)
  element.addEventListener('pointermove', move)
  element.addEventListener('pointerup', up)
  element.addEventListener('pointercancel', up)
  element.addEventListener('wheel', wheel, { passive: false })
  place()
  return {
    /** Look at `centre` from `far` metres, keeping the angle. */
    frame(centre: THREE.Vector3, far: number, near = far / 8, farthest = far * 4): void { target.copy(centre); distance = far; min = near; max = farthest; place() },
    spin(radians: number): void { yaw += radians; place() },
    dispose(): void {
      element.removeEventListener('pointerdown', down); element.removeEventListener('pointermove', move)
      element.removeEventListener('pointerup', up); element.removeEventListener('pointercancel', up); element.removeEventListener('wheel', wheel)
    },
  }
}
