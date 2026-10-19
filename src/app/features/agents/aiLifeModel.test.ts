// The words of the "your AI life" panel (aiLifeModel.ts): the Spot the AI share text carries only the score and a link with the ad-source words, on its own last line.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { aiLifeWords, betterText, spotShareText } from './aiLifeModel.ts'

test('the score text says the score, never a name, and ends with the site link and its ad-source words', () => {
  const text = spotShareText(22, 25, 'https://play.example/')
  assert.match(text, /22 of 25 right/)
  const last = text.split('\n').at(-1)!
  assert.equal(last, 'https://play.example/?utm_source=share&utm_medium=card&utm_campaign=spot-the-ai')
  assert.match(spotShareText(25, 25, 'https://play.example'), /every one right/)
  assert.equal(betterText(64.4, 12), 'Better than 64% of the 12 players this week.')
  assert.equal(betterText(100, 1), 'You are the first to play this week.')
  assert.equal(betterText(140, 3), 'Better than 100% of the 3 players this week.')
  assert.ok(aiLifeWords.spotOptHelp.includes('never your name'))
})
