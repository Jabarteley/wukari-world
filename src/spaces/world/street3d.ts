// The street round a home in 3D (docs/WORLDS.md, phase 4): the road in front, the pavement, the neighbours' houses either side drawn
// from the estate the player really lives in (their tier and colours, as the map shows them), and a sign with the plot's address.
// The game's house has its door on its left wall (x = 0), so its street runs along x < 0; a copied house faces the near side (z < 0).
import { HOUSE_STYLE, HOUSE_TIERS } from '../../game/content/world.ts'
import type { HouseTierId } from '../../types/life.ts'
import { THREE } from './look.ts'

export interface StreetNeighbour { side: -1 | 1; tier: string; style: Record<string, number> }
export interface StreetInfo { address: string; front: 'left' | 'near'; neighbours: StreetNeighbour[] }

type Group = InstanceType<typeof THREE.Group>

export function buildStreet(W: number, D: number, info: StreetInfo): { group: Group; dispose(): void } {
  const group = new THREE.Group()
  group.name = 'street'
  const owned: { dispose(): void }[] = []
  const mat = (color: string, roughness = 0.85): InstanceType<typeof THREE.MeshStandardMaterial> => { const m = new THREE.MeshStandardMaterial({ color, roughness }); owned.push(m); return m }
  const box = (w: number, h: number, d: number) => { const g = new THREE.BoxGeometry(w, h, d); owned.push(g); return g }
  const add = (mesh: InstanceType<typeof THREE.Mesh>, x: number, y: number, z: number): void => { mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh) }
  const near = info.front === 'near'
  // Along the street: x for a near front, z for a left one. Across it: the other axis, negative towards the road.
  const length = near ? W : D, put = (along: number, across: number, y: number, mesh: InstanceType<typeof THREE.Mesh>): void => add(mesh, near ? along : across, y, near ? across : along)
  const span = length + 60
  const road = new THREE.Mesh(near ? box(span, 0.04, 6) : box(6, 0.04, span), mat('#3a3d42', 0.95))
  put(length / 2, -8, 0.01, road)
  const pavement = new THREE.Mesh(near ? box(span, 0.12, 1.6) : box(1.6, 0.12, span), mat('#c9c3b5', 0.9))
  put(length / 2, -4.2, 0.06, pavement)
  for (let t = -28; t < length + 30; t += 4) { const dash = new THREE.Mesh(near ? box(2, 0.05, 0.15) : box(0.15, 0.05, 2), mat('#f2f2f2', 0.6)); put(t, -8, 0.03, dash) }
  // The neighbours: a house of their tier, in their colours, door to the road.
  for (const n of info.neighbours) {
    const tier = (Object.hasOwn(HOUSE_TIERS, n.tier) ? n.tier : 'starter') as HouseTierId
    const g = HOUSE_TIERS[tier].grid, floors = tier === 'duplex' || tier === 'villa' ? 2 : 1, h = floors * 3
    const pick = (field: keyof typeof HOUSE_STYLE, fallback: string): string => (HOUSE_STYLE[field][n.style[field] ?? 0] as { hex?: string } | undefined)?.hex ?? fallback
    const along = n.side < 0 ? -4 - g / 2 : length + 4 + g / 2, back = g / 2
    const walls = new THREE.Mesh(near ? box(g, h, g) : box(g, h, g), mat(pick('wall', '#f3ead6'), 0.92))
    put(along, back, h / 2, walls)
    const roof = new THREE.Mesh(box(g + 0.5, 0.25, g + 0.5), mat(pick('roof', '#a85c40'), 0.8))
    put(along, back, h + 0.12, roof)
    const door = new THREE.Mesh(near ? box(1, 2.1, 0.06) : box(0.06, 2.1, 1), mat(pick('door', '#6b4a2b'), 0.55))
    put(along, -0.03, 1.05, door)
    for (const dx of [-g / 3, g / 3]) for (let f = 0; f < floors; f++) {
      const pane = new THREE.Mesh(near ? box(1.1, 1.1, 0.06) : box(0.06, 1.1, 1.1), mat(pick('windows', '#bfe0f0'), 0.1))
      put(along + dx, -0.03, f * 3 + 1.6, pane)
    }
  }
  // The address on a post by the path to the door.
  if (info.address) {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128
    const g2 = canvas.getContext('2d')!
    g2.fillStyle = '#1f4f7a'; g2.fillRect(0, 0, 512, 128); g2.strokeStyle = '#ffffff'; g2.lineWidth = 6; g2.strokeRect(8, 8, 496, 112)
    g2.fillStyle = '#ffffff'; g2.font = '600 34px system-ui, sans-serif'; g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.fillText(info.address.slice(0, 34), 256, 66)
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; owned.push(texture)
    const signMat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.6 }); owned.push(signMat)
    const sign = new THREE.Mesh(near ? box(1.8, 0.45, 0.05) : box(0.05, 0.45, 1.8), signMat)
    const at = Math.min(length - 1, 1.5)
    put(at, -3.2, 1.9, sign)
    if (!near) sign.rotation.y = Math.PI
    const post = new THREE.Mesh(box(0.08, 1.7, 0.08), mat('#2b2f36', 0.5))
    put(at, -3.2, 0.85, post)
  }
  return { group, dispose() { for (const o of owned) o.dispose() } }
}
