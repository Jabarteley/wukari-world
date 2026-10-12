<script setup lang="ts">
// "Stay in touch": a slim, dismissible offer shown once after an account is made (touchOfferModel.ts, shown by
// hud/GuestBarSlot.vue, which decides when). It switches nothing on; its button opens the app that asks.
import GameIcon from '../../ui/GameIcon.vue'
import { TOUCH_OFFER_WORDS } from './touchOfferModel.ts'

const emit = defineEmits<{ open: []; dismiss: [] }>()
</script>

<template>
  <section class="toff" role="region" aria-label="Stay in touch" data-touch-offer>
    <p><span class="toff-lead">{{ TOUCH_OFFER_WORDS.title }}</span><span class="toff-dot" aria-hidden="true"> · </span><span class="toff-ask">{{ TOUCH_OFFER_WORDS.text }}</span></p>
    <button type="button" class="toff-go" data-touch-offer-open aria-label="Open Stay in touch" @click="emit('open')">{{ TOUCH_OFFER_WORDS.action }}</button>
    <button type="button" class="toff-x" data-touch-offer-dismiss aria-label="Not now" title="Not now" @click="emit('dismiss')"><GameIcon name="close" :size="16" /></button>
  </section>
</template>

<style scoped>
.toff { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 6px 6px 14px; border-radius: 22px; background: var(--c-surface); border: 1px solid #fff; box-shadow: var(--e-2); pointer-events: auto; font-size: var(--t-body); color: var(--c-ink-2); animation: toff-in .28s ease-out both; }
.toff p { flex: 1; min-width: 0; margin: 0; line-height: 1.3; }
.toff-lead { font-weight: 700; color: var(--c-ink); }
.toff button { flex: none; border: 0; font: inherit; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.toff button:focus-visible { outline: var(--focus); outline-offset: 2px; }
.toff-go { min-height: 36px; padding: 0 14px; border-radius: var(--r-pill); background: var(--c-green-dark); color: #fff; font-weight: 700; font-size: var(--t-small); }
.toff-go:hover { background: #17573a; }
.toff-x { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; background: none; color: var(--c-muted); }
.toff-x:hover { background: var(--c-fill); color: var(--c-ink); }
@keyframes toff-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@media (max-width: 520px) {
  .toff { padding-left: 12px; gap: 4px; }
  .toff-lead, .toff-dot { display: none; }
  .toff-ask { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; overflow: hidden; font-size: 12px; }
  .toff-go { padding: 0 11px; }
}
@media (prefers-reduced-motion: reduce) { .toff { animation: none; } }
</style>
