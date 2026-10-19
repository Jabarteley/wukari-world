import test from 'node:test'
import assert from 'node:assert/strict'
import { templateOf, WORLD_TEMPLATES, type WorldTemplate } from './world-templates.ts'
import { cleanLayout } from './layout.ts'
import { cleanScript } from './script.ts'
import { SPACE_LIMITS_BY_KIND, WORLD_SIZES, WORLD_GROUNDS } from './worlds.ts'
import { FURNITURE } from '../game/content/furniture.ts'
import { propOf } from './props.ts'

test('every starter, at every size, is a layout and a script the server accepts', () => {
  for (const id of Object.keys(WORLD_TEMPLATES) as WorldTemplate[]) {
    for (const size of Object.values(WORLD_SIZES)) {
      const w = size.metres, t = templateOf(id, w)
      const checked = cleanLayout(t.models, { w, d: w, floors: 1 }, () => null, () => false, SPACE_LIMITS_BY_KIND.world)
      assert.equal(checked.ok, true, `${id} at ${w} m: ${JSON.stringify(checked)}`)
      for (const m of t.models) assert.ok(propOf(m.m), `${id}: only built-in shapes`)
      for (const item of t.items) {
        assert.ok(Object.hasOwn(FURNITURE, item.itemId), item.itemId)
        assert.ok(item.x >= 0 && item.y >= 0 && item.x < w && item.y < w, `${id}: ${item.itemId} inside`)
      }
      if (t.script) assert.equal(cleanScript(t.script, () => null).ok, true, `${id}: script`)
      if (t.ground) assert.ok(Object.hasOwn(WORLD_GROUNDS, t.ground))
    }
  }
  assert.deepEqual(templateOf('empty', 24), { items: [], models: [] })
  assert.equal(templateOf('treasure', 48).models.filter((m) => m.m === 'p-gem').length, 12)
  assert.ok(templateOf('race', 24).models.some((m) => m.m === 'p-flag'))
  assert.equal(templateOf('island', 24).ground, 'island')
})
