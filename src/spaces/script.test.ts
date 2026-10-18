import test from 'node:test'
import assert from 'node:assert/strict'
import { checkOp, cleanScript, fillLine, scriptNames, SCRIPT, TEMPLATES } from './script.ts'

const names = new Set(['Chair', 'Chair 2'])
const lines = ['Hello {1}!', 'Bye']
const plot = { w: 6, d: 6 }

test('script ops: only known models, numbers in range, the space\'s own lines and known sounds pass', () => {
  assert.deepEqual(checkOp(['move', 'Chair', 1, 2, 3], names, lines, plot), { op: 'move', name: 'Chair', x: 1, y: 2, z: 3 })
  assert.equal(checkOp(['move', 'Table', 1, 2, 3], names, lines, plot), null, 'unknown model')
  assert.equal(checkOp(['move', 'Chair', 1e9, 0, 0], names, lines, plot), null, 'far away')
  assert.equal(checkOp(['move', 'Chair', NaN, 0, 0], names, lines, plot), null)
  assert.equal(checkOp(['move', 'Chair', 1, -50, 0], names, lines, plot), null, 'under the ground')
  assert.deepEqual(checkOp(['turn', 'Chair 2', 90], names, lines, plot), { op: 'turn', name: 'Chair 2', degrees: 90 })
  assert.equal(checkOp(['push', 'Chair', 0, SCRIPT.push + 1, 0], names, lines, plot), null)
  assert.deepEqual(checkOp(['color', 'Chair', '#FF0000'], names, lines, plot), { op: 'color', name: 'Chair', hex: '#ff0000' })
  assert.equal(checkOp(['color', 'Chair', 'red; background:url(x)'], names, lines, plot), null)
  assert.deepEqual(checkOp(['show', 'Chair', false], names, lines, plot), { op: 'show', name: 'Chair', on: false })
  assert.deepEqual(checkOp(['say', 0, 3], names, lines, plot), { op: 'say', text: 'Hello 3!', line: 0, values: [3] })
  assert.deepEqual(checkOp(['say', 'Bye'], names, lines, plot), { op: 'say', text: 'Bye', line: 1, values: [] })
  assert.equal(checkOp(['say', 'Visit my site'], names, lines, plot), null, 'words that are not the space\'s own lines')
  assert.equal(checkOp(['say', 9], names, lines, plot), null)
  assert.deepEqual(checkOp(['score', 12], names, lines, plot), { op: 'score', value: 12 })
  assert.deepEqual(checkOp(['sound', 'ding'], names, lines, plot), { op: 'sound', name: 'ding' })
  assert.equal(checkOp(['sound', 'https://example.com/a.mp3'], names, lines, plot), null)
  for (const bad of [null, 'move', {}, [], [1, 2], ['eval', 'x'], ['__proto__', 'Chair']]) assert.equal(checkOp(bad, names, lines, plot), null)
})

test('script lines: filled with numbers only', () => {
  assert.equal(fillLine('{1} of {2}', [3, 10]), '3 of 10')
  assert.equal(fillLine('{1}', [1 / 3]), '0.33')
  assert.equal(fillLine('{1} {4}', []), ' ')
})

test('saving a script: size, characters and every line through the filter', () => {
  const screen = (text: string) => (/bad/.test(text) ? 'That line was not accepted.' : null)
  const ok = cleanScript({ code: 'space.score(1)\r\n', lines: ['  Hello   {1} ', '', 'Bye'] }, screen)
  assert.deepEqual(ok, { ok: true, script: { code: 'space.score(1)\n', lines: ['Hello {1}', 'Bye'] } })
  const blocked = cleanScript({ code: '', lines: ['fine', 'bad words'] }, screen)
  assert.equal(blocked.ok, false)
  assert.match(blocked.ok ? '' : blocked.reason, /Line 2/)
  assert.equal(cleanScript({ code: 'x'.repeat(SCRIPT.code + 1), lines: [] }, screen).ok, false)
  assert.equal(cleanScript({ code: 'a\u0000b', lines: [] }, screen).ok, false)
  assert.equal(cleanScript({ code: 1 }, screen).ok, false)
  assert.equal(cleanScript({ code: '', lines: Array.from({ length: SCRIPT.lines + 1 }, () => 'x') }, screen).ok, false)
  assert.equal(cleanScript({ code: '', lines: ['x'.repeat(SCRIPT.line + 1)] }, screen).ok, false)
})

test('script names: a model placed twice gets a number', () => {
  const found = scriptNames([{ k: 'a', name: 'Chair' }, { k: 'b', name: 'Chair' }, { k: 'c', name: 'Mango tree' }, { k: 'd', name: ' ' }])
  assert.deepEqual([...found.values()], ['Chair', 'Chair 2', 'Mango tree', 'Model'])
})

test('every starter script is valid JavaScript and uses only its own lines', () => {
  for (const template of TEMPLATES) {
    assert.doesNotThrow(() => new Function('space', template.code), template.id)
    const said = [...template.code.matchAll(/space\.say\((\d+)/g)].map((m) => Number(m[1]))
    for (const index of said) assert.ok(index < template.lines.length, `${template.id} says line ${index}`)
  }
})
