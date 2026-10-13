<script setup lang="ts">
// Allworld Market: the Phone app for the city's play-money commodity exchange. Every rule and number is the server's
// (docs/MARKET.md): this screen shows what /api/market/ answers and sends the player's choices back. A paid request
// keeps its id until it is applied, so pressing again after a lost answer repeats the SAME request.
// A simulation with game naira; see SIMULATION_LINE in marketModel.ts.
import { computed, ref } from 'vue'
import { useApp } from '../../state/app.ts'
import type { CommodityId, MarketHistoryResponse, MarketSide, MarketViewResponse, MarketWriteResponse } from '../../../types/market.ts'
import { money } from '../../ui/format.ts'
import EmptyState from '../../ui/EmptyState.vue'
import HowItWorks from '../../ui/HowItWorks.vue'
import SectionTitle from '../../ui/SectionTitle.vue'
import CivicStatus from '../civic/CivicStatus.vue'
import { requestSlot } from '../civic/civicCore.ts'
import type { SendResult } from '../civic/civicCore.ts'
import { actorDraft } from '../civic/civicDrafts.ts'
import { useCivic, useLoaded, useOffline } from '../civic/useCivic.ts'
import MarketAccount from './MarketAccount.vue'
import MarketTape from './MarketTape.vue'
import MarketTicket from './MarketTicket.vue'
import { SIMULATION_LINE, fillsLine, historyKey, historyPath, lookOf, marketRules, quoteLook, percent, quoteOf, toneOf, viewKey, viewPath } from './marketModel.ts'

defineProps<{ params?: unknown }>()
const { game } = useApp()
const server = useCivic()
const offline = useOffline()
const view = game.view
const state = game.state
const cityId = computed(() => view.value.cityId)

const market = useLoaded<MarketViewResponse>({ key: () => viewKey(cityId.value), path: () => viewPath(cityId.value), maxAge: 10000 })
const data = computed(() => market.item.value.data)
const quotes = computed(() => data.value?.quotes ?? [])
const account = computed(() => data.value?.account ?? null)

// What is being chosen, kept while the app is open.
const ui = actorDraft(() => ({ tab: 'prices' as 'prices' | 'account' | 'tape', commodity: null as CommodityId | null }))
const slots = actorDraft(() => ({ order: requestSlot(), deposit: requestSlot(), withdraw: requestSlot(), cancel: requestSlot() }))
const commodity = computed<CommodityId | null>(() => (ui.commodity && quoteOf(quotes.value, ui.commodity) ? ui.commodity : quotes.value[0]?.commodity ?? null))
const quote = computed(() => quoteOf(quotes.value, commodity.value))

const history = useLoaded<MarketHistoryResponse>({ key: () => historyKey(cityId.value, commodity.value ?? ''), path: () => historyPath(cityId.value, commodity.value ?? ''), maxAge: 300000, when: () => commodity.value !== null })

/** Take what a write answered into the cache, so the whole app shows it at once. (A returned `state` re-syncs the life inside the civic client.) */
function taken(result: SendResult): void {
  const answer = result as unknown as Partial<MarketWriteResponse>
  if (Array.isArray(answer.quotes) && answer.limits) server.put<MarketViewResponse>(viewKey(cityId.value), { city: answer.city ?? cityId.value, quotes: answer.quotes, tape: answer.tape ?? [], account: answer.account ?? null, limits: answer.limits })
}
/** One paid request: the same id until it is applied. */
async function paid(slot: keyof typeof slots, tag: string, path: string, body: Record<string, unknown>, success: string): Promise<SendResult> {
  const result = await server.send(tag, path, { ...body, requestId: server.requestId(slots[slot], [cityId.value, path, body]) }, { success })
  server.requestDone(slots[slot], result)
  taken(result)
  return result
}

async function order(ticket: { side: MarketSide; units: number; price: number; now: boolean }): Promise<void> {
  const at = commodity.value
  if (!at) return
  const body: Record<string, unknown> = { commodity: at, side: ticket.side, price: ticket.price, units: ticket.units }
  if (ticket.now) body.now = true
  const result = await paid('order', ticket.now ? 'order:now' : 'order:rest', '/api/market/order', body, '')
  if (result.ok) game.toast(fillsLine(ticket.side, (result as unknown as MarketWriteResponse).fills, lookOf(at).label, !ticket.now), 'good')
}
const deposit = (amount: number): Promise<SendResult> => paid('deposit', 'deposit', '/api/market/deposit', { amount }, `${money(amount)} moved into the market.`)
const withdraw = (amount: number): Promise<SendResult> => paid('withdraw', 'withdraw', '/api/market/withdraw', { amount }, `${money(amount)} taken out to your wallet.`)
const cancel = (id: string): Promise<SendResult> => paid('cancel', `cancel:${id}`, '/api/market/cancel', { order: id }, 'Order cancelled.')
async function anon(on: boolean): Promise<void> { taken(await server.send('anon', '/api/market/anon', { anon: on }, { success: on ? 'You will show as Anonymous trader.' : 'Your name will show on the tape.' })) }

