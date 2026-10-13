<script setup lang="ts">
// The coach line above the venue panel: for the first starter goals it names the next control, and the
// attention system (useAttention.ts) rings that control — or, for the situational pointers (Go on the
// map, the trip card, a roadside prompt), shows a small bubble when it is far from where the player
// last clicked. It stops by itself after the first goals and can be switched off for good on this device.
import { computed, watch } from 'vue'
import GameIcon from '../../ui/GameIcon.vue'
import { useApp } from '../../state/app.ts'
import { useAttention } from './useAttention.ts'
import { settleWanted, tour } from '../tour/tourState.ts'

const { game, shell } = useApp()
const { coach, dismiss } = useAttention()
// First minute, one voice at a time: the walkthrough, then the settle-in offer, then this line (tourState.ts).
const line = computed(() => (tour.active || tour.pending || settleWanted(game.view.value, tour.settleAway) ? null : coach.value))
// One line of guidance at a time: while the coach is talking, a phone's HUD drops the goal chip that says the same thing.
watch(line, (now) => { shell.ui.coaching = Boolean(now) }, { immediate: true })
</script>

<template>
  <div v-if="line" class="life-coach" role="note">
    <span aria-hidden="true"><GameIcon inline name="pointer" /></span>
    <p><b>{{ line.title }}</b>{{ line.text }}</p>
    <button type="button" aria-label="Hide these tips" @click="dismiss"><GameIcon name="close" /></button>
  </div>
</template>
