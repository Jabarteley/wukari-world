<script setup lang="ts">
// One commodity: its numbers, the 7-day line and the order ticket. The ticket shows the value, the fee and the total
// BEFORE anything is sent, and says in a sentence why a button is off. It sends intents only; the server decides.
import { computed, ref, watch } from 'vue'
import type { MarketAccountView, MarketLimits, MarketQuote, MarketSide } from '../../../types/market.ts'
import { money } from '../../ui/format.ts'
import SectionTitle from '../../ui/SectionTitle.vue'
import CivicAction from '../civic/CivicAction.vue'
import MarketChart from './MarketChart.vue'
import { bpsWords, clampPrice, nowPrice, percent, quoteLook, ticketOf, ticketWhy, toneOf } from './marketModel.ts'

const props = defineProps<{
  quote: MarketQuote
  points: readonly (readonly [number, number])[]
  account: MarketAccountView | null
  limits: MarketLimits
  offline: string | null
  busy: (tag: string) => boolean
}>()
const emit = defineEmits<{ order: [order: { side: MarketSide; units: number; price: number; now: boolean }] }>()

const look = computed(() => quoteLook(props.quote))
const side = ref<MarketSide>('buy')
const units = ref(1)
// null = "the reference price". Typing a price replaces it; it is pulled into the band when it is used.
const typed = ref<string | null>(null)
watch(() => props.quote.commodity, () => { typed.value = null; units.value = 1 })
watch(side, () => { typed.value = null })

const price = computed(() => clampPrice(typed.value === null || typed.value.trim() === '' ? props.quote.ref : Number(typed.value), props.quote.band))
const held = computed(() => props.account?.holdings[props.quote.commodity] ?? 0)
const step = (by: number): void => { units.value = Math.min(props.limits.maxUnitsPerOrder, Math.max(1, Math.round(units.value || 1) + by)) }
const unitsNow = computed(() => Math.round(Number(units.value) || 0))

const ticket = computed(() => ticketOf(side.value, price.value, unitsNow.value, props.limits.feeBps))
const immediate = computed(() => nowPrice(side.value, props.quote.band))
const input = computed(() => ({ side: side.value, commodity: props.quote.commodity, units: unitsNow.value, band: props.quote.band }))
const restWhy = computed(() => ticketWhy({ ...input.value, price: price.value }, props.account, props.limits, props.offline, true))
const nowWhy = computed(() => ticketWhy({ ...input.value, price: immediate.value }, props.account, props.limits, props.offline, false))
const verb = computed(() => (side.value === 'buy' ? 'Buy' : 'Sell'))
</script>

<template>
  <section class="mk-card" :aria-label="`${look.label} market`">
    <header class="mk-head">
      <span class="mk-icon" aria-hidden="true">{{ look.icon }}</span>
      <div><strong>{{ look.label }}</strong><small>{{ look.unit }}</small></div>
      <div class="mk-ref"><strong>{{ money(quote.ref) }}</strong><small :class="`is-${toneOf(quote.change)}`">{{ percent(quote.change) }} in 24 h</small></div>
    </header>
    <p v-if="quote.event" class="mk-event">{{ quote.event.headline }}</p>
    <MarketChart :points="points" :label="look.label" />
    <dl class="mk-facts">
      <div><dt>Market maker buys</dt><dd>{{ money(quote.bid) }}</dd></div>
      <div><dt>Market maker sells</dt><dd>{{ money(quote.ask) }}</dd></div>
      <div v-if="quote.bestBid !== undefined"><dt>Best player bid</dt><dd>{{ money(quote.bestBid) }}</dd></div>
      <div v-if="quote.bestAsk !== undefined"><dt>Best player ask</dt><dd>{{ money(quote.bestAsk) }}</dd></div>
      <div v-if="quote.last !== undefined"><dt>Last trade</dt><dd>{{ money(quote.last) }}</dd></div>
      <div><dt>Price band</dt><dd>{{ money(quote.band.min) }} to {{ money(quote.band.max) }}</dd></div>
    </dl>

    <SectionTitle :note="account ? `${held} held here` : ''">Order ticket</SectionTitle>
    <div class="ui-seg" role="group" aria-label="Buy or sell">
      <button type="button" :aria-pressed="side === 'buy'" @click="side = 'buy'">Buy</button>
      <button type="button" :aria-pressed="side === 'sell'" @click="side = 'sell'">Sell</button>
    </div>
    <div class="mk-fields">
      <div class="mk-field"><span id="mk-units-label">Units</span>
        <div class="mk-step" role="group" aria-labelledby="mk-units-label">
          <button type="button" :disabled="unitsNow <= 1" aria-label="Fewer units" @click="step(-1)">−</button>
          <input v-model.number="units" type="number" inputmode="numeric" min="1" :max="limits.maxUnitsPerOrder" step="1" aria-label="Units">
          <button type="button" :disabled="unitsNow >= limits.maxUnitsPerOrder" aria-label="More units" @click="step(1)">+</button>
        </div>
      </div>
      <label class="mk-field">Price per unit (₦)
        <input :value="typed ?? quote.ref" type="number" inputmode="numeric" :min="quote.band.min" :max="quote.band.max" step="1" @input="typed = ($event.target as HTMLInputElement).value" @change="typed = String(price)">
      </label>
    </div>
    <dl class="mk-sum" aria-live="polite">
      <div><dt>Value</dt><dd>{{ money(ticket.value) }}</dd></div>
      <div><dt>Fee ({{ bpsWords(limits.feeBps) }}, at least ₦1)</dt><dd>{{ side === 'buy' ? '+' : '−' }}{{ money(ticket.fee) }}</dd></div>
      <div class="mk-total"><dt>{{ side === 'buy' ? 'You pay' : 'You receive' }}</dt><dd>{{ money(ticket.total) }}</dd></div>
    </dl>
    <p class="mk-note">The figures above are for Place order, which waits in the market at your price. {{ verb }} now fills what it can at once at the best prices available, never {{ side === 'buy' ? 'above' : 'below' }} {{ money(immediate) }} each, and drops the rest.</p>
    <div class="mk-actions">
      <CivicAction primary :working="busy('order:now')" :reason="nowWhy" @click="emit('order', { side, units: unitsNow, price: immediate, now: true })">{{ verb }} now</CivicAction>
      <CivicAction :working="busy('order:rest')" :reason="restWhy" @click="emit('order', { side, units: unitsNow, price, now: false })">Place order</CivicAction>
    </div>
  </section>