const rules = computed(() => marketRules(data.value?.limits.feeBps))
const cityName = computed(() => view.value.city.name)
const tabs = [['prices', 'Prices'], ['account', 'My account'], ['tape', 'Tape']] as const
</script>

<template>
  <div class="mk">
    <p class="mk-sim" role="note">{{ SIMULATION_LINE }}</p>
    <div class="ui-seg" role="group" aria-label="Market screens">
      <button v-for="[id, label] in tabs" :key="id" type="button" :aria-pressed="ui.tab === id" @click="ui.tab = id">{{ label }}</button>
    </div>
    <CivicStatus :item="market.item.value" @retry="market.reload" />
    <template v-if="data">
      <!-- ---- prices ---- -->
      <template v-if="ui.tab === 'prices'">
        <SectionTitle :note="cityName">Prices today</SectionTitle>
        <ul class="mk-quotes" aria-label="Commodities">
          <li v-for="item in quotes" :key="item.commodity">
            <button type="button" :aria-pressed="item.commodity === commodity" @click="ui.commodity = item.commodity">
              <span class="mk-q-icon" aria-hidden="true">{{ quoteLook(item).icon }}</span>
              <span class="mk-q-what"><strong>{{ quoteLook(item).label }}</strong><small>{{ quoteLook(item).unit }}</small>
                <small v-if="item.event" class="mk-q-event">{{ item.event.headline }}</small></span>
              <span class="mk-q-price"><strong>{{ money(item.ref) }}</strong><small :class="`is-${toneOf(item.change)}`">{{ percent(item.change) }}</small></span>
            </button>
          </li>
        </ul>
        <MarketTicket v-if="quote" :key="quote.commodity" :quote="quote" :points="history.item.value.data?.commodity === quote.commodity ? history.item.value.data.points : []" :account="account" :limits="data.limits" :offline="offline('trade')" :busy="server.busy" @order="order" />
      </template>

      <!-- ---- my account ---- -->
      <template v-else-if="ui.tab === 'account'">
        <MarketAccount v-if="account" :account="account" :limits="data.limits" :wallet="state.cash" :city-name="cityName" :now="view.now" :offline="offline('trade')" :busy="server.busy" @deposit="deposit" @withdraw="withdraw" @cancel="cancel" @anon="anon" />
        <EmptyState v-else icon="buy" title="Sign in to trade" text="You can look at prices and the tape as a guest. To hold naira and goods in the market you need a signed-in character." />
      </template>

      <!-- ---- tape ---- -->
      <template v-else>
        <SectionTitle :note="cityName">Recent trades</SectionTitle>
        <MarketTape :tape="data.tape" :now="view.now" />
      </template>
    </template>
    <HowItWorks id="market-rules" page label="How the market works" :rules="rules" />
  </div>
</template>

<style scoped>
.mk { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--s-2); }
.mk-sim { margin: 0 !important; padding: 8px 12px; border-radius: var(--r-md); background: var(--c-amber-soft); color: var(--c-ink); font-size: 12.5px !important; line-height: 1.4 !important; font-weight: 600; }
.mk-quotes { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.mk-quotes button { width: 100%; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 12px; min-height: var(--tap); padding: 10px 14px; border: 1px solid var(--c-line); border-radius: var(--r-md); background: #fff; text-align: left; font: inherit; color: inherit; cursor: pointer; }
.mk-quotes button[aria-pressed=true] { border-color: var(--c-ink); box-shadow: inset 0 0 0 1px var(--c-ink); }
.mk-quotes button:focus-visible { outline: var(--focus); outline-offset: 2px; }
.mk-q-icon { font-size: 26px; line-height: 1; }
.mk-q-what, .mk-q-price { display: grid; gap: 1px; min-width: 0; }
.mk-q-price { text-align: right; font-variant-numeric: tabular-nums; }
.mk-q-what small, .mk-q-price small { font-size: 12px; color: var(--c-muted); }
.mk-q-event { color: var(--c-amber-dark) !important; font-weight: 650; }
.mk-q-price small.is-up { color: var(--c-green-dark); font-weight: 650; }
.mk-q-price small.is-down { color: var(--c-red); font-weight: 650; }
</style>
