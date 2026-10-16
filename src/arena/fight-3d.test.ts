import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CANVAS_Y, framing, FIGHT_ASSETS } from './fight-3d.ts'

/** Where a world point (x metres from the look point, y metres above the canvas) lands on screen, for a framing at a distance. */
const project = (f: ReturnType<typeof framing>, w: number, h: number, dx: number, y: number): { x: number; y: number } => {
  const k = h / (2 * Math.tan((f.fov * Math.PI) / 360) * f.dist), lookY = CANVAS_Y + 1.2
  return { x: w / 2 + dx * k, y: h / 2 - (CANVAS_Y + y - lookY) * k + f.shift }
}
const PORTRAIT = { w: 390, h: 844, inset: { top: 108, bottom: 214, left: 0, right: 0 } }
const LANDSCAPE = { w: 844, h: 390, inset: { top: 108, bottom: 10, left: 166, right: 184 } }

test('portrait: both fighters stand above the pad and below the bars, for a close and a wide pair', () => {
  for (const gap of [1.5, 5, 9]) {
    const f = framing(gap, PORTRAIT.w, PORTRAIT.h, PORTRAIT.inset)
    for (const dx of [-gap / 2 - 0.5, gap / 2 + 0.5]) {
      const feet = project(f, PORTRAIT.w, PORTRAIT.h, dx, 0), head = project(f, PORTRAIT.w, PORTRAIT.h, dx, 1.8)
      assert.ok(feet.y <= PORTRAIT.h - PORTRAIT.inset.bottom, `gap ${gap}: feet at ${feet.y}`)
      assert.ok(head.y >= PORTRAIT.inset.top, `gap ${gap}: head at ${head.y}`)
      assert.ok(feet.x >= 0 && feet.x <= PORTRAIT.w, `gap ${gap}: x ${feet.x}`)
    }
  }
})
test('landscape: the pair stands between the two thumb clusters', () => {
  for (const gap of [1.5, 5, 9]) {
    const f = framing(gap, LANDSCAPE.w, LANDSCAPE.h, LANDSCAPE.inset)
    for (const dx of [-gap / 2 - 0.4, gap / 2 + 0.4]) {
      const feet = project(f, LANDSCAPE.w, LANDSCAPE.h, dx, 0), head = project(f, LANDSCAPE.w, LANDSCAPE.h, dx, 1.8)
      assert.ok(feet.x >= LANDSCAPE.inset.left && feet.x <= LANDSCAPE.w - LANDSCAPE.inset.right, `gap ${gap}: x ${feet.x}`)
      assert.ok(head.y >= LANDSCAPE.inset.top && feet.y <= LANDSCAPE.h, `gap ${gap}: ${head.y}..${feet.y}`)
    }
  }
})
test('the camera backs off as the pair spreads, and stays inside its limits', () => {
  const near = framing(2, 390, 844, PORTRAIT.inset).dist, far = framing(12, 390, 844, PORTRAIT.inset).dist
  assert.ok(far > near && near >= 3.6 && far <= 30)
  assert.ok(framing(30, 844, 390, LANDSCAPE.inset).dist <= 17)
})
test('every model URL is versioned', () => {
  for (const url of [...FIGHT_ASSETS.fighters, FIGHT_ASSETS.ring]) assert.match(url, /\.glb\?v=[0-9a-f]{10}$/)
})
