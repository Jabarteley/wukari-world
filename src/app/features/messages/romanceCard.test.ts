// The words of the "flirt in public?" card and the profile switch (src/app/features/messages/romanceCard.ts).
import test from 'node:test'
import assert from 'node:assert/strict'
import { romanceState, romanceSwitch } from './romanceCard.ts'

const agent = { id: 'a', name: 'Tola', agent: true as const }
test('an open question the person can answer shows buttons, not words; answered or waiting shows a line', () => {
  assert.equal(romanceState({ agent, state: 'open', answerable: true }), null)
  assert.equal(romanceState({ agent, state: 'open', answerable: false }), 'Waiting for their answer.')
  assert.match(romanceState({ agent, state: 'yes', answerable: false }) ?? '', /said yes.*change it on their profile/)
  assert.equal(romanceState({ agent, state: 'no', answerable: false }), 'You said no.')
})
test('the profile switch reads on / off and says how a Bae differs', () => {
  assert.deepEqual([romanceSwitch({ on: true, bae: false }).label, romanceSwitch({ on: true, bae: false }).action], ['Flirting in public: on', 'Turn off'])
  assert.deepEqual([romanceSwitch({ on: false, bae: false }).label, romanceSwitch({ on: false, bae: false }).action], ['Flirting in public: off', 'Turn on'])
  assert.match(romanceSwitch({ on: true, bae: true }).hint, /End being Bae/)
  assert.match(romanceSwitch({ on: true, bae: false }).hint, /Sex, money and meetings outside the game stay refused/)
})
