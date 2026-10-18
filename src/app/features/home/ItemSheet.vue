<script setup lang="ts">
// The item sheet ('home-item', params { id }): a tap on a piece of furniture at home opens what it is and what you can do. Use it (its activities, started
// at its corner), go to its corner when its actions live there, move it (Buy mode with it selected), put it away, or sell it (a second tap confirms).
// The choices are itemActions.ts; the writes are the same commands Buy mode and the venue panel send.
import '../../../ui/controls.css'
import { computed, ref, watch } from 'vue'
import { useApp } from '../../state/app.ts'
import GameIcon from '../../ui/GameIcon.vue'
import { money } from '../../ui/format.ts'
import StarRating from './StarRating.vue'
import { defOf, objectOf } from './buyModel.ts'
import { show, sellSelected, storeSelected } from './homeScene.ts'
import { H } from './homeState.ts'
import { itemActions } from './itemActions.ts'
import { social } from '../social/useSocial.ts'

const props = defineProps<{ params?: unknown }>()
const { game, shell, command, goTo } = useApp()
const id = computed(() => { const p = (props.params ?? {}) as { id?: unknown }; return typeof p.id === 'string' ? p.id : null })
const placed = computed(() => objectOf(game.state.value, id.value))
const def = computed(() => defOf(placed.value?.itemId))
const actions = computed(() => (def.value ? itemActions(def.value) : null))
const visiting = computed(() => Boolean(social.me?.visiting))
const busy = ref(false)
const confirmSell = ref(false)
const blurb = ref('')
watch(def, (value) => {
  blurb.value = ''; confirmSell.value = false
  if (value) void import('../../../game/content/furniture-blurbs.ts').then(({ FURNITURE_BLURBS }) => { if (def.value?.id === value.id) blurb.value = FURNITURE_BLURBS[value.id] ?? '' })
}, { immediate: true })
const why = computed(() => (!game.connected.value ? 'Not connected right now.' : game.state.value.activeAction ? 'Finish what you are doing first.' : null))

async function use(activity: string): Promise<void> {
  if (busy.value || why.value || !actions.value?.spot) return
  busy.value = true
  shell.close()
  try { await goTo('home', actions.value.spot); await command('activity', { id: activity }) } finally { busy.value = false }
}
function corner(): void { if (actions.value?.spot) { shell.close(); void goTo('home', actions.value.spot) } }
function move(): void {
  if (!id.value) return
  shell.close()
  shell.open('buy')
  H.selected = id.value; H.floor = placed.value?.floor ?? 0
  show()
}
async function putAway(): Promise<void> {
  if (!id.value || busy.value) return
  busy.value = true
  H.selected = id.value
  try { await storeSelected() } finally { busy.value = false; shell.close() }
}
async function sell(): Promise<void> {
  if (!id.value || busy.value) return
  if (!confirmSell.value) { confirmSell.value = true; return }
  busy.value = true
  H.selected = id.value
  try { await sellSelected() } finally { busy.value = false; shell.close() }
}
</script>

<template>
  <section v-if="def && actions" class="item-sheet" :data-item-sheet="def.id">
    <h3 class="item-title"><GameIcon inline kind="furniture" :id="def.id" :emoji="def.icon" /> {{ def.label }} <StarRating :count="def.stars" /></h3>
    <p v-if="blurb" class="item-blurb">{{ blurb }}</p>
    <template v-if="!visiting">
      <div v-if="actions.uses.length" class="item-uses">
        <button v-for="action in actions.uses" :key="action.activity" type="button" class="ui-button is-primary is-block" :disabled="Boolean(why) || busy" :data-item-use="action.activity" @click="use(action.activity)">
          {{ action.icon }} {{ action.label }} <small>· {{ action.seconds }}s</small>
        </button>
      </div>
      <button v-else-if="actions.spot" type="button" class="ui-button is-primary is-block" :disabled="Boolean(why)" data-item-corner @click="corner()">Go to the {{ actions.spotLabel }}: see what you can do there</button>
      <p v-if="why" class="item-why">{{ why }}</p>
      <div class="item-tools">
        <button type="button" class="ui-button" data-item-move @click="move()">Move</button>
        <button type="button" class="ui-button" :disabled="busy" data-item-store @click="putAway()">Put away</button>
        <button type="button" class="ui-button" :class="{ 'is-danger': confirmSell }" :disabled="busy" data-item-sell @click="sell()">{{ confirmSell ? `Tap again to sell for ${money(actions.refund)}` : `Sell for ${money(actions.refund)}` }}</button>
      </div>
    </template>
    <p v-else class="item-why">This is your host's. Only they can move or use it.</p>
  </section>
  <p v-else class="ui-error">That is no longer here.</p>
</template>

<style scoped>
.item-sheet { display: grid; gap: 10px; }
.item-title { margin: 0; font-size: 17px; }
.item-blurb { margin: 0; color: var(--c-muted); line-height: 1.45; }
.item-uses { display: grid; gap: 8px; }
.item-uses small { opacity: .8; font-weight: 500; }
.item-tools { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.item-tools .ui-button { white-space: normal; }
.item-why { margin: 0; font-size: 12px; color: var(--c-muted); }
</style>
