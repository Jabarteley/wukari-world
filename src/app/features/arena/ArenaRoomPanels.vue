<script setup lang="ts">
// The cards every live game shares under its canvas: the lobby (invite link, share, rules, start), the result (rematch, leave,
// invite) and the watching note. Give it the object `useArenaRoom` returned. A game screen shows the canvas and, while the game
// is on and the player is seated, its own controls; this component renders nothing in that case.
import BaseButton from '../../ui/BaseButton.vue'
import type { ArenaRoom } from '../../../arena/room.ts'

const props = defineProps<{ room: ArenaRoom<any>; /** "Play the computer instead" is offered in a lobby. */ practice?: boolean; shareLine?: string }>()
const r = props.room
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
    <p>Send this link. Whoever opens it comes straight into this game.<template v-if="r.state.value.max > 2"> {{ r.state.value.seats.length }} of {{ r.state.value.max }} seats taken.</template></p>
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
.rp-small { font-size: 12px; color: var(--c-muted); }
</style>
