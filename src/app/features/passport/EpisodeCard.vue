<script setup lang="ts">
import { computed, ref } from 'vue'
import type { EpisodeOptionAction, EpisodeOptionView, EpisodeView } from '../../../types/episodes.ts'
import { useApp } from '../../state/app.ts'
import BaseButton from '../../ui/BaseButton.vue'
import GameIcon from '../../ui/GameIcon.vue'
import { originLine } from './passportModel.ts'

const props = defineProps<{ row: EpisodeView; disconnected?: string }>()
const { game, shell, goTo } = useApp()
const pending = ref<string | null>(null)
const chapterCount = 4
const completedChapters = computed(() => Math.min(chapterCount, props.row.history.length))
const date = new Intl.DateTimeFormat('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric' })
const safePart = /^[a-z][a-z0-9-]{0,63}$/
const routeReason = computed(() => {
  if (props.disconnected) return props.disconnected
  const { venue, spot } = props.row.next
  if (!safePart.test(venue) || !safePart.test(spot)) return 'This story destination is unavailable.'
  if (!game.view.value.venues.some(row => row.id === venue)) return `This chapter continues in a place that is not available in ${game.view.value.city.name}.`
  return ''
})

function when(at: number): string { return date.format(new Date(at)) }
function optionReason(option: EpisodeOptionView): string {
  if (props.disconnected) return props.disconnected
  if (pending.value) return 'Another story choice is being saved.'
  if (!option.enabled) return option.reason ?? 'Complete the required activity first.'
  return ''
}
function prerequisite(option: EpisodeOptionView): void {
  const next = option.next
  if (!next || props.disconnected || !safePart.test(next.venue) || !safePart.test(next.spot) || !game.view.value.venues.some(row => row.id === next.venue)) return
  shell.close(); void goTo(next.venue, next.spot)
}
function route(): void {
  if (routeReason.value) return
  shell.close()
  void goTo(props.row.next.venue, props.row.next.spot)
}
async function dispatch(action: EpisodeOptionAction): Promise<boolean> {
  switch (action.type) {
    case 'episodes.intro': return (await game.command('episodes.intro', action.payload)).ok
    case 'episodes.choose': return (await game.command('episodes.choose', action.payload)).ok
    case 'episodes.resolve': return (await game.command('episodes.resolve', action.payload)).ok
    case 'episodes.finish': return (await game.command('episodes.finish', action.payload)).ok
  }
}
async function choose(option: EpisodeOptionView): Promise<void> {
  if (optionReason(option)) return
  pending.value = option.id
  try {
    if (await dispatch(option.action)) game.toast('Your story has been saved.', 'good')
  } finally { pending.value = null }
}
</script>

<template>
  <article class="episode-card" :aria-labelledby="`episode-${row.id}-title`">
    <header class="episode-head">
      <span class="episode-icon" aria-hidden="true"><GameIcon name="book" :size="22" /></span>
      <span><small>{{ row.status === 'completed' ? 'Completed episode' : `Chapter ${row.chapter} of ${chapterCount}` }}</small><b :id="`episode-${row.id}-title`">{{ row.title }}</b></span>
      <strong>{{ row.status === 'completed' ? 'Complete' : `${completedChapters} / ${chapterCount}` }}</strong>
    </header>
    <div class="episode-meter" role="meter" :aria-label="`${row.title} chapter progress`" aria-valuemin="0" :aria-valuemax="chapterCount" :aria-valuenow="row.status === 'completed' ? chapterCount : completedChapters"><i :style="{ width: `${(row.status === 'completed' ? chapterCount : completedChapters) / chapterCount * 100}%` }" /></div>

    <p v-if="row.recap" class="episode-recap"><b>Welcome back.</b> {{ row.recap }}</p>
    <section class="episode-scene" aria-label="Current chapter">
      <small>{{ row.chapterTitle }}</small>
      <b>{{ row.speaker }}</b>
      <p>{{ row.text }}</p>
    </section>

    <div v-if="row.status !== 'completed'" class="episode-route">
      <span><small>Next place</small><b>{{ row.next.label }}</b><em v-if="routeReason">{{ routeReason }}</em></span>
      <BaseButton small :disabled="Boolean(routeReason)" :reason="routeReason" @click="route">Go there</BaseButton>
    </div>

    <section v-if="row.options.length" class="episode-options" aria-label="Story choices">
      <div v-for="option in row.options" :key="option.id" class="episode-option">
        <div class="episode-option-copy"><b>{{ option.label }}</b><small>{{ option.description }}</small><em v-if="option.reason && option.reason !== option.description">{{ option.reason }}</em></div>
        <div class="episode-option-actions">
          <BaseButton v-if="option.next" small :disabled="Boolean(disconnected)" :reason="disconnected" @click="prerequisite(option)">{{ option.next.label }}</BaseButton>
          <BaseButton small :variant="option.enabled ? 'primary' : 'default'" :disabled="Boolean(optionReason(option))" :reason="optionReason(option)" @click="choose(option)">{{ pending === option.id ? 'Saving…' : 'Choose' }}</BaseButton>
        </div>
      </div>
    </section>

    <section v-if="row.memento.grantedAt !== null" class="episode-memento" aria-label="Permanent memento">
      <span aria-hidden="true">{{ row.memento.icon }}</span>
      <div><b>{{ row.memento.title }}</b><p>{{ row.memento.description }}</p><small>Yours permanently. Earned {{ when(row.memento.grantedAt) }}.</small></div>
    </section>

    <details v-if="row.history.length" class="episode-details">
      <summary>Story history ({{ row.history.length }} chapter{{ row.history.length === 1 ? '' : 's' }})</summary>
      <ol>
        <li v-for="item in row.history" :key="item.chapter"><b>Chapter {{ item.chapter }}: {{ item.title }}</b><p>{{ item.summary }}</p><small>{{ when(item.completedAt) }}. {{ originLine([item.origin]) }}.</small></li>
      </ol>
    </details>

    <details class="episode-details">
      <summary>How assistance works</summary>
      <p>{{ row.assistance.fallback }}</p>
      <p>Your choices and completed activities shape this story. You can always continue through its written scenes.</p>
      <ul v-if="row.assistance.records.length">
        <li v-for="(record, index) in row.assistance.records" :key="`${record.chapter}:${record.recordedAt}:${index}`"><b>Chapter {{ record.chapter }}</b><small>{{ record.kind.replaceAll('-', ' ') }}. {{ originLine([record.origin]) }}. {{ when(record.recordedAt) }}.</small></li>
      </ul>
      <p v-else>Your agents have not helped with this story.</p>
    </details>
  </article>
