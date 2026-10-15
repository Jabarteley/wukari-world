import { avatarProportions } from '../../types/avatar.ts'
import type { SceneViewContext, SceneViewSource, ViewTarget } from '../view-extension.ts'

/** First-person interpretation stays out of the default scene host download. */
export function viewContext(source: SceneViewSource): SceneViewContext {
  if (!('read' in source)) return source
  const { THREE, container, camera, canvas, walker, read, actions, refresh, release } = source
  const context: SceneViewContext = {
    THREE, container, camera, canvas, refresh, release,
    get screens() { return read().current?.screens?.() ?? [] },
    get weakDevice() { return read().weakDevice },
    get scene() { return read().current?.group ?? null },
    get bodies() { const s = read(); return [s.walk?.avatar ?? null, s.current?.playerBody ?? s.body] },
    get x() { return walker.x }, get y() { return read().y }, get z() { return walker.z },
    get facing() { return walker.ry },
    get scale() { const s = read(); return (s.walk?.scale ?? 1) * avatarProportions(s.state?.onboarding?.look.appearance).height },
    get pose() { const s = read(); return s.current?.playerPose ?? s.rest?.pose ?? 'stand' },
    get seat() { const s = read(); return s.rest?.seat === undefined ? undefined : s.rest.seat * (s.walk?.scale ?? 1) },
    get moving() { return walker.moving }, get phase() { return read().phase },
    get enabled() { const s = read(); return s.mode === 'venue' && !container.hidden && !s.current?.placing },
    get canAct() { const s = read(); return !s.locked && !s.state?.activeAction },
    get location() { return read().location }, get activity() { return read().state?.activeAction ?? null },
    get solids() { return read().walk?.solids ?? [] },
    targets() {
      const { current, walk, spots, things, tags } = read(), scale = walk?.scale ?? 1
      const targets: ViewTarget[] = spots.map(spot => ({ ...spot, y: spot.y + scale, kind: 'spot', label: spot.label }))
      for (const item of current?.objects?.() ?? []) targets.push({ ...item, y: (item.y ?? walk?.heightAt(item.x, item.z) ?? 0) + scale, kind: 'object', label: item.itemId.replaceAll('-', ' ') })
      for (const item of things) targets.push({ ...item, y: item.top, kind: 'table' })
      for (const item of walk?.people() ?? []) targets.push({ ...item, y: (walk?.heightAt(item.x, item.z) ?? 0) + item.top * 0.75, kind: 'person', label: tags.find(tag => tag.id === item.id)?.text ?? 'Talk' })
      const door = current?.homeDoor
      if (door && actions.home) targets.push({ ...door, y: (door.y ?? 0) + scale, id: 'home-door', kind: 'home-door', label: door.direction === 'outside' ? 'Step outside' : 'Go home' })
      if (actions.neighbour) for (const door of current?.neighbourDoors?.() ?? []) targets.push({ ...door, y: scale, kind: 'neighbour-door', label: `Visit ${door.name}` })
      const gate = current?.streetGate
      if (gate && actions.street) targets.push({ ...gate, y: scale, id: 'street-gate', kind: 'street-gate', label: 'Explore the city' })
      return targets
    },
    activate(target) {
      if (!context.enabled || !context.canAct) return
      if (target.kind === 'spot') actions.spot(target.id)
      else if (target.kind === 'object') actions.object(target.id)
      else if (target.kind === 'home-door') actions.home?.()
      else if (target.kind === 'neighbour-door') actions.neighbour?.(target.id)
      else if (target.kind === 'street-gate') actions.street?.()
      else actions.tag?.({ id: target.id, kind: target.kind === 'person' ? read().walk?.people().find(person => person.id === target.id)?.kind ?? 'npc' : target.kind })
    },
  }
  return context
}
