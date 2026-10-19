/**
 * OWNER: growth
 * THE DECEMBER SKIN (docs/DETTY-DECEMBER.md): the props a venue of Lagos, Accra or Abuja wears while Detty December is on, built from the
 * plan src/festivals/detty.ts skinFor decides. Loaded only then (src/festivals/detty-client.ts imports it on demand), never in the first
 * download, and cheap on a phone: every part is ONE instanced mesh or line (a draw call each, at most seven in all), low-poly, unlit colours that
 * glow at night without a single real light, no texture, no shadow. A weak phone's plan has half the pieces. Nothing here blocks walking.
 *
 *   lights   string lights on posts along the back and both sides (never across the camera's side), in the season's two colours and warm white
 *   beach    umbrellas and loungers along the back half of the day venue (the beach, Jabi Lake, a park)
 *   stage    coloured beams over the back of the music venue
 * THREE is the scene kit's (kit.THREE), so this file adds no copy of the library.
 */
import type * as THREE_NS from 'three'
import type { SkinPlan } from './detty.ts'

type Three = typeof THREE_NS
export interface SkinPlace {
  /** The walkable rectangle [minX, minZ, maxX, maxZ]; the camera looks from +z. */
  bounds: readonly [number, number, number, number]
  heightAt?: (x: number, z: number) => number
}
export interface Skin { group: THREE_NS.Group; drawCalls: number; pieces: number; dispose(): void }

const WARM = '#ffe2a8', POLE = '#3a3a40', LOUNGER = '#f1ede4', POST_EVERY = 6, BULB_Y = 3.2, SAG = 0.35, BULB = 0.17

/** Points along the back and both sides of the rectangle, inset a little, from the front-left corner round to the front-right one. */
export function perimeter(bounds: SkinPlace['bounds'], count: number, inset = 0.6): [number, number][] {
  const [minX, minZ, maxX, maxZ] = bounds, x0 = minX + inset, x1 = maxX - inset, z0 = minZ + inset, z1 = maxZ - inset
  const legs: [number, number, number, number][] = [[x0, z1, x0, z0], [x0, z0, x1, z0], [x1, z0, x1, z1]]
  const lengths = legs.map(([ax, az, bx, bz]) => Math.hypot(bx - ax, bz - az)), total = lengths.reduce((a, b) => a + b, 0)
  const out: [number, number][] = []
  if (count < 1 || !(total > 0)) return out
  for (let i = 0; i < count; i++) {
    let along = (total * (i + 0.5)) / count, leg = 0
    while (leg < legs.length - 1 && along > lengths[leg]!) { along -= lengths[leg]!; leg++ }
    const [ax, az, bx, bz] = legs[leg]!, f = lengths[leg]! ? along / lengths[leg]! : 0
    out.push([ax + (bx - ax) * f, az + (bz - az) * f])
  }
  return out
}

