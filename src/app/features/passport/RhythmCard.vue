<script setup lang="ts">
import { computed, onMounted } from 'vue'
import type { RhythmRecognitionId, RhythmViewStatus } from '../../../types/cadence.ts'
import { useApp } from '../../state/app.ts'
import BaseButton from '../../ui/BaseButton.vue'
import GameIcon from '../../ui/GameIcon.vue'
import { useRetention } from './useRetention.ts'

const { game } = useApp()
const retention = useRetention()
const view = computed(() => retention.state.view)
const rhythm = computed(() => view.value?.rhythm ?? null)
const recognition = [
  { id: 'three-day-ribbon', days: 3, label: '3-day ribbon' },
  { id: 'seven-day-badge', days: 7, label: '7-day badge' },
  { id: 'fourteen-day-display', days: 14, label: '14-day display' },
  { id: 'thirty-day-title', days: 30, label: '30-day title' },
] as const satisfies readonly { id: RhythmRecognitionId; days: number; label: string }[]
const earned = computed(() => new Set(rhythm.value?.recognition.map(row => row.id) ?? []))
const statusCopy = computed(() => {
  const row = rhythm.value
  if (!row) return ''
  const copy: Readonly<Record<RhythmViewStatus, string>> = {
    disabled: 'Tracking is off. Recognition you already earned stays saved.',
    not_started: 'Your next meaningful day will start your rhythm.',
    active_today: 'Today is counted. You can return tomorrow when it suits you.',
    awaiting_today: 'A meaningful activity today will continue your rhythm.',
    rest_available: 'Your saved rest day can cover one missed day when your next meaningful day is recorded.',
    expired: 'The previous rhythm ended. Your next meaningful day starts a new one; your best and lifetime totals stay saved.',
    clock_rollback: 'The server clock is earlier than your saved activity, so the rhythm will wait without changing.',
  }
  return copy[row.status]
})
const nextWidth = computed(() => {
  const row = rhythm.value
  if (!row?.nextRecognition) return 100
  return Math.min(100, row.current / row.nextRecognition.activeDays * 100)
})
const actionReason = computed(() => game.connected.value ? '' : 'Reconnect to change rhythm tracking.')

onMounted(() => { void retention.load() })
</script>

<template>
  <section v-if="retention.visible.value && rhythm && view" class="rhythm-card" aria-labelledby="rhythm-title">
    <header class="rhythm-head">
      <span aria-hidden="true"><GameIcon name="calendar" :size="21" /></span>
      <div><h3 id="rhythm-title">My rhythm</h3><p>{{ statusCopy }}</p></div>
      <strong>{{ rhythm.optedIn ? `${rhythm.current} active day${rhythm.current === 1 ? '' : 's'}` : 'Off' }}</strong>
    </header>

    <template v-if="rhythm.optedIn || rhythm.lifetime > 0">
      <div class="rhythm-numbers">
        <div><small>Best rhythm</small><b>{{ rhythm.best }} {{ rhythm.best === 1 ? 'day' : 'days' }}</b></div>
        <div><small>Lifetime active days</small><b>{{ rhythm.lifetime }}</b></div>
      </div>

      <div v-if="rhythm.optedIn && rhythm.nextRecognition" class="rhythm-next">
        <div><span>Next recognition</span><b>{{ rhythm.nextRecognition.activeDays }} active days</b></div>
        <div class="rhythm-meter" role="meter" aria-label="Progress to next rhythm recognition" aria-valuemin="0" :aria-valuemax="rhythm.nextRecognition.activeDays" :aria-valuenow="rhythm.current"><i :style="{ width: `${nextWidth}%` }" /></div>
      </div>

      <ul class="rhythm-recognition" aria-label="Permanent rhythm recognition">
        <li v-for="item in recognition" :key="item.id" :class="{ 'is-earned': earned.has(item.id) }"><GameIcon :name="earned.has(item.id) ? 'good' : 'star'" :size="16" /><span>{{ item.label }}</span><b>{{ earned.has(item.id) ? 'Earned' : `${item.days} days` }}</b></li>
      </ul>

      <p v-if="rhythm.optedIn" class="rhythm-rest"><GameIcon inline name="clock" /> {{ rhythm.restDaysHeld ? 'One free rest day is ready.' : `${rhythm.activeSinceRestGrant} of 4 active days toward a free rest day.` }}</p>
    </template>
    <p v-else class="rhythm-intro">Keep an optional count of meaningful days you play. It rewards permanent recognition only, and you can turn it off whenever you want.</p>

    <p v-if="retention.state.saveError" class="rhythm-error" role="alert">{{ retention.state.saveError }}</p>
    <div class="rhythm-actions">
      <BaseButton :variant="rhythm.optedIn ? 'default' : 'primary'" :disabled="Boolean(actionReason) || retention.state.saving !== null || (!rhythm.optedIn && !view.flags.rhythm)" :reason="actionReason || (!rhythm.optedIn && !view.flags.rhythm ? 'New rhythm tracking is not available right now.' : '')" @click="retention.save(retention.state.retryOptIn ?? !rhythm.optedIn)">{{ retention.state.saving !== null ? 'Saving…' : retention.state.retryOptIn !== null ? 'Retry change' : rhythm.optedIn ? 'Turn off rhythm' : rhythm.lifetime ? 'Turn rhythm back on' : 'Start my rhythm' }}</BaseButton>
    </div>

    <details class="rhythm-details">
      <summary>How rhythm works</summary>
      <div>
        <p>A day counts after a meaningful action you play yourself. Opening this screen does not count.</p>
        <p>{{ rhythm.resetCopy }}</p>
        <p>{{ rhythm.restCopy }}</p>
        <p>{{ rhythm.outageCopy }}</p>
        <p>Recognition is permanent and cosmetic. Rhythm never multiplies cash, stars, or other rewards.</p>
      </div>
    </details>
  </section>
