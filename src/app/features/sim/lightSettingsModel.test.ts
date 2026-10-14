import assert from 'node:assert/strict'
import { test } from 'node:test'
import { forgetLight, lightOn } from '../../../lightMode.ts'
import { getSound, setSound } from '../../../audio/settings.ts'
import { DATA_NOTE, LIGHT_HINT, applyLight } from './lightSettingsModel.ts'

test('turning Light mode on switches the existing Music switch off; turning it off leaves sound alone', () => {
  forgetLight(); setSound({ musicOn: true })
  applyLight(true)
  assert.equal(lightOn(), true)
  assert.equal(getSound().musicOn, false)
  setSound({ musicOn: true })
  applyLight(false)
  assert.equal(lightOn(), false)
  assert.equal(getSound().musicOn, true, 'the player turned music back on; turning light off changes nothing')
  forgetLight()
})

test('the words are short, plain and honest about what is and is not counted', () => {
  assert.match(LIGHT_HINT, /data/)
  assert.match(LIGHT_HINT, /30 frames/)
  assert.match(DATA_NOTE, /not live chat or calls/)
})
