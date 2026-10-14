<script setup lang="ts">
// Owambe party, on the Home tab: the host picks a title and an aso-ebi colour and starts it, names a guest MC and a guest DJ,
// and ends it; everyone inside sees the dress code and the two labels and can spray (a line in the house chat, no money).
// Everything is the server's (server/social/party.ts); this only asks. The rules and words: src/festivals/party.ts.
import '../../../ui/controls.css'
import '../../../ui/panels/social.css'
import { computed, ref } from 'vue'
import { useApp } from '../../state/app.ts'
import { COLOURS, PARTY } from '../../../festivals/party.ts'
import type { HouseView } from '../../../types/social.ts'
import { endParty, nameRole, sprayFloor, startParty } from './visitStore.ts'
import { timeLeft } from '../../../game/visit.ts'

const props = defineProps<{ house: HouseView }>()
const { game } = useApp()
const host = computed(() => props.house.role === 'host')
const party = computed(() => props.house.party ?? null)
const title = ref(''), colour = ref(COLOURS[0]!.id)
const pending = ref(false), problem = ref<string | null>(null)
const offline = computed(() => !game.view.value.connected)
async function act(operation: () => Promise<string | null>): Promise<void> {
  if (pending.value || offline.value) return
  pending.value = true; problem.value = null
  try { problem.value = await operation() } finally { pending.value = false }
}
const roleOf = (id: string): 'MC' | 'DJ' | '' => (party.value?.mc?.id === id ? 'MC' : party.value?.dj?.id === id ? 'DJ' : '')
</script>

<template>
  <section v-if="host || party" class="party" aria-label="Owambe party" data-visit="party">
    <h3 class="ui-section">Owambe</h3>
    <p v-if="problem" class="ui-error" role="alert">{{ problem }}</p>
    <template v-if="party">
      <div class="party-card" :style="{ borderColor: party.colour.hex }" data-party="card">
        <span class="party-swatch" :style="{ background: party.colour.hex }" aria-hidden="true" />
        <div><strong>{{ party.title }}</strong><small>Dress code: {{ party.colour.label }} aso-ebi · {{ timeLeft(party.until, game.view.value.now) }}</small></div>
      </div>
      <p class="social-note" data-party="roles">MC: {{ party.mc?.name ?? 'nobody yet' }} · DJ: {{ party.dj?.name ?? 'nobody yet' }} · {{ party.sprays }} {{ party.sprays === 1 ? 'spray' : 'sprays' }}</p>
      <button type="button" class="ui-button is-block" data-party="spray" :disabled="pending || offline || party.sprayLeft < 1" @click="act(() => sprayFloor(house.host.id))">Spray the floor ({{ party.sprayLeft }} left)</button>
      <p class="social-note">Spraying is just for fun: no money moves.</p>
      <div v-if="host && house.guests.length" class="social-list">
        <div v-for="guest in house.guests" :key="guest.id" class="social-row" :data-party-guest="guest.id">
          <div><strong>{{ guest.name }}</strong><small>{{ roleOf(guest.id) || 'Guest' }}</small></div>
          <span class="social-actions">
            <button type="button" class="social-btn" data-party="mc" :disabled="pending || offline" @click="act(() => nameRole('mc', party!.mc?.id === guest.id ? null : guest.id))">{{ party.mc?.id === guest.id ? 'Not MC' : 'Make MC' }}</button>
            <button type="button" class="social-btn" data-party="dj" :disabled="pending || offline" @click="act(() => nameRole('dj', party!.dj?.id === guest.id ? null : guest.id))">{{ party.dj?.id === guest.id ? 'Not DJ' : 'Make DJ' }}</button>
          </span>
        </div>
      </div>
      <button v-if="host" type="button" class="ui-button is-block" data-party="end" :disabled="pending || offline" @click="act(endParty)">End the party</button>
    </template>
    <template v-else>
      <p class="social-note">Throw a party at home. Pick a colour for the aso-ebi, ask friends over, and name an MC and a DJ from the guests. It lasts {{ PARTY.minutes / 60 }} hours.</p>
      <input v-model="title" class="party-title" type="text" :maxlength="PARTY.title" placeholder="Owambe at my place" aria-label="Party name" autocomplete="off">
      <div class="party-colours" role="radiogroup" aria-label="Aso-ebi colour">
        <label v-for="item in COLOURS" :key="item.id" class="party-colour" :class="{ 'is-on': colour === item.id }">
          <input v-model="colour" type="radio" name="party-colour" :value="item.id" :data-colour="item.id">
          <span class="party-swatch" :style="{ background: item.hex }" aria-hidden="true" />{{ item.label }}
        </label>
      </div>
      <button type="button" class="ui-button is-primary is-block" data-party="start" :disabled="pending || offline" @click="act(() => startParty(title, colour))">Start the party</button>
    </template>
  </section>
</template>

<style scoped>
.party { min-width: 0; overflow-wrap: anywhere; }
.party-card { display: flex; gap: 10px; align-items: center; padding: 10px 12px; margin: 6px 0; border: 2px solid; border-radius: var(--r-sm); background: var(--c-fill); }
.party-card small { display: block; color: var(--c-ink-2); font-size: 12px; }
.party-swatch { display: inline-block; flex: none; width: 18px; height: 18px; margin-right: 6px; border-radius: 50%; border: 1px solid var(--c-line); vertical-align: middle; }
.party-card .party-swatch { width: 28px; height: 28px; margin: 0; }
.party-title { box-sizing: border-box; width: 100%; min-height: 44px; padding: 8px 12px; margin: 6px 0; border: 1px solid var(--c-line, #d8d8d8); border-radius: 10px; font: 400 16px var(--font); }
.party-colours { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0 10px; }
.party-colour { display: inline-flex; align-items: center; min-height: 44px; padding: 0 10px; border: 1px solid var(--c-line); border-radius: 22px; font-size: 13px; cursor: pointer; }
.party-colour.is-on { border-color: var(--c-ink); background: var(--c-fill); }
.party-colour input { position: absolute; opacity: 0; pointer-events: none; }
.party-colour:focus-within { outline: var(--focus); outline-offset: 2px; }
</style>