</template>

<style scoped>
.rhythm-card { container: rhythm / inline-size; display: grid; gap: 11px; padding: 13px; border-radius: var(--r-md); background: var(--c-surface-solid); box-shadow: var(--e-1), var(--ring); }
.rhythm-head { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 10px; align-items: start; }.rhythm-head > span { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 13px; background: var(--c-blue-soft); color: var(--c-blue); }.rhythm-head h3,.rhythm-head p { margin: 0; }.rhythm-head h3 { font-size: 16px; }.rhythm-head p { margin-top: 3px; color: var(--c-ink-2); font-size: 12px; line-height: 1.45; }.rhythm-head > strong { padding: 4px 8px; border-radius: var(--r-pill); background: var(--c-green-soft); color: var(--c-green-dark); font-size: 11px; white-space: nowrap; }
.rhythm-numbers { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }.rhythm-numbers div { padding: 9px 10px; border-radius: var(--r-sm); background: var(--c-fill); }.rhythm-numbers small,.rhythm-numbers b { display: block; }.rhythm-numbers small { color: var(--c-muted); font-size: 11px; }.rhythm-numbers b { margin-top: 2px; font-size: 15px; font-variant-numeric: tabular-nums; }
.rhythm-next { display: grid; gap: 6px; }.rhythm-next > div:first-child { display: flex; justify-content: space-between; gap: 8px; color: var(--c-ink-2); font-size: 12px; }.rhythm-meter { height: 8px; overflow: hidden; border-radius: var(--r-pill); background: var(--c-fill); }.rhythm-meter i { display: block; height: 100%; border-radius: inherit; background: var(--c-green); }
.rhythm-recognition { list-style: none; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; margin: 0; padding: 0; }.rhythm-recognition li { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 2px 6px; align-items: center; padding: 8px; border-radius: var(--r-sm); background: var(--c-fill); color: var(--c-muted); font-size: 11px; }.rhythm-recognition li > b { grid-column: 2; font-size: 10px; }.rhythm-recognition li.is-earned { background: var(--c-green-soft); color: var(--c-green-dark); }
.rhythm-rest,.rhythm-intro,.rhythm-error { margin: 0; font-size: 12px; line-height: 1.45; }.rhythm-rest { color: var(--c-ink-2); }.rhythm-intro { color: var(--c-ink-2); }.rhythm-error { padding: 9px 10px; border-radius: var(--r-sm); background: var(--c-red-soft); color: var(--c-red-dark); }
.rhythm-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.rhythm-details { border-top: 1px solid var(--c-line); }.rhythm-details summary { display: flex; align-items: center; min-height: 44px; color: var(--c-green-dark); font-size: 12px; font-weight: 700; cursor: pointer; }.rhythm-details > div { padding: 9px 11px; border-radius: var(--r-sm); background: var(--c-fill); }.rhythm-details p { margin: 0 0 7px; color: var(--c-ink-2); font-size: 12px; line-height: 1.5; }.rhythm-details p:last-child { margin-bottom: 0; }
@container rhythm (max-width: 280px) { .rhythm-head { grid-template-columns: auto minmax(0, 1fr); }.rhythm-head > strong { grid-column: 2; justify-self: start; }.rhythm-recognition { grid-template-columns: 1fr; } }
</style>
