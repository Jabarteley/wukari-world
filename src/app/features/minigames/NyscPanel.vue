<script setup lang="ts">
// NYSC camp (docs/MINI-GAMES.md): registration, the platoon and the parade over three weeks, then the passing out. One duty a day, a scene with three choices;
// the server keeps the points and the pay. The passing-out card is drawn on this device and handed to Capture to share.
import { computed, ref } from 'vue'
import { useApp } from '../../state/app.ts'
import SectionTitle from '../../ui/SectionTitle.vue'
import type { NyscView } from '../../../types/minigames.ts'
import { minigamesApi } from './minigamesApi.ts'
import { campProgress, dutyToday } from './seasonsModel.ts'
import { naira } from './haggleModel.ts'
import { track } from '../world/worldModel.ts'

const props = defineProps<{ view: NyscView; city: string }>()
const emit = defineEmits<{ changed: [] }>()
const { game, shell } = useApp()
const api = minigamesApi(game.fetchJson)
const busy = ref(false)
const note = ref('')
const next = computed(() => dutyToday(props.view))

async function run(step: string, call: () => Promise<{ ok: true; paid?: number } | { ok: false; reason: string }>): Promise<void> {
  if (busy.value) return
  busy.value = true; note.value = ''
  const answer = await call()
  busy.value = false
  if (!answer.ok) { note.value = answer.reason; emit('changed'); return }
  track('season_step', { season: 'nysc', action: step })
  if (answer.paid) { note.value = `${naira(answer.paid)} paid into your wallet.`; void game.refresh() }
  emit('changed')
}
const join = (): Promise<void> => run('join', () => api.joinNysc(props.city, game.newId()))
const choose = (duty: string, option: string): Promise<void> => run('duty', () => api.duty(props.city, duty, option, game.newId()))
const passOut = (): Promise<void> => run('pass-out', () => api.passOut(props.city, game.newId()))

async function share(): Promise<void> {
  const card = props.view.card
  if (!card || busy.value) return
  busy.value = true
  try {
    const { nyscCardPhoto } = await import('./seasonCards.ts')
    const { adoptCapture } = await import('../capture/captureSession.ts')
    if (!adoptCapture({ photo: await nyscCardPhoto(card) })) { note.value = 'Capture is busy. Try again in a moment.'; return }
    track('season_step', { season: 'nysc', action: 'card' })
    shell.open('capture')
  } catch { note.value = 'The card could not be made on this device.' } finally { busy.value = false }
}
</script>

<template>
  <div class="ny" data-season="nysc">
    <p v-if="!view.joined" class="social-note">Camp takes three weeks. Week one is registration, week two is your platoon and week three is the parade, then you pass out. Do one short duty a day, make your choices, and earn a small allowance in game naira. Batch {{ view.batch }}.</p>
    <template v-if="!view.joined">
      <button type="button" class="ui-button is-primary" :disabled="busy || !view.on" data-nysc="join" @click="join">Join camp</button>
      <p v-if="!view.on" class="ui-note">Camp is not open for new corps members right now.</p>
    </template>
    <template v-else>
      <p class="ny-line"><strong>{{ view.camp?.name }}</strong>, {{ view.camp?.state }} · Platoon {{ view.platoon }} · {{ campProgress(view) }} · {{ naira(view.earned) }} earned</p>
      <p v-if="note" class="ui-note" role="status" data-nysc="note">{{ note }}</p>
      <div v-for="stage in view.stages" :key="stage.id" class="ny-stage" :class="{ 'is-closed': !stage.open }" :data-stage="stage.id">
        <SectionTitle>{{ stage.title }}{{ stage.done ? ' · done' : '' }}</SectionTitle>
        <p class="ny-blurb">{{ stage.open ? stage.blurb : `Opens on day ${stage.opensDay + 1} of camp.` }}</p>
        <template v-if="stage.open">
          <div v-for="duty in stage.duties" :key="duty.id" class="ny-duty" :data-duty="duty.id">
            <strong>{{ duty.title }}</strong>
            <template v-if="duty.done"><p class="ny-result">{{ duty.result }}</p></template>
            <template v-else-if="next && next.duty === duty.id">
              <p>{{ duty.scene }}</p>
              <button v-for="option in duty.options" :key="option.id" type="button" class="ui-button ny-option" :disabled="busy" :data-option="option.id" @click="choose(duty.id, option.id)">{{ option.text }}</button>
            </template>
            <p v-else class="ny-wait">{{ view.dutyToday ? 'Today\'s duty is done. This one waits for tomorrow.' : 'Do the duty above first.' }}</p>
          </div>
        </template>
      </div>
      <div v-if="view.passingOut !== 'done'" class="ny-pass">
        <SectionTitle>Passing out</SectionTitle>
        <button v-if="view.passingOut === 'ready'" type="button" class="ui-button is-primary" :disabled="busy" data-nysc="pass-out" @click="passOut">Attend the passing out parade</button>
        <p v-else class="ny-wait">The passing out parade is on day 22, once every duty is done.</p>
      </div>
      <div v-if="view.card" class="ny-card" data-nysc="card">
        <strong>Passed out · {{ view.card.honour }}</strong>
        <p>{{ view.card.camp }}, platoon {{ view.card.platoon }}. Posted to {{ view.card.posting }}.</p>
        <button type="button" class="ui-button is-primary" :disabled="busy" @click="share">Share your passing-out card</button>
      </div>
      <p class="ny-fine">Game naira only. A game about camp life, not an official programme. At most {{ naira(500) }} a duty and {{ naira(8000) }} at the passing out.</p>
    </template>
  </div>
</template>

<style scoped>
.ny { display: flex; flex-direction: column; gap: 10px; }
.ny-line { margin: 0; font-size: 14px; }
.ny-stage.is-closed { opacity: .6; }
.ny-blurb { margin: 0; font-size: 13px; opacity: .8; }
.ny-duty { padding: 8px 0; display: flex; flex-direction: column; gap: 6px; border-bottom: 1px solid rgba(127,127,127,.2); }
.ny-duty p { margin: 0; font-size: 13px; }
.ny-option { text-align: left; white-space: normal; }
.ny-result { opacity: .85; }
.ny-wait { opacity: .7; font-size: 12px; }
.ny-card { border-radius: 14px; padding: 12px; background: rgba(47, 158, 68, .15); border: 1px solid rgba(47, 158, 68, .55); display: flex; flex-direction: column; gap: 6px; }
.ny-card p { margin: 0; font-size: 13px; }
.ny-fine { font-size: 12px; opacity: .7; margin: 0; }
</style>
