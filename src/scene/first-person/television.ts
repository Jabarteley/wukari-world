// A watched television is a view-only surface. The host already owns the room, screen placement,
// activity and frame loop; this module owns one two-triangle overlay and no clocks or audio.
import type * as THREE from 'three'
import type { SceneViewContext, TelevisionScreen } from '../view-extension.ts'

export interface TelevisionView {
  render(): void
  dispose(): void
}

function nearestScreen(context: SceneViewContext): TelevisionScreen | null {
  let nearest: TelevisionScreen | null = null
  let distance = Number.POSITIVE_INFINITY
  for (const screen of context.screens) {
    const dx = screen.x - context.x, dy = screen.y - context.y, dz = screen.z - context.z
    const next = dx * dx + dy * dy + dz * dz
    if (next < distance) { nearest = screen; distance = next }
  }
  return nearest
}

function screenKey(screen: TelevisionScreen): string {
  return [screen.id, screen.x, screen.y, screen.z, screen.ry, screen.width, screen.height].join(':')
}

function drawStill(canvas: HTMLCanvasElement): boolean {
  const g = canvas.getContext('2d')
  if (!g) return false
  const w = canvas.width, h = canvas.height
  g.fillStyle = '#18395c'; g.fillRect(0, 0, w, h)
  g.fillStyle = '#f3b24b'; g.fillRect(0, h * 0.56, w, h * 0.44)
  g.fillStyle = '#2e8a68'; g.fillRect(0, h * 0.68, w, h * 0.32)
  g.fillStyle = '#f7e5a9'; g.beginPath(); g.arc(w * 0.78, h * 0.25, h * 0.12, 0, Math.PI * 2); g.fill()
  g.fillStyle = '#ffffff'; g.font = `700 ${Math.round(h * 0.14)}px system-ui, sans-serif`; g.textAlign = 'left'; g.textBaseline = 'top'
  g.fillText('ALLWORLD', w * 0.05, h * 0.07)
  return true
}

/** Draw the generated still only while first-person watching is active and visible. */
export function createTelevision(base: SceneViewContext): TelevisionView {
  const context = base
  const canvas = globalThis.document?.createElement?.('canvas') ?? null
  if (canvas) {
    canvas.width = context.weakDevice ? 128 : 256
    canvas.height = context.weakDevice ? 64 : 128
  }
  const painted = canvas ? drawStill(canvas) : false

  let mesh: THREE.Mesh | null = null
  let geometry: THREE.PlaneGeometry | null = null
  let material: THREE.MeshBasicMaterial | null = null
  let texture: THREE.CanvasTexture | null = null
  let mountedScene: THREE.Object3D | null = null
  let mountedScreen = ''
  let disposed = false

  function release(): void {
    if (mesh && mountedScene) mountedScene.remove(mesh)
    geometry?.dispose()
    material?.dispose()
    texture?.dispose()
    mesh = null; geometry = null; material = null; texture = null
    mountedScene = null; mountedScreen = ''
  }

  function mount(scene: THREE.Object3D, screen: TelevisionScreen): void {
    const THREE = context.THREE
    geometry = new THREE.PlaneGeometry(1, 1)
    texture = new THREE.CanvasTexture(canvas!)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.generateMipmaps = false
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false })
    mesh = new THREE.Mesh(geometry, material)
    mesh.name = `first-person-tv:${screen.id}`
    mesh.position.set(screen.x, screen.y, screen.z)
    mesh.rotation.y = screen.ry
    mesh.scale.set(screen.width, screen.height, 1)
    scene.add(mesh)
    mountedScene = scene
    mountedScreen = screenKey(screen)
  }

  return {
    render() {
      if (disposed) return
      const visible = typeof document === 'undefined' || document.hidden !== true
      const watching = context.enabled && visible && context.activity?.kind === 'activity' && context.activity.id === 'home-watch-tv'
      const scene = context.scene
      const screen = watching && scene && painted ? nearestScreen(context) : null
      if (!scene || !screen) { release(); return }
      const key = screenKey(screen)
      if (mesh && mountedScene === scene && mountedScreen === key) return
      release()
      mount(scene, screen)
    },
    dispose() {
      if (disposed) return
      disposed = true
      release()
    },
  }
}