/** Build the skin of a plan in a place. The caller adds `group` to its scene and calls dispose() when the venue goes or the season ends. */
export function buildSkin(THREE: Three, plan: SkinPlan, place: SkinPlace): Skin {
  const group = new THREE.Group()
  group.name = 'detty-skin'
  const owned: { dispose(): void }[] = [], ground = (x: number, z: number): number => { try { return place.heightAt?.(x, z) ?? 0 } catch { return 0 } }
  let drawCalls = 0, pieces = 0
  // Unlit materials of their own: never given the kit's see-through patch (kit.adopt), which is written for lit materials only.
  const material = (options: THREE_NS.MeshBasicMaterialParameters): THREE_NS.MeshBasicMaterial => { const made = new THREE.MeshBasicMaterial(options); owned.push(made); return made }
  /** One instanced mesh of `geometry` at each [x, y, z, sx, sy, sz, colour]. */
  function instanced(name: string, geometry: THREE_NS.BufferGeometry, mat: THREE_NS.Material, items: readonly [number, number, number, number, number, number, string][]): void {
    owned.push(geometry)
    if (!items.length) return
    const mesh = new THREE.InstancedMesh(geometry, mat, items.length), m = new THREE.Matrix4(), colour = new THREE.Color()
    items.forEach(([x, y, z, sx, sy, sz, c], i) => { mesh.setMatrixAt(i, m.makeScale(sx, sy, sz).setPosition(x, y, z)); mesh.setColorAt(i, colour.set(c)) })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.name = `detty-${name}`; mesh.castShadow = false; mesh.receiveShadow = false; mesh.frustumCulled = false
    group.add(mesh); drawCalls += 1; pieces += items.length
  }
  const [c1, c2] = plan.colours

  if (plan.parts.includes('lights') && plan.bulbs > 0) {
    const bulbs = perimeter(place.bounds, plan.bulbs), posts = perimeter(place.bounds, Math.max(2, Math.round(plan.bulbs / POST_EVERY)))
    // Each bulb hangs a little lower between posts: a sag that is deepest halfway between two of them.
    const span = Math.max(1, plan.bulbs / Math.max(1, posts.length))
    const hung = bulbs.map(([x, z], i): [number, number, number, number, number, number, string] => {
      const phase = ((i % span) + 0.5) / span, y = ground(x, z) + BULB_Y - SAG * Math.sin(Math.PI * phase)
      return [x, y, z, BULB, BULB, BULB, [c1, c2, WARM][i % 3]!]
    })
    instanced('bulbs', new THREE.IcosahedronGeometry(1, 0), material({}), hung)
    // The wire the bulbs hang on: one line through them all, a single draw call.
    const wire = new THREE.BufferGeometry().setFromPoints(hung.map(([x, y, z]) => new THREE.Vector3(x, y + BULB, z)))
    const line = new THREE.Line(wire, (() => { const made = new THREE.LineBasicMaterial({ color: POLE }); owned.push(made); return made })())
    owned.push(wire); line.name = 'detty-wire'; line.frustumCulled = false
    group.add(line); drawCalls += 1
    instanced('posts', new THREE.CylinderGeometry(1, 1, 1, 6), material({ color: POLE }), posts.map(([x, z]) => [x, ground(x, z) + BULB_Y / 2 + 0.1, z, 0.08, BULB_Y + 0.2, 0.08, POLE]))
  }
  if (plan.parts.includes('beach') && plan.umbrellas > 0) {
    // Umbrellas along the back half, spaced evenly, each with a lounger in front of it.
    const [minX, minZ, maxX, maxZ] = place.bounds, n = plan.umbrellas, depth = Math.min(4, (maxZ - minZ) / 3)
    const spots = Array.from({ length: n }, (_, i): [number, number] => [minX + 1.5 + ((maxX - minX - 3) * (i + 0.5)) / n, minZ + 1.4 + (i % 2) * depth * 0.5])
    instanced('canopies', new THREE.ConeGeometry(1, 1, 8, 1, true), material({ color: '#ffffff', side: THREE.DoubleSide }), spots.map(([x, z], i) => [x, ground(x, z) + 2.25, z, 1.25, 0.45, 1.25, i % 2 ? c1 : c2]))
    instanced('umbrella-poles', new THREE.CylinderGeometry(1, 1, 1, 5), material({ color: POLE }), spots.map(([x, z]) => [x, ground(x, z) + 1.1, z, 0.04, 2.2, 0.04, POLE]))
    instanced('loungers', new THREE.BoxGeometry(1, 1, 1), material({ color: LOUNGER }), spots.map(([x, z]) => [x + 0.2, ground(x, z + 1.1) + 0.22, z + 1.1, 0.7, 0.12, 1.7, LOUNGER]))
  }
  if (plan.parts.includes('stage') && plan.beams > 0) {
    // Beams from above the back wall, leaning into the room: additive, no depth write, so they read as light and hide nothing.
    const [minX, minZ, maxX] = place.bounds, n = plan.beams, beams: [number, number, number, number, number, number, string][] = []
    for (let i = 0; i < n; i++) { const x = minX + ((maxX - minX) * (i + 0.5)) / n, z = minZ + 1.2; beams.push([x, ground(x, z) + 2.4, z + 0.6, 0.7, 4.8, 0.7, [c1, c2, WARM, c2][i % 4]!]) }
    instanced('beams', new THREE.ConeGeometry(1, 1, 10, 1, true), material({ color: '#ffffff', transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), beams)
  }
  return {
    group, drawCalls, pieces,
    dispose(): void { group.parent?.remove(group); for (const item of owned) item.dispose(); owned.length = 0; group.clear() },
  }
}
