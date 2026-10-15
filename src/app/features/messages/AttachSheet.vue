<script setup lang="ts">
// The "+" of the message box: one short sheet with what can be added to a chat (a picture, a voice note, money), so none of it
// needs a panel sitting between the header and the thread. Only what this chat can do is listed.
import BaseSheet from '../../ui/BaseSheet.vue'

export type AttachChoice = 'picture' | 'voice' | 'send-money' | 'request-money' | 'spray'
defineProps<{ open: boolean; pictures: boolean; voice: boolean; money: boolean; offline: boolean; spray?: boolean }>()
const emit = defineEmits<{ close: []; pick: [choice: AttachChoice] }>()
</script>

<template>
  <BaseSheet :open="open" label="Attach or send money" class="attach-sheet" @close="emit('close')">
    <template v-if="open">
    <h3 class="attach-title">Add to this chat</h3>
    <ul class="attach-list" data-chat="attach-list">
      <li v-if="pictures"><button type="button" data-chat="attach-picture" @click="emit('pick', 'picture')"><span aria-hidden="true">📷</span><b>Picture</b><small>Choose a photo to send</small></button></li>
      <li v-if="voice"><button type="button" data-chat="attach-voice" @click="emit('pick', 'voice')"><span aria-hidden="true">🎤</span><b>Voice note</b><small>Up to one minute, reviewed before sending</small></button></li>
      <li v-if="money"><button type="button" data-chat="send-money" @click="emit('pick', 'send-money')"><span aria-hidden="true">💸</span><b>Send money</b><small>A gift, under the usual limits</small></button></li>
      <li v-if="money"><button type="button" data-chat="request-money" :disabled="offline" @click="emit('pick', 'request-money')"><span aria-hidden="true">🧾</span><b>Request money</b><small>{{ offline ? 'Reconnect to ask for money.' : 'Your friend sees a card to pay or decline' }}</small></button></li>
      <li v-if="spray"><button type="button" data-chat="spray" :disabled="offline" @click="emit('pick', 'spray')"><span aria-hidden="true">🎉</span><b>Spray</b><small>{{ offline ? 'Reconnect to spray' : 'Share game money with friends in this group' }}</small></button></li>
    </ul>
    <p v-if="!pictures && !voice && !money && !spray" class="attach-none">Nothing can be added to this chat.</p>
    </template>
  </BaseSheet>
</template>

<style scoped>
.attach-sheet { margin-top: auto; margin-bottom: calc(10px + env(safe-area-inset-bottom, 0px)); }
.attach-title { margin: 0; padding: 16px 64px 4px 18px; font-size: 16px; }
.attach-list { margin: 0; padding: 6px 8px 10px; list-style: none; }
.attach-list button { display: grid; grid-template-columns: 40px minmax(0, 1fr); column-gap: 12px; align-items: center; width: 100%; min-height: 56px; padding: 6px 10px; border: 0; border-radius: var(--r-md); background: none; text-align: left; font: inherit; color: inherit; cursor: pointer; touch-action: manipulation; }
.attach-list button:hover { background: var(--c-fill); }
.attach-list button:focus-visible { outline: var(--focus); outline-offset: -2px; }
.attach-list button:disabled { opacity: .5; cursor: not-allowed; }
.attach-list span { grid-row: 1 / 3; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; background: var(--c-fill); font-size: 20px; }
.attach-list b { font-size: 15px; font-weight: 650; }
.attach-list small { font-size: 12px; line-height: 1.3; color: var(--c-muted); }
.attach-none { margin: 0; padding: 8px 18px 18px; font-size: 13px; color: var(--c-muted); }
</style>
