<script setup lang="ts">
// Told once to an account whose e-mails about its character were switched on by default: a slim bar that says so and
// turns them off in one tap (hud/GuestBarSlot.vue decides when it may be on screen). Either answer ends it on the server.
import { computed, ref } from 'vue'
import { useApp } from '../../state/app.ts'
import GameIcon from '../../ui/GameIcon.vue'
import { MAIL_NOTICE_WORDS, mailNoticeDue } from './mailStatusModel.ts'
import { useGrowth } from './useGrowth.ts'

const { game } = useApp()
const growth = useGrowth()
const busy = ref(false)
const due = computed(() => mailNoticeDue(growth.state.hello?.contact))
void growth.load()
async function answer(on: boolean): Promise<void> {
  if (busy.value) return
  busy.value = true
  const result = await growth.call<{ ok: boolean; reason?: string }>('/api/growth/comeback', { on })
  if (!result.ok) game.toast(('reason' in result && result.reason) || 'That could not be saved.', 'error')
  else if (!on) game.toast('E-mails about your character are off. Phone, Stay in touch, to change it.')
  await growth.load({ force: true })
  busy.value = false
}
</script>

<template>
  <section v-if="due" class="toff" role="region" aria-label="E-mails about your character" data-mail-notice>
    <p><span class="toff-lead">{{ MAIL_NOTICE_WORDS.title }}</span><span class="toff-dot" aria-hidden="true"> · </span><span class="toff-ask">{{ MAIL_NOTICE_WORDS.text }}</span></p>
    <button type="button" class="toff-go" data-mail-notice-off :disabled="busy" @click="answer(false)">{{ MAIL_NOTICE_WORDS.off }}</button>
    <button type="button" class="toff-x" data-mail-notice-keep :aria-label="MAIL_NOTICE_WORDS.keep" :title="MAIL_NOTICE_WORDS.keep" :disabled="busy" @click="answer(true)"><GameIcon name="close" :size="16" /></button>
  </section>
</template>

<style scoped>
.toff { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 6px 6px 14px; border-radius: 22px; background: var(--c-surface); border: 1px solid #fff; box-shadow: var(--e-2); pointer-events: auto; font-size: var(--t-body); color: var(--c-ink-2); }
.toff p { flex: 1; min-width: 0; margin: 0; line-height: 1.3; }
.toff-lead { font-weight: 700; color: var(--c-ink); }
.toff button { flex: none; border: 0; font: inherit; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.toff button:focus-visible { outline: var(--focus); outline-offset: 2px; }
.toff-go { min-height: 36px; padding: 0 14px; border-radius: var(--r-pill); background: var(--c-fill); color: var(--c-ink); font-weight: 700; font-size: var(--t-small); }
.toff-x { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; background: none; color: var(--c-muted); }
.toff-x:hover { background: var(--c-fill); color: var(--c-ink); }
@media (max-width: 520px) {
  .toff { padding-left: 12px; gap: 4px; }
  .toff-dot { display: none; }
  .toff-lead { display: block; }
  .toff-ask { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; overflow: hidden; font-size: 12px; }
  .toff-go { padding: 0 11px; }
}
</style>
