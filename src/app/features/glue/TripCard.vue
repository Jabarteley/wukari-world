<script setup lang="ts">
// The trip card (docs/SOCIAL-GLUE.md "Group trips"): who went, from where to where, by danfo or by air, with the share sheet (or WhatsApp,
// or a copy) for the words and the game's link. Names are shown as text.
import { useApp } from '../../state/app.ts'
import { shareLink, whatsappUrl } from '../feed/feedShare.ts'
import type { TripView } from '../../../types/glue.ts'

const props = defineProps<{ trip: TripView }>()
const { game } = useApp()
/** The game's front door: the share sheet and WhatsApp make it absolute when pressed (never while drawing). */
const link = (): string => '/'
const whatsapp = (): void => { window.open(whatsappUrl(link(), words()), '_blank', 'noopener') }
const words = (): string => `${props.trip.card ?? ''} on Allworld: ${props.trip.members.filter((m) => m.answer === 'yes').map((m) => m.name).join(', ')}.`
async function share(): Promise<void> { if (await shareLink(link(), words()) === 'copied') game.toast('Copied. Paste it anywhere.') }
</script>

<template>
  <figure class="trip-card" data-glue="trip-card" :class="`is-${trip.mode}`">
    <span class="trip-card-mode" aria-hidden="true">{{ trip.mode === 'flight' ? '✈️' : '🚌' }}</span>
    <figcaption>
      <b>{{ trip.fromName }} → {{ trip.toName }}</b>
      <small>{{ trip.card }}</small>
      <small>{{ trip.members.filter((m) => m.answer === 'yes').map((m) => m.name).join(' · ') }}</small>
      <small>{{ trip.crewName }}</small>
    </figcaption>
    <div class="feed-row"><button type="button" class="social-btn is-primary" @click="share">Share the card</button><button type="button" class="feed-pill" @click="whatsapp">WhatsApp</button></div>
  </figure>
</template>

<style scoped>
.trip-card { display: grid; gap: 8px; margin: 8px 0; padding: 14px; border-radius: 14px; background: linear-gradient(135deg, #f7c948 0%, #2a9d8f 100%); color: #10201d; }
.trip-card.is-flight { background: linear-gradient(135deg, #8ecae6 0%, #3a5a9b 100%); color: #fff; }
.trip-card-mode { font-size: 28px; }
.trip-card figcaption { display: grid; gap: 2px; }
.trip-card b { font-size: 18px; }
</style>
