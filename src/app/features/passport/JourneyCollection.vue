<script setup lang="ts">
import { computed } from 'vue'
import type { JourneyCollectionView } from '../../../types/journeys.ts'
import { cityName, cityRules } from '../../../game/cities/registry.ts'
import { venueLabel } from '../../../game/content/venues.ts'
import GameIcon from '../../ui/GameIcon.vue'

const props = defineProps<{ collection: JourneyCollectionView }>()
const earned = computed(() => props.collection.members.filter(member => member.earnedAt !== null).length)
const date = new Intl.DateTimeFormat('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric' })
const countryName = (id: string): string => cityRules(props.collection.geography.cityId)?.country.name ?? id.toUpperCase()
const earnedDate = (at: number): string => date.format(new Date(at))
const placeLine = computed(() => {
  const place = props.collection.geography
  return `${countryName(place.countryId)} · ${cityName(place.cityId) ?? place.cityId} · ${venueLabel(place.venueId, place.cityId)}`
})
</script>

<template>
  <article class="journey-collection" :class="{ 'is-complete': collection.complete }" :aria-labelledby="`journey-${collection.id}`">
    <header>
      <span aria-hidden="true"><GameIcon :name="collection.complete ? 'good' : 'book'" :size="21" /></span>
      <div><small>{{ placeLine }}</small><h3 :id="`journey-${collection.id}`">{{ collection.name }}</h3></div>
      <strong>{{ earned }}/{{ collection.members.length }}</strong>
    </header>

    <p v-if="collection.complete" class="journey-title"><GameIcon inline name="star" /> Title earned: <b>{{ collection.title }}</b><template v-if="collection.completionAt !== null"> · {{ earnedDate(collection.completionAt) }}</template></p>
    <p v-else class="journey-progress">Collect every keepsake in this place to earn the {{ collection.title }} title.</p>

    <ul :aria-label="`${collection.name} keepsakes`">
      <li v-for="member in collection.members" :key="member.id" :class="{ 'is-earned': member.earnedAt !== null }">
        <GameIcon :name="member.earnedAt !== null ? 'good' : 'star'" :size="17" />
        <span><b>{{ member.title }}</b><small>{{ member.criterion }}</small></span>
        <strong>{{ member.earnedAt !== null ? earnedDate(member.earnedAt) : 'Not yet' }}</strong>
      </li>
    </ul>
  </article>
</template>

<style scoped>
.journey-collection { container: journey / inline-size; display: grid; gap: 10px; padding: 13px; border-radius: var(--r-md); background: var(--c-surface-solid); box-shadow: var(--e-1), var(--ring); }
.journey-collection.is-complete { background: var(--c-amber-soft); }
header { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 9px; align-items: center; }
header > span { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 13px; background: var(--c-blue-soft); color: var(--c-blue); }
header small,header h3 { display: block; margin: 0; }
header small { color: var(--c-muted); font-size: 10px; line-height: 1.35; }
header h3 { margin-top: 2px; font-size: 15px; line-height: 1.25; }
header > strong { color: var(--c-green-dark); font-size: 12px; font-variant-numeric: tabular-nums; }
.journey-title,.journey-progress { margin: 0; color: var(--c-ink-2); font-size: 12px; line-height: 1.45; }
ul { list-style: none; display: grid; gap: 6px; margin: 0; padding: 0; }
li { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 8px; align-items: center; padding: 9px 10px; border-radius: var(--r-sm); background: var(--c-fill); color: var(--c-muted); }
li.is-earned { background: var(--c-green-soft); color: var(--c-green-dark); }
li b,li small { display: block; }
li b { color: var(--c-ink); font-size: 12px; line-height: 1.3; }
li small { margin-top: 2px; color: var(--c-muted); font-size: 10px; line-height: 1.4; }
li > strong { font-size: 10px; white-space: nowrap; }
@container journey (max-width: 290px) { li { grid-template-columns: auto minmax(0, 1fr); } li > strong { grid-column: 2; justify-self: start; } }
</style>
