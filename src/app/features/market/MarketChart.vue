<script setup lang="ts">
// The 7-day reference price as one SVG line. No chart library: the path is built by marketModel.sparkline.
import { computed } from 'vue'
import { sparkline } from './marketModel.ts'

const props = defineProps<{ points: readonly (readonly [number, number])[]; label: string }>()
const W = 300, H = 90
const spark = computed(() => sparkline(props.points, W, H))
</script>

<template>
  <figure class="mk-chart">
    <svg v-if="spark.path" :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="`${label} price over 7 days, from ${spark.minLabel} to ${spark.maxLabel}`" preserveAspectRatio="none">
      <path :d="spark.path" :class="`is-${spark.tone}`" fill="none" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
    </svg>
    <p v-else class="mk-chart-empty">No price history yet.</p>
    <figcaption v-if="spark.path"><span>Low {{ spark.minLabel }}</span><span>7 days</span><span>High {{ spark.maxLabel }}</span></figcaption>
  </figure>
</template>

<style scoped>
.mk-chart { margin: 0; display: grid; gap: 4px; }
.mk-chart svg { width: 100%; height: 90px; display: block; background: var(--c-fill); border-radius: var(--r-sm); }
.mk-chart path { stroke: var(--c-muted); }
.mk-chart path.is-up { stroke: var(--c-green-dark); }
.mk-chart path.is-down { stroke: var(--c-red); }
.mk-chart figcaption { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; color: var(--c-muted); font-variant-numeric: tabular-nums; }
.mk-chart-empty { margin: 0; padding: 20px 0; text-align: center; font-size: 13px; color: var(--c-muted); }
</style>
