<script setup lang="ts">
// The public tape of the city's market, newest first. Names are the server's display labels (a public name, "Anonymous
// trader" or "Market maker"), shown as text. A fill of the caller's own is marked.
import type { MarketFill } from '../../../types/market.ts'
import EmptyState from '../../ui/EmptyState.vue'
import { agoWords, lookOf, tapeLine } from './marketModel.ts'

defineProps<{ tape: readonly MarketFill[]; now: number }>()
</script>

<template>
  <EmptyState v-if="!tape.length" compact icon="buy" title="Nothing has traded here yet" text="Fills in this city's market appear here as they happen." />
  <ul v-else class="mk-tape" aria-label="Recent trades">
    <li v-for="fill in tape" :key="fill.id" :class="{ 'is-mine': fill.mine }">
      <span class="mk-tape-icon" aria-hidden="true">{{ lookOf(fill.commodity).icon }}</span>
      <span class="mk-tape-line">{{ tapeLine(fill) }}<b v-if="fill.mine" class="mk-tape-you"> · yours</b></span>
      <small>{{ agoWords(fill.at, now) }}</small>
    </li>
  </ul>
</template>

<style scoped>
.mk-tape { list-style: none; margin: 0; padding: 0; border: 1px solid var(--c-line); border-radius: var(--r-md); background: #fff; }
.mk-tape li { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 10px; padding: 10px 14px; border-bottom: 1px solid var(--c-line); font-size: 13px; }
.mk-tape li:last-child { border-bottom: 0; }
.mk-tape li.is-mine { background: var(--c-green-soft); box-shadow: inset 3px 0 0 var(--c-green-dark); }
.mk-tape-line { min-width: 0; overflow-wrap: anywhere; line-height: 1.35; }
.mk-tape-you { color: var(--c-green-dark); }
.mk-tape small { color: var(--c-muted); font-size: 12px; white-space: nowrap; }
</style>
