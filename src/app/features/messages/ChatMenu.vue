<script setup lang="ts">
// The chat's "⋯" menu of a direct chat: pins, money, pinning the chat to the top of the list and removing it from the list.
// It hangs over the thread (the thread does not move) and closes on a choice, a tap outside or Escape.
import { nextTick, onMounted, ref } from 'vue'

defineProps<{ canRequest: boolean; pins: number; pinsShown: boolean; chatExists: boolean; chatPinned: boolean; offline: boolean }>()
const emit = defineEmits<{ close: []; pins: []; 'send-money': []; 'request-money': []; 'pin-chat': [on: boolean]; hide: [] }>()
const box = ref<HTMLElement | null>(null)
onMounted(() => { void nextTick(() => box.value?.querySelector<HTMLElement>('button')?.focus()) })
function keys(event: KeyboardEvent): void {
  if (event.key === 'Escape') { event.stopPropagation(); emit('close'); return }
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  const items = Array.from(box.value?.querySelectorAll<HTMLElement>('button:not(:disabled)') ?? []), at = items.indexOf(document.activeElement as HTMLElement)
  event.preventDefault()
  items[(at + (event.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus()
}
</script>

<template>
  <div class="chat-menu-scrim" @click="emit('close')" />
  <section ref="box" class="messages-manage chat-menu" role="menu" aria-label="Chat options" @keydown="keys">
    <button v-if="pinsShown" type="button" role="menuitem" data-chat="pins" @click="emit('pins')">Pinned messages<small v-if="pins">{{ pins }}</small></button>
    <button type="button" role="menuitem" data-chat="send-money" @click="emit('send-money')">Send money</button>
    <button v-if="canRequest" type="button" role="menuitem" data-chat="request-money" :disabled="offline" @click="emit('request-money')">Request money<small v-if="offline">Reconnect first</small></button>
    <template v-if="chatExists">
      <button type="button" role="menuitem" data-chat="pin-chat" @click="emit('pin-chat', !chatPinned)">{{ chatPinned ? 'Unpin from the top of my chats' : 'Pin to the top of my chats' }}</button>
      <button type="button" role="menuitem" class="is-danger" data-chat="hide" @click="emit('hide')">Delete this chat for me</button>
      <p>The other person keeps their copy. The chat comes back if either of you writes again.</p>
    </template>
  </section>
</template>

<style scoped>
.chat-menu-scrim { position: absolute; inset: 62px 0 0; z-index: 4; }
.chat-menu { position: absolute; z-index: 5; top: 62px; right: 8px; display: grid; width: min(300px, calc(100% - 16px)); padding: 6px; border: 1px solid var(--c-line); border-radius: var(--r-md); background: #fff; box-shadow: var(--e-2, var(--e-1)); }
.chat-menu button { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 48px; padding: 0 12px; border: 0; border-radius: 10px; background: none; font: 600 14px var(--font); text-align: left; color: inherit; cursor: pointer; touch-action: manipulation; }
.chat-menu button:hover { background: var(--c-fill-2); }
.chat-menu button:focus-visible { outline: var(--focus); outline-offset: -2px; }
.chat-menu button:disabled { opacity: .5; cursor: not-allowed; }
.chat-menu button.is-danger { color: var(--c-red-dark); }
.chat-menu small { font-size: 12px; font-weight: 600; color: var(--c-muted); }
.chat-menu p { margin: 2px 12px 8px; font-size: 12px; line-height: 1.4; color: var(--c-muted); }
</style>
