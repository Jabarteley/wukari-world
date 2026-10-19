import test from 'node:test'
import assert from 'node:assert/strict'
import { createKit } from '../scene/kit.ts'
import { ANCHORS, ENTRANCE } from '../campus/unilag/layout.ts'
import { buildCampusInspection } from './campus.ts'

test('campus inspection uses mapped geometry and source anchors without a session', () => {
  const kit = createKit(), scene = buildCampusInspection(kit)
  try {
    assert.equal(scene.kind, 'unilag')
    assert.ok(scene.group.getObjectByName('UNILAG mapped ground'))
    assert.deepEqual(scene.target?.(), [ENTRANCE.x, 1, ENTRANCE.z])
    assert.deepEqual(scene.locations?.map(area => area.id).sort(), Object.keys(ANCHORS).sort())
    const area = scene.locations?.find(area => scene.selectLocation?.(area.id))
    assert.ok(area, 'at least one existing anchor is navigable')
    assert.deepEqual(scene.target?.(), [ANCHORS[area.id]!.x, 1, ANCHORS[area.id]!.z])
    assert.ok(scene.stats().meshes > 0)
    assert.equal(scene.selectLocation?.('not-an-anchor'), false)
  } finally { scene.dispose(); scene.dispose(); kit.dispose() }
  assert.equal(scene.group.children.length, 0)
})
