<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import { useApp } from '../../state/app.ts'
import BaseButton from '../../ui/BaseButton.vue'
import { naira, offerFromInput, verdictText } from './signatureModel.ts'
import type { SignatureGameView, SignatureResult } from './signatureModel.ts'

type PendingWrite = { body: { clientId: string; offer?: number; reset?: true } }

const { game } = useApp()
const view = ref<SignatureGameView | null>(null)
const loading = ref(false)
const busy = ref(false)
const offer = ref('')
const notice = ref('')
const retry = shallowRef<PendingWrite | null>(null)
const parsedOffer = computed(() => offerFromInput(offer.value))

function errorText(error: unknown): string {
  const status = error && typeof error === 'object' && 'status' in error ? error.status : undefined
  if (status === 401) return 'Sign in again to continue bargaining.'
  if (status === 429) return 'Too many offers. Wait a moment, then retry the same action.'
  return 'The result could not be confirmed. Retry the same action.'
}

async function load(): Promise<void> {
  if (loading.value) return
  loading.value = true
  try { view.value = await game.fetchJson<SignatureGameView>('/api/story/signature') }
  catch (error) { notice.value = errorText(error) }
  finally { loading.value = false }
}

async function sendPending(): Promise<void> {
  const pending = retry.value
  if (!pending || busy.value) return
  busy.value = true
  notice.value = ''
  try {
    const result = await game.fetchJson<SignatureResult>('/api/story/signature', { method: 'POST', body: pending.body })
    retry.value = null
    if (!result.ok) { notice.value = result.reason ?? 'That offer was refused by the game.'; await load(); return }
    view.value = result
    notice.value = result.code === 'bargain_restarted' ? 'A new practice round is ready.' : verdictText(result)
    if (result.verdict?.kind === 'counter') offer.value = String(result.verdict.price)
  } catch (error) { notice.value = errorText(error) }
  finally { busy.value = false }
}

function makeOffer(): void {
  if (busy.value || retry.value || parsedOffer.value === null || !view.value?.available || view.value.item?.deal !== null) return
  retry.value = { body: { clientId: game.newId(), offer: parsedOffer.value } }
  void sendPending()
}

function restart(): void {
  if (busy.value || retry.value || !view.value?.available) return
  offer.value = ''
  retry.value = { body: { clientId: game.newId(), reset: true } }
  void sendPending()
}

onMounted(load)
</script>

<template>
  <section class="signature-game" aria-labelledby="signature-game-title">
    <header><div><small>Practice market</small><h4 id="signature-game-title">{{ view?.label ?? 'Market bargain' }}</h4></div><strong v-if="view?.item">{{ view.item.rounds }} offer{{ view.item.rounds === 1 ? '' : 's' }} made</strong></header>
    <p v-if="loading && !view" role="status">Loading the seller’s practice quote…</p>
    <template v-else-if="view?.enabled && view.item">
      <div class="signature-quote">
        <div><small>Practice item</small><b>{{ view.item.label }}</b></div>
        <span><small>List</small><b>{{ naira(view.item.list) }}</b></span>
        <span><small>{{ view.item.deal === null ? 'Current ask' : 'Agreed quote' }}</small><b>{{ naira(view.item.deal ?? view.item.ask) }}</b></span>
      </div>
      <p class="signature-note">This is a practice quote using game currency. No cash is charged and no item is added.</p>
      <template v-if="view.available">
        <label v-if="view.item.deal === null">Your offer
          <input v-model="offer" type="text" inputmode="numeric" autocomplete="off" placeholder="Enter a whole naira amount" :disabled="busy || Boolean(retry)" @keyup.enter="makeOffer">
        </label>
        <BaseButton v-if="view.item.deal === null" variant="primary" block :disabled="busy || Boolean(retry) || parsedOffer === null" :reason="offer && parsedOffer === null ? 'Enter a whole game-currency amount.' : null" @click="makeOffer">Make offer</BaseButton>
        <p v-else class="signature-agreed">Quote agreed. Restart whenever you want another practice round.</p>
        <BaseButton small :disabled="busy || Boolean(retry)" @click="restart">Restart practice round</BaseButton>
      </template>
      <p v-else class="signature-why">{{ view.reason }}</p>
    </template>
    <p v-else-if="view && !view.enabled">City signature games are unavailable right now.</p>
    <p v-else-if="view">{{ view.reason }}</p>
    <p class="signature-live" role="status" aria-live="polite">{{ notice }}</p>
    <div class="signature-actions"><BaseButton v-if="retry" :disabled="busy" @click="sendPending">Retry the same action</BaseButton><BaseButton :disabled="loading || busy" @click="load">Refresh quote</BaseButton></div>
  </section>
</template>

<style scoped>
.signature-game { display: grid; gap: 10px; min-width: 0; padding: 14px; border-radius: var(--r-md); background: #fff; box-shadow: var(--e-1),var(--ring); }
.signature-game header { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px 12px; min-width: 0; }.signature-game header div { min-width: 0; }.signature-game h4,.signature-game p { margin: 0; overflow-wrap: anywhere; }.signature-game h4 { font-size: 15px; }.signature-game header small,.signature-quote small { display: block; color: var(--c-muted); font-size: 10px; }.signature-game header strong { flex: none; color: var(--c-green-dark); font-size: 10px; }
.signature-quote { display: grid; grid-template-columns: minmax(0,1.4fr) repeat(2,minmax(0,1fr)); gap: 7px; }.signature-quote > * { min-width: 0; padding: 9px; border-radius: 10px; background: var(--c-fill); }.signature-quote b { display: block; margin-top: 3px; font-size: 12px; overflow-wrap: anywhere; }
.signature-note,.signature-why { color: var(--c-ink-2); font-size: 11px; line-height: 1.45; }.signature-why { color: var(--c-red-dark); }.signature-game label { display: grid; gap: 5px; color: var(--c-muted); font-size: 11px; font-weight: 650; }.signature-game input { min-height: var(--tap,44px); padding: 8px 10px; border: 1px solid var(--c-line); border-radius: 10px; background: #fff; color: var(--c-ink); font: 650 14px var(--font); }.signature-game input:focus-visible { outline: var(--focus); outline-offset: 2px; }.signature-agreed { padding: 9px 10px; border-radius: 10px; background: var(--c-green-soft); color: var(--c-green-dark); font-size: 12px; font-weight: 650; }.signature-live { min-height: 1.4em; color: var(--c-green-dark); font-size: 12px; line-height: 1.4; }.signature-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 7px; }
@container passport (max-width: 300px) { .signature-quote { grid-template-columns: 1fr 1fr; }.signature-quote > div { grid-column: 1/-1; } }
</style>
