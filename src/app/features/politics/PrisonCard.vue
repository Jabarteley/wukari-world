<script setup lang="ts">
// Jail you can play (docs/JAIL.md): the jobs that take minutes off a sentence, community service for a short one, the parole hearing
// at half, and the visiting hours. It draws what the server sends (server/politics/prison.ts) and asks for nothing itself:
// the Justice tab runs the actions. Fetched with the Justice tab, so it is not in the first download.
import CivicAction from '../civic/CivicAction.vue'
import { parolePhrase, visitingPhrase } from './prisonModel.ts'
import type { PrisonView } from '../../../types/politics.ts'

defineProps<{ prison: PrisonView; busy: (key: string) => boolean; reason: string }>()
const emit = defineEmits<{ work: [job: string]; service: []; parole: [] }>()
</script>

<template>
  <section class="ui-card politics-prison" aria-label="Prison">
    <strong>Time inside</strong>
    <p class="politics-note">Work shortens your sentence by a few minutes a go. Up to {{ prison.capLeftMin }} more minutes today.</p>
    <div class="politics-prison-jobs">
      <CivicAction v-for="job in prison.jobs" :key="job.id" :working="busy(`p-prison:${job.id}`)" :reason="reason || (prison.capLeftMin <= 0 ? 'You have earned the most you can today.' : job.waitMs > 0 ? 'You did that a moment ago. Try another.' : '')" @click="emit('work', job.id)">{{ job.label }} · {{ job.cutMin }} min off</CivicAction>
    </div>
    <CivicAction v-if="prison.service" :working="busy('p-prison:service')" :reason="reason" @click="emit('service')">Community service · {{ prison.service.cutMin }} min off</CivicAction>
    <p class="politics-note">{{ parolePhrase(prison.parole) }}</p>
    <CivicAction v-if="prison.parole.state !== 'denied'" :working="busy('p-parole')" :reason="reason || (prison.parole.state === 'wait' ? parolePhrase(prison.parole) : '')" @click="emit('parole')">Ask for a parole hearing</CivicAction>
    <p class="politics-note">{{ visitingPhrase(prison.visiting) }}</p>
  </section>
</template>
