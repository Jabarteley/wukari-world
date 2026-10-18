import { buildUnilag } from '../campus/unilag/scene.ts'
import type { Kit } from '../scene/kit.ts'
import type { RenderScene } from './render-scene.ts'

/** The game's mapped campus geometry and local LOD, with no session or game actions. */
export function buildCampusInspection(kit: Kit): RenderScene {
  const campus = buildUnilag(kit)
  const triple = (values: number[]): [number, number, number] => [values[0]!, values[1]!, values[2]!]
  return {
    kind: campus.kind,
    group: campus.group,
    camera: { landscape: triple(campus.camera.landscape), portrait: triple(campus.camera.portrait), get bounds(): [number, number, number, number, number, number] { const { x, z } = campus.position; return [x - 100, 0, z - 100, x + 100, 30, z + 100] } },
    get background() { return campus.background },
    get sky(): [string, string] { return [campus.background, campus.background] },
    anchors: campus.anchors,
    lighting() {
      const light = campus.lighting(), sun = light.sun[2]
      return { sky: [campus.background, campus.background], hemi: light.hemi, sun: [light.sun[0], light.sun[1], [sun[0]!, sun[1]!, sun[2]!]], rim: ['#ffffff', 0], glow: 1, lamps: 0 }
    },
    look: () => false,
    stats: () => campus.stats(),
    target: () => [campus.position.x, 1, campus.position.z],
    locations: Object.entries(campus.anchors).map(([id, anchor]) => ({ id, label: anchor.label })),
    selectLocation: id => campus.setSpot(id),
    dispose: () => campus.dispose(),
  }
}
