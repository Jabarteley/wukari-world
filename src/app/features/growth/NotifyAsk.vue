<script setup lang="ts">
// The notification ask, after a good moment (notifyAsk.ts): a win at a table or a new friend. It watches the view for
// those two changes, never reads anything on arrival (the first read is only a baseline), and shows one slim, closable
// bar whose button opens Stay in touch, where the browser's own prompt waits behind a tap. Mounted lazily by hud/GuestBarSlot.vue.
import { computed, ref, watch } from 'vue'
import GameIcon from '../../ui/GameIcon.vue'
import { useApp } from '../../state/app.ts'
import { social } from '../social/useSocial.ts'
import { useAccountLite } from '../account/useAccountLite.ts'
import { callVisible } from '../calls/callState.ts'
import { tour } from '../tour/tourState.ts'
import { loadPushModule } from './boundary.ts'
import { NOTIFY_ASK_WORDS, askAnswer, askDue, askHeld, askMoment } from './notifyAsk.ts'
import type { AskFacts, AskMoment } from './notifyAsk.ts'

const { game, shell } = useApp()
const lite = useAccountLite()
const storage = (): Storage | null => { try { return globalThis.localStorage } catch { return null } }
const push = ref<'ready' | 'unsupported' | 'needs-install' | 'blocked' | 'unknown'>('unknown')
const held = ref(askHeld(storage(), Date.now()))
const moment = ref<AskMoment | null>(null)
const facts = computed<AskFacts>(() => ({ tablesWon: game.view.value.connected ? game.view.value.tables?.won ?? null : null, friends: social.me ? social.me.friends.length : null }))
watch(facts, (now, before) => {
  // The baseline is the first complete read; a later rise in either number is the moment.
  const found = askMoment(before, now)
  if (found && !moment.value && !held.value) { moment.value = found; void loadPushModule().then((module) => { push.value = globalThis.Notification?.permission === 'granted' ? 'unknown' : module.pushState() }) }
}, { immediate: false })
const due = computed(() => {
  const view = game.view.value
  return askDue({
    moment: moment.value, push: push.value, held: held.value, signedIn: lite.state.account !== null, connected: view.connected,
    busy: view.onboarding?.required === true || tour.active || tour.pending || Boolean(shell.sheet.value) || Boolean(game.state.value.activeAction) || callVisible(),
  })
})
function answer(taken: boolean): void { askAnswer(storage(), Date.now(), taken); held.value = true; if (taken) shell.open('touch') }
</script>

<template>
  <section v-if="due && moment" class="nask" role="region" aria-label="Notifications" data-notify-ask>
    <p>{{ NOTIFY_ASK_WORDS[moment].text }}</p>
    <button type="button" class="nask-go" data-notify-ask-open @click="answer(true)">{{ NOTIFY_ASK_WORDS[moment].action }}</button>
    <button type="button" class="nask-x" data-notify-ask-dismiss aria-label="Not now" title="Not now" @click="answer(false)"><GameIcon name="close" :size="16" /></button>
  </section>
</template>

<style scoped>
.nask { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 6px 6px 14px; border-radius: 22px; background: var(--c-surface); border: 1px solid #fff; box-shadow: var(--e-2); pointer-events: auto; font-size: var(--t-body); color: var(--c-ink-2); }
.nask p { flex: 1; min-width: 0; margin: 0; line-height: 1.3; }
.nask button { flex: none; border: 0; font: inherit; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.nask button:focus-visible { outline: var(--focus); outline-offset: 2px; }
.nask-go { min-height: 36px; padding: 0 14px; border-radius: var(--r-pill); background: var(--c-green-dark); color: #fff; font-weight: 700; font-size: var(--t-small); }
.nask-x { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; background: none; color: var(--c-muted); }
</style>
