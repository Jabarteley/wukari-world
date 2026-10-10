// Escape in a conversation, read from the screen's source (the shell calls keys('cancel') on the panel in front): the open options
// panel is consumed first and focus goes back to the control that opened it; only then does Escape leave the chat.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const app = readFileSync(new URL('./MessagesApp.vue', import.meta.url), 'utf8')

test('Escape closes the options panel and its request form before the chat, and returns focus to the opener', () => {
  assert.match(app, /keys\(action: string\): boolean \{\s*if \(action !== 'cancel' \|\| !ui\.open\) return false\s*if \(ui\.manage\) \{ closeOptions\(\); return true \}\s*back\(\)/)
  assert.match(app, /function closeOptions\(\): void \{\s*ui\.manage = false; requests\.closeForm\(\)\s*void nextTick\(\(\) => optionsButton\.value\?\.focus\(\)\)/)
  assert.match(app, /ref="optionsButton"[^>]*aria-label="Chat options"/)
  assert.ok(!/class="messages-manage"[^>]*@keydown\.esc/.test(app), 'the panel does not also let Escape bubble up to the shell')
  assert.match(app, /aria-label="Close chat options" @click="closeOptions"/)
})