</template>

<style scoped>
.mk-card { display: grid; gap: var(--s-2); min-width: 0; padding: 14px; border: 1px solid var(--c-line); border-radius: var(--r-md); background: #fff; }
.mk-head { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 10px; }
.mk-head > div { display: grid; gap: 1px; min-width: 0; }
.mk-head small, .mk-ref small { color: var(--c-muted); font-size: 12px; }
.mk-icon { font-size: 28px; line-height: 1; }
.mk-ref { text-align: right; font-variant-numeric: tabular-nums; }
.mk-ref strong { font-size: var(--t-lead); }
small.is-up { color: var(--c-green-dark); font-weight: 650; }
small.is-down { color: var(--c-red); font-weight: 650; }
.mk-event { margin: 0; padding: 6px 10px; border-radius: var(--r-sm); background: var(--c-amber-soft); font-size: 12.5px; font-weight: 600; }
.mk-facts, .mk-sum { margin: 0; display: grid; gap: 4px; font-size: 13px; }
.mk-facts > div, .mk-sum > div { display: flex; justify-content: space-between; gap: 8px; }
.mk-facts dt, .mk-sum dt { color: var(--c-muted); }
.mk-facts dd, .mk-sum dd { margin: 0; font-weight: 650; font-variant-numeric: tabular-nums; text-align: right; }
.mk-total { padding-top: 6px; border-top: 1px solid var(--c-line); font-size: 15px; }
.mk-total dt { color: var(--c-ink); font-weight: 650; }
.mk-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--s-3); }
.mk-field { display: grid; gap: 6px; margin: 0 !important; font-size: 13px; font-weight: 600; color: var(--c-muted); }
.mk-field input { box-sizing: border-box; width: 100%; min-height: var(--tap); font-size: 16px; font-variant-numeric: tabular-nums; }
.mk-step { display: flex; align-items: center; gap: 4px; }
.mk-step input { text-align: center; min-width: 0; }
.mk-step button { flex: none; width: var(--tap); height: var(--tap); border: 0; border-radius: 50%; background: var(--c-fill); font: 700 18px var(--font); cursor: pointer; }
.mk-step button:disabled { opacity: .4; cursor: not-allowed; }
.mk-step button:focus-visible { outline: var(--focus); outline-offset: 2px; }
.mk-note { margin: 0 !important; font-size: 12px !important; line-height: 1.4 !important; color: var(--c-muted); }
.mk-actions { display: flex; flex-wrap: wrap; gap: var(--s-2); }
.mk-actions :deep(.civic-action) { flex: 1 1 140px; display: grid; margin: 0; }
</style>
