<script setup lang="ts">
// The cards every live game shares under its canvas: the lobby (invite link, share, rules, start), the result (rematch, leave,
// invite) and the watching note. Give it the object `useArenaRoom` returned. A game screen shows the canvas and, while the game
// is on and the player is seated, its own controls; this component renders nothing in that case.
import { computed, watch } from 'vue'
import BaseButton from '../../ui/BaseButton.vue'
import { APPEARANCE } from '../../../game/content/traits.ts'
import { joinBlip } from '../../../arena/blip.ts'
import type { ArenaRoom } from '../../../arena/room.ts'

const props = defineProps<{ room: ArenaRoom<any>; /** "Play the computer instead" is offered in a lobby. */ practice?: boolean; shareLine?: string }>()
const r = props.room
const skin = (look: readonly string[] | undefined, fallback: string): string => APPEARANCE.skin.find((swatch) => swatch.id === look?.[0])?.hex ?? fallback
const top = (look: readonly string[] | undefined, fallback: string): string => APPEARANCE.outfitColours.find((swatch) => swatch.id === look?.[2])?.hex ?? fallback
const PALETTE = ['#e8553d', '#2f80ed', '#2fa66a', '#c49a1a']
/** The seats as the lobby draws them: an avatar disc (the player's own skin and outfit colour), the name, who is you. */
const people = computed(() => (r.state.value?.seats ?? []).map((seat, index) => ({ key: seat.id ?? `bot-${index}`, name: seat.name, bot: seat.bot, you: index === r.state.value?.you, skin: skin(seat.look, '#8a5a3c'), top: top(seat.look, PALETTE[index % PALETTE.length] as string), initial: seat.name.trim().charAt(0).toUpperCase() || '?' })))
const empty = computed(() => Math.max(0, (r.state.value?.max ?? 0) - people.value.length))
const waiting = computed(() => {
  const st = r.state.value
  if (!st) return ''
  const need = st.min - st.seats.length, more = st.max - st.seats.length
  if (need > 0) return `Waiting for ${need} more`
  return more > 0 ? `${st.seats.length} in. Waiting for up to ${more} more, or start now` : 'All seats are taken'
})
// A new face in the lobby gets a blip (the first render is silent).
let seen = -1
watch(() => r.state.value?.seats.length ?? 0, (n) => { if (seen >= 0 && n > seen && r.status.value === 'lobby') joinBlip(); seen = n }, { immediate: true })
// Options may be numbers, strings or booleans: the value sent is the option's own value at the chosen position, never the text of the control.
const choose = (name: string, event: Event): void => {
  const option = r.state.value?.optionList.find((o) => o.name === name)
  const value = option?.values[(event.target as HTMLSelectElement).selectedIndex]
  if (value !== undefined) r.setOption(name, value)
}
</script>

<template>
  <section v-if="r.status.value === 'lobby' && r.state.value" class="rp" data-testid="fight-lobby">
    <h3>Waiting for {{ r.state.value.max > 2 ? 'players' : 'your friend' }}</h3>
    <p>Send this link. Whoever opens it comes straight into this game.</p>
    <ul class="rp-people" aria-label="Players">
      <li v-for="p in people" :key="p.key" class="rp-person"><span class="rp-disc" :style="{ background: p.skin, boxShadow: `inset 0 -12px 0 ${p.top}` }" aria-hidden="true">{{ p.initial }}</span><span class="rp-name">{{ p.you ? 'You' : p.name }}</span></li>
      <li v-for="n in empty" :key="'empty-' + n" class="rp-person rp-empty"><span class="rp-disc" aria-hidden="true">?</span><span class="rp-name">Open seat</span></li>
    </ul>
    <p class="rp-wait" role="status">{{ waiting }}</p>
    <input class="rp-link" readonly :value="r.link.value" aria-label="Invite link" @focus="($event.target as HTMLInputElement).select()">
    <div class="rp-row">
      <BaseButton variant="primary" @click="r.share(props.shareLine)">Share link</BaseButton>
      <BaseButton @click="r.copy">{{ r.copied.value ? 'Copied' : 'Copy link' }}</BaseButton>
    </div>
    <template v-if="r.state.value.host">
      <label v-for="o in r.state.value.optionList" :key="o.name" class="rp-opt">{{ o.label }}
        <select :value="o.value" @change="choose(o.name, $event)"><option v-for="(v, i) in o.values" :key="String(v)" :value="v">{{ o.names[i] }}</option></select>
      </label>
      <BaseButton v-if="r.state.value.seats.length >= r.state.value.min && r.state.value.seats.length > 1" variant="primary" block @click="r.start(0)">Start now ({{ r.state.value.seats.length }} players)</BaseButton>
      <BaseButton v-if="props.practice !== false" block @click="r.start(1)">Play the computer instead</BaseButton>
    </template>
    <p class="rp-small">Anyone who opens the link when the seats are full will watch.</p>
  </section>

  <section v-else-if="r.status.value === 'over' && r.state.value" class="rp" data-testid="fight-over">
    <h3>{{ r.headline.value }}</h3>
    <p>{{ r.state.value.result?.text }}</p>
    <div v-if="r.seated.value" class="rp-row">
      <BaseButton variant="primary" :disabled="r.iAsked.value" @click="r.again">{{ r.iAsked.value ? (r.state.value.practice ? 'Starting…' : 'Waiting for the others…') : 'Rematch' }}</BaseButton>
      <BaseButton @click="r.leave">Leave</BaseButton>
    </div>
    <div v-else class="rp-row"><BaseButton @click="r.leave">Leave</BaseButton></div>
    <BaseButton v-if="!r.state.value.practice" block @click="r.share(props.shareLine)">Invite someone else</BaseButton>
  </section>

  <section v-else-if="r.status.value === 'playing' && !r.seated.value && r.state.value" class="rp">
    <p>You are watching {{ r.state.value.seats.map((s) => s.name).join(' vs ') }}.</p>
    <p class="rp-small">{{ r.state.value.watchers }} watching</p>
  </section>
</template>

<style scoped>
.rp { display: grid; gap: 10px; padding: 14px; background: #f3efe8; border-radius: 14px; }
.rp h3 { margin: 0; font-size: 20px; }
.rp p { margin: 0; font-size: 14px; line-height: 1.45; }
.rp-link { width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #cfc7b8; border-radius: 8px; font: 13px ui-monospace, monospace; background: #fff; }
.rp-row { display: flex; gap: 8px; } .rp-row > * { flex: 1; }
.rp-opt { display: flex; justify-content: space-between; align-items: center; font-size: 14px; } .rp-opt select { padding: 8px; }
.rp-people { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 12px; }
.rp-person { display: grid; justify-items: center; gap: 4px; width: 64px; }
.rp-disc { width: 48px; height: 48px; border-radius: 50%; display: grid; place-items: center; font: 800 18px system-ui; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,.6); }
.rp-empty .rp-disc { background: transparent; border: 2px dashed #b9b1a3; color: #b9b1a3; text-shadow: none; }
.rp-name { font-size: 12px; max-width: 64px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rp-wait { font-weight: 650; }
/* A plain CSS pop on insertion: TransitionGroup would pull its runtime into the shared first-paint vue chunk. */
.rp-person:not(.rp-empty) { animation: rp-pop .45s cubic-bezier(.2, 1.6, .4, 1); }
@keyframes rp-pop { from { transform: scale(.2); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .rp-person { animation: none; } }
.rp-small { font-size: 12px; color: var(--c-muted); }
</style>
