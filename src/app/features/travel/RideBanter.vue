<script setup lang="ts">
// The conductor, the driver and the radio during a trip (docs/CITY-TEXTURE.md): one written line at a time under the progress bar, chosen by city, way
// of travelling, route and time of day (ridePacks.ts), the next one as the bar fills. The lines load on the first trip, not with the Map. A trip with no
// lines (a walk, a train) shows nothing. Read aloud politely: the line is a status, not an alert.
import { computed, onMounted, ref, watch } from 'vue'

const props = defineProps<{ city: string; mode: string; from: string; to: string; seconds: number; fraction: number }>()
type Packs = typeof import('./ridePacks.ts')
const packs = ref<Packs | null>(null)
onMounted(() => { void import('./ridePacks.ts').then((loaded) => { packs.value = loaded }) })
const lines = ref<ReturnType<Packs['rideLines']>>([])
// Chosen once per trip (its city, way, ends and length), so the lines do not change as the bar fills.
watch(() => [packs.value, props.city, props.mode, props.from, props.to, Math.round(props.seconds)] as const, ([loaded]) => {
  lines.value = loaded ? loaded.rideLines({ city: props.city, mode: props.mode, now: Date.now(), from: props.from, to: props.to, seconds: props.seconds }) : []
}, { immediate: true })
const line = computed(() => packs.value ? lines.value[packs.value.lineIndex(props.fraction, lines.value.length)] : undefined)
const WHO = { conductor: 'Conductor', driver: 'Driver', radio: 'Radio', rider: '' } as const
</script>

<template>
  <p v-if="line" class="map-trip-banter" role="status" :data-who="line.who"><b v-if="WHO[line.who]">{{ WHO[line.who] }}</b>{{ line.text }}</p>
</template>
