<script setup lang="ts">
// The economy of the city (docs/NEIGHBOURHOOD.md): the rich list, median prices, the Governor's treasury and game naira in circulation, from the
// game's own records. Game naira only. The same numbers stand on a public page, /economy/<city>.
import '../../../ui/controls.css'
import '../../../ui/panels/social.css'
import '../feed/feed.css'
import { onMounted, ref, watch } from 'vue'
import { useApp } from '../../state/app.ts'
import { naira } from '../../../promote/model.ts'
import type { EconomyView } from '../../../types/neighbourhood.ts'

const { game } = useApp()
const view = ref<EconomyView | null>(null), failed = ref('')
async function load(): Promise<void> {
  try { const r = await game.fetchJson<{ ok: boolean; reason?: string } & EconomyView>(`/api/economy?city=${encodeURIComponent(game.view.value.cityId)}`); if (r.ok) { view.value = r; failed.value = '' } else failed.value = r.reason ?? 'The numbers are not ready.' } catch { failed.value = 'The numbers could not be loaded. Try again in a minute.' }
}
onMounted(() => { void load() })
watch(() => game.view.value.cityId, () => { void load() })
const share = async (): Promise<void> => {
  const url = `${location.origin}/economy/${encodeURIComponent(game.view.value.cityId)}`
  try { await navigator.clipboard.writeText(url); game.toast('Link copied.', 'info') } catch { game.toast(url, 'info') }
}
</script>

<template>
  <section v-if="view" class="feed" aria-label="Economy" data-economy="app">
    <p class="social-note">The economy of {{ view.cityName }}. Game naira only: it is never real money and nobody can withdraw it.</p>
    <article class="feed-card"><div class="feed-who"><b>{{ naira(view.circulation.total) }}</b><small>game naira in circulation</small></div>
      <p class="feed-body">{{ naira(view.circulation.wallets) }} in wallets · {{ naira(view.circulation.market) }} in Market accounts · {{ naira(view.circulation.treasury) }} in the treasury</p></article>
    <article class="feed-card"><div class="feed-who"><b>{{ view.government.title }} {{ view.government.governor ?? '(no one in office)' }}</b><small>Treasury {{ naira(view.government.treasury) }}</small></div>
      <p class="feed-body">This week: {{ naira(view.government.taxWeek) }} in levies, {{ naira(view.government.feesWeek) }} in fees and bail, {{ naira(view.government.spentWeek) }} paid out.</p></article>
    <b>Median prices</b>
    <p v-if="!view.prices.length" class="feed-note">The market of this city has not opened yet.</p>
    <ul v-else class="social-list"><li v-for="p in view.prices" :key="p.commodity" class="social-row"><div><strong>{{ p.label }} · {{ naira(p.median) }}</strong><small>{{ p.unit }} · {{ p.source === 'trades' ? `${p.trades} trades today` : 'reference price' }}</small></div></li></ul>
    <b>Rich list</b>
    <p v-if="!view.rich.balances.length" class="feed-note">Nobody is listed yet.</p>
    <ul v-else class="social-list"><li v-for="r in view.rich.balances" :key="r.rank" class="social-row"><div><strong>{{ r.rank }}. {{ r.name }}</strong><small>{{ naira(r.amount) }}</small></div></li></ul>
    <button type="button" class="social-btn" @click="share">Copy the public page link</button>
  </section>
  <section v-else class="feed" aria-label="Economy"><p class="feed-note">{{ failed || 'Loading the numbers…' }}</p></section>
</template>
