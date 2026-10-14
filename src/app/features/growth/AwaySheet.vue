<script setup lang="ts">
// "While you were away", the calm sheet (awaySheet.ts): what happened in the city (public notices and the Hall of Records,
// fetched here and only here), who wrote or gave, rent or bills, and one thing to do next. It states facts and offers a
// step; it counts nothing down and says nothing about what was lost. Opened from the away card's last line.
import { computed, onMounted, ref } from 'vue'
import { useApp } from '../../state/app.ts'
import { social } from '../social/useSocial.ts'
import BaseButton from '../../ui/BaseButton.vue'
import type { RecordsResponse } from '../../../types/records.ts'
import { awaySheetFor } from './awaySheetFor.ts'
import { useGrowth } from './useGrowth.ts'

defineProps<{ params?: unknown }>()
const { game, shell } = useApp()
const growth = useGrowth()
const records = ref<RecordsResponse['entries']>([])
onMounted(async () => {
  try { records.value = (await game.fetchJson<RecordsResponse>('/api/world/records?limit=10')).entries } catch { /* the sheet is shown without the city record */ }
})
const sheet = computed(() => awaySheetFor(game.view.value, growth.state.hello, social.me, records.value))
function go(app: string | undefined, params: unknown): void { shell.open(app || 'messages', params) }
</script>

<template>
  <div class="gr-awaysheet">
    <template v-if="sheet">
      <p class="gr-awaysheet-sub">{{ sheet.sub }}</p>
      <section v-for="section in sheet.sections" :key="section.id" :aria-label="section.title">
        <h3>{{ section.title }}</h3>
        <ul>
          <li v-for="line in section.lines" :key="line.id"><button v-if="line.app" type="button" @click="go(line.app, line.params)">{{ line.text }}</button><span v-else>{{ line.text }}</span></li>
        </ul>
        <small v-if="section.more">and {{ section.more }} more</small>
      </section>
      <BaseButton v-if="sheet.next" variant="primary" class="is-wide" @click="go(sheet.next.app, sheet.next.params)">{{ sheet.next.text }}</BaseButton>
    </template>
    <p v-else class="gr-awaysheet-sub">All quiet. Nothing new is waiting.</p>
  </div>
</template>

<style scoped>
.gr-awaysheet { display: grid; gap: var(--s-2, 8px); }
.gr-awaysheet-sub { margin: 0; color: var(--c-muted); font-size: 13px; }
.gr-awaysheet h3 { margin: 6px 0 2px; font-size: 13px; color: var(--c-ink-2); }
.gr-awaysheet ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
.gr-awaysheet li button, .gr-awaysheet li span { display: block; width: 100%; text-align: left; background: var(--c-fill); border: 0; border-radius: 10px; padding: 8px 10px; font: inherit; font-size: 13px; min-height: 36px; color: var(--c-ink); }
.gr-awaysheet li button { cursor: pointer; }
.gr-awaysheet button:focus-visible { outline: var(--focus); outline-offset: 2px; }
.gr-awaysheet small { color: var(--c-muted); font-size: 12px; }
</style>
