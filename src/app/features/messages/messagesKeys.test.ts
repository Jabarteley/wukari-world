// Escape in a conversation, read from the screen's source (the shell calls keys('cancel') on the panel in front): whatever is laid
// over the chat (menu, request form, pins, attach sheet) is consumed first and focus goes back to the menu's opener; only then does Escape leave the chat.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const app = readFileSync(new URL('./MessagesApp.vue', import.meta.url), 'utf8')

test('Escape closes the menu and the request form before the chat, and returns focus to the opener', () => {
  assert.match(app, /keys\(action: string\): boolean \{\s*if \(action !== 'cancel' \|\| !ui\.open\) return false/)
  assert.match(app, /if \(pinsOpen\.value \|\| attachOpen\.value \|\| requests\.ask\.open \|\| ui\.manage\) \{[^}]*requests\.closeForm\(\)[^}]*if \(menu\) closeMenu\(\); return true \}\s*back\(\)/)
  assert.match(app, /function closeMenu\(\): void \{ ui\.manage = false; void nextTick\(\(\) => rootBox\.value\?\.querySelector<HTMLElement>\('\.messages-kebab'\)\?\.focus\(\)\) \}/)
  assert.match(app, /:can-request="canRequest"/)
})
