<script setup lang="ts">
// Who you look like: Man or Woman, the characters of that body as cards with their portraits, the outfits of the one chosen as
// thumbnails, its skin tone steps as swatches, and a shuffle. It changes nothing itself: a tap says `replace(look)` with the whole new
// look and the creator keeps it (and the turnable figure above shows it). `compact` is the first step: the body and the cards only.
import '../../../ui/panels/roster-picker.css'
import { computed } from 'vue'
import { SKIN_STEPS, rosterEntry, rosterOn } from '../../../game/roster.ts'
import type { RosterSex } from '../../../game/roster.ts'
import { SKIN_HEX, SKIN_NAMES } from '../../../scene/roster/map.ts'
import { characterOf, shuffleCharacter, withCharacter, withOutfit, withSex, withSkinStep } from '../../../scene/roster/look.ts'
import { portraitUrl, thumbUrl } from '../../../scene/roster/portraits.ts'
import type { Look } from '../../../types/life.ts'
import GameIcon from '../../ui/GameIcon.vue'

const props = defineProps<{ look: Look; compact?: boolean }>()
const emit = defineEmits<{ replace: [look: Look]; shuffle: [] }>()

const current = computed(() => characterOf(props.look))
const entry = computed(() => rosterEntry(current.value?.id))
const sex = computed<RosterSex>(() => entry.value?.sex ?? (props.look.body === 'man' ? 'man' : 'woman'))
const cards = computed(() => rosterOn(sex.value))
const outfits = computed(() => Array.from({ length: entry.value?.outfits ?? 0 }, (_, index) => index))
const steps = Array.from({ length: SKIN_STEPS }, (_, index) => index + 1)
const outfitIndex = computed(() => current.value?.outfit ?? 0)
const skinStep = computed(() => current.value?.skin ?? 0)

const pickSex = (next: RosterSex): void => emit('replace', withSex(props.look, next))
const pickCard = (id: string): void => { if (id !== current.value?.id) emit('replace', withCharacter(props.look, id)) }
const pickOutfit = (index: number): void => emit('replace', withOutfit(props.look, index))
const pickSkin = (step: number): void => emit('replace', withSkinStep(props.look, step))
const shuffle = (): void => { emit('replace', shuffleCharacter(props.look, Math.random, sex.value)); emit('shuffle') }
</script>

<template>
  <div class="rp" :data-compact="compact ? '' : undefined">
    <div class="rp-top">
      <div class="cr-seg rp-sex" role="group" aria-label="Man or woman">
        <button type="button" data-key="sex:man" :aria-pressed="sex === 'man'" @click="pickSex('man')">Man</button>
        <button type="button" data-key="sex:woman" :aria-pressed="sex === 'woman'" @click="pickSex('woman')">Woman</button>
      </div>
      <button type="button" class="cr-btn is-small rp-shuffle" data-key="shuffle" @click="shuffle"><GameIcon name="game" inline /> Shuffle</button>
    </div>
    <fieldset class="rp-group">
      <legend>Choose a look</legend>
      <div class="rp-cards">
        <button v-for="item in cards" :key="item.id" type="button" class="rp-card" :data-key="`look:${item.id}`" :aria-pressed="current?.id === item.id" @click="pickCard(item.id)">
          <img v-if="portraitUrl(item.id, current?.id === item.id ? outfitIndex : 0)" :src="portraitUrl(item.id, current?.id === item.id ? outfitIndex : 0) ?? ''" alt="" width="128" height="128" loading="lazy" decoding="async">
          <span class="rp-name">{{ item.name }}</span>
        </button>
      </div>
    </fieldset>
    <template v-if="!compact && entry">
      <fieldset class="rp-group">
        <legend>Outfit <b>{{ outfitIndex === 0 ? 'As made' : `Outfit ${outfitIndex + 1}` }}</b></legend>
        <div class="rp-outfits">
          <button v-for="index in outfits" :key="index" type="button" class="rp-outfit" :data-key="`outfit:${index}`" :aria-pressed="outfitIndex === index" :aria-label="index === 0 ? 'Outfit 1, as made' : `Outfit ${index + 1}`" @click="pickOutfit(index)">
            <img v-if="thumbUrl(entry.id, index)" :src="thumbUrl(entry.id, index) ?? ''" alt="" width="64" height="128" loading="lazy" decoding="async">
          </button>
        </div>
      </fieldset>
      <fieldset v-if="entry.skin" class="rp-group">
        <legend>Skin tone <b>{{ skinStep === 0 ? 'As made' : SKIN_NAMES[skinStep - 1] }}</b></legend>
        <div class="rp-skins">
          <button type="button" class="rp-made" data-key="skin:0" :aria-pressed="skinStep === 0" @click="pickSkin(0)">As made</button>
          <button v-for="step in steps" :key="step" type="button" class="rp-swatch" :style="{ background: SKIN_HEX[step - 1] }" :data-key="`skin:${step}`" :aria-pressed="skinStep === step" :aria-label="SKIN_NAMES[step - 1]" :title="SKIN_NAMES[step - 1]" @click="pickSkin(step)" />
        </div>
      </fieldset>
    </template>
  </div>
</template>
