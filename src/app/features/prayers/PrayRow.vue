<script setup lang="ts">
// "Pray": a small action at a place of worship, fetched only there (VenueActions.vue loads it with defineAsyncComponent). The notice comes first,
// then the box. Nothing in the game changes because a player prays; the people who run Allworld read it (docs/PRAYERS.md).
import { ref } from 'vue'
import { useApp } from '../../state/app.ts'
import { NOTICE, PRAY_MAX, canSend, nextStep, prayerBody } from './prayModel.ts'
import type { PrayStep } from './prayModel.ts'

const { game } = useApp()
const step = ref<PrayStep>('closed'), text = ref(''), notice = ref(NOTICE), left = ref(3), received = ref(''), problem = ref(''), busy = ref(false)

async function open(): Promise<void> {
  problem.value = ''
  step.value = nextStep(step.value, 'open')
  try {
    const answer = await game.fetchJson<{ notice: string; received: string; left: number }>('/api/world/pray')
    notice.value = answer.notice || NOTICE; left.value = answer.left; received.value = answer.received
  } catch { problem.value = 'Prayers cannot be sent right now.' }
}
async function send(): Promise<void> {
  const body = prayerBody(step.value, text.value, game.state.value.location)
  if (!body || !canSend(step.value, text.value, left.value, busy.value)) return
  busy.value = true; problem.value = ''
  try {
    await game.fetchJson('/api/world/pray', { method: 'POST', body: { ...body, clientId: game.newId() } })
    left.value -= 1; text.value = ''; step.value = nextStep(step.value, 'sent')
  } catch (error) { problem.value = (error as { reason?: string }).reason || 'Your prayer was not sent. Try again.' } finally { busy.value = false }
}
</script>

<template>
  <div class="life-actions-note pray-row" role="group" aria-label="Pray">
    <button v-if="step === 'closed'" class="life-action" type="button" @click="open"><span class="life-action-head"><span class="life-action-title">Pray</span></span><span class="life-action-meta">A quiet moment</span></button>
    <template v-else-if="step === 'notice'">
      <p>{{ notice }}</p>
      <button class="ui-button" type="button" @click="step = nextStep(step, 'continue')">I understand</button>
      <button class="ui-button" type="button" @click="step = nextStep(step, 'close')">Not now</button>
    </template>
    <template v-else-if="step === 'write'">
      <label>Your prayer<textarea v-model="text" :maxlength="PRAY_MAX" rows="3" /></label>
      <button class="ui-button" type="button" :disabled="!canSend(step, text, left, busy)" @click="send">Send</button>
      <button class="ui-button" type="button" @click="step = nextStep(step, 'close')">Cancel</button>
    </template>
    <p v-else-if="step === 'sent'">{{ received }}</p>
    <p v-if="problem" role="alert">{{ problem }}</p>
  </div>
</template>
