<script setup lang="ts">
// Boutique (Phone app): buy native hairstyles, fitted outfits and shoes with cash and wear them.
// Rules and prices: src/game/systems/onboarding.ts ('onboarding.boutique-buy', 'onboarding.set-look')
// and content/traits.js (BOUTIQUE_PRICES — original beta prices). Draws view.onboarding.boutique.
//
// The 3D preview at the top shows your Sim. "Try on" puts an item on the preview only — nothing is
// bought or changed until Buy or Wear is pressed. The preview is the look stage of the character
// panels (src/ui/panels/look-ui.js).
import { computed } from 'vue'
import type { Look } from '../../../types/life.ts'
import type { BoutiqueItem } from '../../../types/view.ts'
import { useApp } from '../../state/app.ts'
import { linkWords } from '../../../ui/link.ts'
import SettleNotice from '../start/SettleNotice.vue'
import LookStage from '../start/LookStage.vue'
import { lookSummary } from '../start/lookModel.ts'
import { money } from '../../ui/format.ts'
import GameIcon from '../../ui/GameIcon.vue'
import BaseButton from '../../ui/BaseButton.vue'
import { useAct } from '../kit/act.ts'
import { SECTIONS, itemLabel, itemControl, itemNote, nextTrying, triedItem, wearing, withWearableBoutique } from './boutiqueModel.ts'
import { trying } from './boutiqueState.ts'

defineProps<{ params?: unknown }>()

const { game, command } = useApp()
const { act, pending } = useAct()
const view = game.view
const onboarding = computed(() => withWearableBoutique(view.value.onboarding, game.state.value))
const offline = computed(() => { const words = view.value.connected ? null : linkWords(view.value); return words ? `${words.short} — you cannot shop right now` : '' })
const tried = computed(() => triedItem(onboarding.value.boutique, trying.value))
const shown = computed<Look>(() => (tried.value ? wearing(onboarding.value.look, tried.value) : onboarding.value.look))
const caption = computed(() => (tried.value ? `Trying on: ${itemLabel(tried.value)}${tried.value.owned ? '' : ` · ${money(tried.value.price)}`}` : lookSummary(onboarding.value.look)))
const sections = computed(() => SECTIONS.map(([kind, title]) => ({ kind, title, items: onboarding.value.boutique.filter((item) => item.kind === kind) })))

function tryOn(item: BoutiqueItem): void { trying.value = nextTrying(trying.value, { kind: item.kind, id: item.id }) }
const wear = (item: BoutiqueItem): Promise<boolean> => act(`wear:${item.kind}:${item.id}`, () => command('onboarding.set-look', { look: wearing(onboarding.value.look, item) }))
const buy = (item: BoutiqueItem): Promise<boolean> => act(`buy:${item.kind}:${item.id}`, () => command('onboarding.boutique-buy', { kind: item.kind, id: item.id }))
const isTrying = (item: BoutiqueItem): boolean => tried.value === item
</script>

<template>
  <div class="boutique-root">
    <div class="boutique-top">
      <LookStage :look="shown" variant="wide" :name="view.name" :caption="caption">
        <template v-if="tried" #tools><button type="button" class="look-tool" data-try="null" data-key="try:none" @click="trying = null">↶ Back to my look</button></template>
      </LookStage>
      <p>Wallet <strong>{{ money(game.state.value.cash) }}</strong><small>Try native hairstyles, fitted outfits and shoes first. Buying puts the exact item on and keeps it in your wardrobe. Detailed face, body and colour controls are free in Profile.</small></p>
    </div>
    <SettleNotice hint message="Settle in first: the Boutique and your wardrobe open once you have a home." />
    <template v-for="section in sections.filter(section => section.items.length)" :key="section.kind">
      <h3>{{ section.title }}</h3>
      <div class="boutique-grid">
        <article v-for="item in section.items" :key="`${item.kind}:${item.id}`" class="boutique-item" :class="{ 'is-wearing': item.wearing, 'is-trying': isTrying(item) }">
          <strong>{{ itemLabel(item) }}</strong>
          <small>{{ itemNote(item, money) }}</small>
          <BaseButton v-if="!item.wearing" class="boutique-try" :variant="isTrying(item) ? 'selected' : 'default'" :data-key="`try:${item.kind}:${item.id}`" :aria-pressed="isTrying(item)" @click="tryOn(item)"><template v-if="isTrying(item)"><GameIcon inline name="check" /> Trying on</template><template v-else>Try on</template></BaseButton>
          <template v-for="control in [itemControl(item, { offline, done: onboarding.done })]" :key="control.kind">
            <em v-if="control.kind === 'worn'" class="boutique-state"><GameIcon inline name="check" /> Wearing</em>
            <template v-else-if="control.kind === 'wear'">
              <BaseButton :variant="control.why ? 'default' : 'primary'" :disabled="pending !== null" :reason="control.why" @click="wear(item)">Wear</BaseButton>
              <small v-if="control.why" class="boutique-why">{{ control.why }}</small>
            </template>
            <template v-else>
              <BaseButton :variant="control.why ? 'default' : 'primary'" :disabled="pending !== null" :reason="control.why" @click="buy(item)">Buy · {{ money(item.price) }}</BaseButton>
              <small v-if="control.why" class="boutique-why">{{ control.why }}</small>
            </template>
          </template>
        </article>
      </div>
    </template>
    <p class="preview-note">Every item shown is available on the native character.</p>
  </div>
</template>

<style scoped src="../../../ui/panels/boutique.css"></style>
