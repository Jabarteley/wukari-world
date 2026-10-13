// An open app on a phone-sized screen owns the whole screen: no fake status bar, notch or home bar, a short app header with its own
// Close button, and no Close pill over the scene. This reads the stylesheet's mobile block, where those rules live.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const css = await readFile(new URL('./phone.css', import.meta.url), 'utf8')
const mobile = css.slice(css.indexOf('@media(max-width:520px){'), css.indexOf('@media(prefers-reduced-motion:reduce)'))

test('on a phone an open app hides the fake status bar, notch and home bar', () => {
  assert.match(mobile, /\.ph\[data-view=app\] \.ph-status,\.ph\[data-view=app\] \.ph-island,\.ph\[data-view=app\] \.ph-homebar\{display:none\}/)
})

test('the app header is slim and carries the Close button; the Close pill steps aside', () => {
  assert.match(mobile, /\.ph-appbar\{min-height:56px;/)
  assert.match(mobile, /\.ph-appclose\{display:grid\}/)
  assert.match(mobile, /\.ph-stage:has\(\.ph\[data-view=app\]\) \.ph-close\{display:none\}/)
  assert.match(mobile, /--ph-top:env\(safe-area-inset-top\)/)
})

test('the Close button of the app header is hidden where the pill is used (wide screens)', () => {
  assert.match(css, /\.ph-appclose\{display:none;/)
})
