<script setup lang="ts">
// The player's account in this city's market: free and reserved cash, holdings, moving naira in and out, open orders and
// the "Anonymous trader" choice. Intents only: the parent sends them and the server checks every limit.
import { computed, ref } from 'vue'
import type { MarketAccountView, MarketLimits } from '../../../types/market.ts'
import { money, plural } from '../../ui/format.ts'
import BaseButton from '../../ui/BaseButton.vue'
import EmptyState from '../../ui/EmptyState.vue'
import HeroCard from '../../ui/HeroCard.vue'
import SectionTitle from '../../ui/SectionTitle.vue'
import CivicAction from '../civic/CivicAction.vue'
import { ANON_LABEL, depositMax, depositWhy, holdingRows, leftWords, lookOf, orderLine, remaining, withdrawMax, withdrawWhy } from './marketModel.ts'

const props = defineProps<{ account: MarketAccountView; limits: MarketLimits; wallet: number; cityName: string; now: number; offline: string | null; busy: (tag: string) => boolean }>()
const emit = defineEmits<{ deposit: [amount: number]; withdraw: [amount: number]; cancel: [order: string]; anon: [anon: boolean] }>()

const inAmount = ref<number | string>('')
const outAmount = ref<number | string>('')
const asNumber = (value: number | string): number => (value === '' ? 0 : Number(value))
const inWhy = computed(() => depositWhy(asNumber(inAmount.value), props.wallet, props.account, props.limits, props.offline))
const outWhy = computed(() => withdrawWhy(asNumber(outAmount.value), props.account, props.offline))
const inMax = computed(() => depositMax(props.wallet, props.account, props.limits))
const outMax = computed(() => withdrawMax(props.account))
const rows = computed(() => holdingRows(props.account))
</script>

<template>
  <div class="mk-account">
    <HeroCard :label="`Market account · ${cityName}`" :figure="money(account.cash)">
      <p>free to use<template v-if="account.reservedCash > 0"> · {{ money(account.reservedCash) }} held by open buy orders</template></p>
    </HeroCard>
    <p v-if="account.frozen" class="mk-alert" role="alert">This account is frozen. You can cancel orders and withdraw cash, not trade.</p>

    <SectionTitle>Holdings in {{ cityName }}</SectionTitle>
    <EmptyState v-if="!rows.length" compact icon="buy" title="No goods yet" text="Buy something on the Prices tab. Goods stay in this city's market." />
    <ul v-else class="mk-list">
      <li v-for="row in rows" :key="row.commodity">
        <span aria-hidden="true">{{ lookOf(row.commodity).icon }}</span>
        <div class="mk-what"><strong>{{ lookOf(row.commodity).label }}</strong><small>{{ lookOf(row.commodity).unit }}<template v-if="row.reserved > 0"> · {{ row.reserved }} in open sell orders</template></small></div>
        <b>{{ row.free }}</b>
      </li>
    </ul>

    <SectionTitle :note="`${money(Math.max(0, limits.depositPerDay - account.today.deposited))} left to move in today`">Move naira</SectionTitle>
    <div class="mk-card mk-move">
      <p class="mk-note">You can only move naira in or out in the city you are standing in. Your wallet has {{ money(wallet) }}. This account can hold {{ money(limits.accountMax) }}.</p>
      <div class="mk-row">
        <label>Amount to move in (₦)<input v-model.number="inAmount" type="number" inputmode="numeric" min="1" :max="inMax" step="1"></label>
        <BaseButton small :disabled="inMax < 1" @click="inAmount = inMax">Most ({{ money(inMax) }})</BaseButton>
      </div>
      <CivicAction primary block :working="busy('deposit')" :reason="inWhy" @click="emit('deposit', asNumber(inAmount))">Move into the market</CivicAction>
      <div class="mk-row">
        <label>Amount to take out (₦)<input v-model.number="outAmount" type="number" inputmode="numeric" min="1" :max="outMax" step="1"></label>
        <BaseButton small :disabled="outMax < 1" @click="outAmount = outMax">All ({{ money(outMax) }})</BaseButton>
      </div>
      <CivicAction block :working="busy('withdraw')" :reason="outWhy" @click="emit('withdraw', asNumber(outAmount))">Take out to my wallet</CivicAction>
    </div>

    <SectionTitle :note="`${account.orders.length} of ${limits.maxOpenOrders}`">Open orders</SectionTitle>
    <EmptyState v-if="!account.orders.length" compact icon="buy" title="No open orders" text="An order you place that does not fill at once waits here until it fills, you cancel it, or it expires." />
    <ul v-else class="mk-list mk-card">
      <li v-for="order in account.orders" :key="order.id">
        <div class="mk-what"><strong>{{ orderLine(order) }}</strong><small>{{ plural(remaining(order), 'unit') }} to go · {{ leftWords(order.expiresAt, now) }}</small></div>
        <CivicAction :working="busy(`cancel:${order.id}`)" :reason="offline ?? ''" @click="emit('cancel', order.id)">Cancel</CivicAction>
      </li>
    </ul>

    <SectionTitle>On the tape</SectionTitle>
    <label class="mk-anon">
      <input type="checkbox" :checked="account.anon" :disabled="busy('anon') || Boolean(offline)" @change="emit('anon', ($event.target as HTMLInputElement).checked)">
      <span>Show me as {{ ANON_LABEL }} on the tape</span>
    </label>
    <p v-if="offline" class="mk-note">{{ offline }}</p>
  </div>
</template>

<style scoped>
.mk-account { display: grid; gap: var(--s-2); min-width: 0; }
.mk-card { min-width: 0; border-radius: var(--r-md); border: 1px solid var(--c-line); background: #fff; padding: 14px; }
.mk-alert { margin: 0 !important; padding: 10px 14px; border-radius: var(--r-md); background: var(--c-red-soft); color: var(--c-red-dark); font-size: 13px !important; font-weight: 600; }
.mk-note { margin: 0 !important; font-size: 12.5px !important; line-height: 1.45 !important; color: var(--c-muted); }
.mk-list { list-style: none; margin: 0; padding: 0 14px; border: 1px solid var(--c-line); border-radius: var(--r-md); background: #fff; }
.mk-list.mk-card { padding: 0 14px; }
.mk-list li { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--c-line); font-size: 13px; min-height: var(--tap); }
.mk-list li:last-child { border-bottom: 0; }
.mk-what { display: grid; gap: 2px; min-width: 0; flex: 1 1 auto; overflow-wrap: anywhere; }
.mk-what small { color: var(--c-muted); font-size: 12px; }
.mk-list b { font-variant-numeric: tabular-nums; font-size: 15px; }
.mk-list :deep(.civic-action) { flex: none; margin: 0; }
.mk-move { display: grid; gap: var(--s-2); }
.mk-row { display: flex; align-items: end; gap: var(--s-2); }
.mk-row label { flex: 1 1 auto; display: grid; gap: 6px; margin: 0 !important; font-size: 13px; font-weight: 600; color: var(--c-muted); }
.mk-row input { box-sizing: border-box; width: 100%; min-height: var(--tap); font-size: 16px; font-variant-numeric: tabular-nums; }
.mk-move :deep(.civic-action) { display: grid; margin: 0; }
.mk-anon { display: flex; align-items: center; gap: 10px; min-height: var(--tap); padding: 0 14px; border: 1px solid var(--c-line); border-radius: var(--r-md); background: #fff; font-size: 14px; font-weight: 600; }
.mk-anon input { width: 20px; height: 20px; }
</style>
