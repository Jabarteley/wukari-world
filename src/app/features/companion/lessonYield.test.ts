// The floating guide steps aside for a teaching lesson on phone widths, so the lesson's feedback can be read. No browser.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { yieldsToLesson } from './lessonYield.ts'

test('the floating guide steps aside for a teaching lesson on phone and constrained tablet widths', () => {
  for (const width of [320, 390, 720, 721, 768, 1024, 1239]) assert.equal(yieldsToLesson(true, width), true, `a lesson at ${width}px`)
  assert.equal(yieldsToLesson(false, 390), false, 'no lesson, no yield')
  assert.equal(yieldsToLesson(false, 768), false, 'no lesson, no yield on a tablet either')
})

test('wide screens keep the guide where it is during a lesson', () => {
  assert.equal(yieldsToLesson(true, 1240), false)
  assert.equal(yieldsToLesson(true, 1280), false)
})