</template>

<style scoped>
.episode-card { container: episode / inline-size; display: grid; gap: 12px; min-width: 0; padding: 14px; border-radius: var(--r-md); background: var(--c-surface-solid); box-shadow: var(--e-1), var(--ring); }
.episode-head { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 10px; align-items: center; }
.episode-head span small,.episode-head span b,.episode-route small,.episode-route b,.episode-route em,.episode-option b,.episode-option small,.episode-option em,.episode-details li b,.episode-details li small { display: block; }
.episode-head small,.episode-route small,.episode-scene small { color: var(--c-muted); font-size: 11px; }
.episode-head strong { color: var(--c-green-dark); font-size: 12px; white-space: nowrap; }
.episode-icon { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 13px; background: var(--c-blue-soft); color: var(--c-blue); }
.episode-meter { width: 100%; height: 8px; overflow: hidden; border-radius: 99px; background: var(--c-fill); }
.episode-meter i { display: block; height: 100%; border-radius: inherit; background: var(--c-blue); }
.episode-recap { margin: 0; padding: 10px 11px; border-radius: var(--r-sm); background: var(--c-blue-soft); color: var(--c-ink-2); font-size: 13px; line-height: 1.5; }
.episode-scene { min-width: 0; padding-left: 12px; border-left: 3px solid var(--c-blue); }
.episode-scene b { display: block; margin-top: 3px; }
.episode-scene p,.episode-memento p,.episode-details p,.episode-details li p { margin: 5px 0 0; color: var(--c-ink-2); font-size: 13px; line-height: 1.5; }
.episode-route { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 10px 0; border-block: 1px solid var(--c-line); }
.episode-route em { margin-top: 4px; color: var(--c-muted); font: 600 11px/1.35 var(--font); }
.episode-option { display: grid; gap: 10px; min-width: 0; padding: 11px; border-radius: var(--r-sm); background: var(--c-fill); }
.episode-options { display: grid; gap: 8px; }
.episode-option-copy { min-width: 0; }
.episode-option small { margin-top: 3px; color: var(--c-ink-2); font-size: 12px; line-height: 1.4; }
.episode-option em { margin-top: 4px; color: var(--c-muted); font: 600 11px/1.35 var(--font); }
.episode-option-actions { display: flex; flex-wrap: wrap; gap: 8px; }.episode-option-actions :deep(.base-button) { flex: 1 1 8rem; }
.episode-memento { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 10px; padding: 12px; border-radius: var(--r-sm); background: #fff8e8; box-shadow: var(--ring); }
.episode-memento > span { font-size: 25px; }
.episode-memento small,.episode-details small { color: var(--c-muted); font-size: 11px; line-height: 1.4; }
.episode-details { border-top: 1px solid var(--c-line); padding-top: 10px; }
.episode-details summary { display: flex; align-items: center; min-height: 44px; color: var(--c-ink-2); font-size: 13px; font-weight: 700; cursor: pointer; }
.episode-details ol,.episode-details ul { display: grid; gap: 9px; margin: 8px 0 0; padding-left: 21px; }
.episode-details li { color: var(--c-ink-2); font-size: 12px; }
@container episode (max-width: 300px) {
  .episode-head { grid-template-columns: auto minmax(0, 1fr); }
  .episode-head strong { grid-column: 2; justify-self: start; }
  .episode-route { grid-template-columns: 1fr; }
  .episode-route :deep(.base-button) { width: 100%; }
}
</style>
