<script setup lang="ts">
import '../../../ui/panels/look-ui.css'
import { computed } from 'vue'
import { normalizeNativeRecipe } from '../../../character/native-recipe.ts'
import { nativeRecipeForLook } from '../../../character/native-migration.ts'
import { NATIVE_CHARACTER_CATALOG } from '../../../character/native-catalog.ts'
import type { NativeAppearanceV2, NativeCharacterRecipeV2, NativeColorField } from '../../../character/native-recipe.ts'
import type { AvatarLook } from '../../../game/wardrobe/look.ts'
import type { Owned } from './lookModel.ts'

const props = withDefaults(defineProps<{ look: AvatarLook; owned?: Owned | null }>(), { owned: null })
const emit = defineEmits<{ replace: [look: AvatarLook] }>()
const recipe = computed(() => nativeRecipeForLook(props.look, 'look-editor'))
const faceFeatures = NATIVE_CHARACTER_CATALOG.features.filter((item) => item.group === 'face')
const bodyFeatures = NATIVE_CHARACTER_CATALOG.features.filter((item) => item.group === 'body')
const colorFields: readonly NativeColorField[] = ['skin', 'hair', 'upper', 'lower', 'shoes']

function replace(next: NativeCharacterRecipeV2): void {
  emit('replace', { ...props.look, body: next.appearance.body === 'male' ? 'man' : 'woman', accessories: undefined, wearables: undefined, appearance: undefined, native: normalizeNativeRecipe(next) })
}
function appearance(patch: Partial<NativeAppearanceV2>): void {
  replace({ ...recipe.value, appearance: { ...recipe.value.appearance, ...patch } })
}
function feature(id: string, value: string): void {
  appearance({ features: { ...recipe.value.appearance.features, [id]: Number(value) } })
}
function color(id: NativeColorField, value: string): void {
  appearance({ colors: { ...recipe.value.appearance.colors, [id]: value } })
}
function preset(group: 'body' | 'face', values: Readonly<Partial<Record<string, number>>>): void {
  const next = { ...recipe.value.appearance.features }
  for (const item of NATIVE_CHARACTER_CATALOG.features) if (item.group === group) next[item.id] = values[item.id] ?? 0
  appearance({ features: next })
}
function canUse(id: string): boolean {
  const current = recipe.value.appearance
  return !props.owned?.native || props.owned.native.includes(id) || current.hair === id || current.garments.some((item) => item === id) || current.shoes === id
}
</script>

<template>
  <div class="look-editor native-look-editor">
    <fieldset class="look-group">
      <legend>Body</legend>
      <div class="look-chips">
        <button v-for="item in NATIVE_CHARACTER_CATALOG.bodies" :key="item.id" type="button" class="look-chip" :aria-pressed="recipe.appearance.body === item.id" @click="appearance({ body: item.id })">{{ item.label }}</button>
      </div>
      <label class="native-range"><span>Height <output>{{ recipe.appearance.height.toFixed(2) }}</output></span><input type="range" aria-label="Height" min="0.85" max="1.15" step="0.01" :value="recipe.appearance.height" @input="appearance({ height: Number(($event.target as HTMLInputElement).value) })"></label>
      <div class="look-chips">
        <button v-for="item in NATIVE_CHARACTER_CATALOG.bodyPresets" :key="item.id" type="button" class="look-chip" @click="preset('body', item.features)">{{ item.label }}</button>
      </div>
    </fieldset>

    <fieldset class="look-group">
      <legend>Hair</legend>
      <div class="look-chips"><button v-for="item in NATIVE_CHARACTER_CATALOG.hair" :key="item.id" type="button" class="look-chip" :aria-pressed="recipe.appearance.hair === item.id" :disabled="!canUse(item.id)" :title="canUse(item.id) ? undefined : 'Buy in the Boutique'" @click="appearance({ hair: item.id })">{{ item.label }}</button></div>
    </fieldset>

    <fieldset class="look-group">
      <legend>Outfit</legend>
      <div class="look-chips"><button v-for="item in NATIVE_CHARACTER_CATALOG.garments" :key="item.id" type="button" class="look-chip" :aria-pressed="recipe.appearance.garments[0] === item.id" :disabled="!canUse(item.id)" :title="canUse(item.id) ? undefined : 'Buy in the Boutique'" @click="appearance({ garments: [item.id] })">{{ item.label }}</button></div>
    </fieldset>

    <fieldset class="look-group">
      <legend>Shoes</legend>
      <div class="look-chips"><button v-for="item in NATIVE_CHARACTER_CATALOG.shoes" :key="item.id" type="button" class="look-chip" :aria-pressed="recipe.appearance.shoes === item.id" :disabled="!canUse(item.id)" :title="canUse(item.id) ? undefined : 'Buy in the Boutique'" @click="appearance({ shoes: item.id })">{{ item.label }}</button></div>
    </fieldset>

    <fieldset class="look-group native-colors">
      <legend>Colours</legend>
      <label v-for="id in colorFields" :key="id"><span>{{ id === 'upper' ? 'Top' : id === 'lower' ? 'Bottoms' : id }}</span><input type="color" :value="recipe.appearance.colors[id]" @input="color(id, ($event.target as HTMLInputElement).value)"><code>{{ recipe.appearance.colors[id] }}</code></label>
    </fieldset>

    <fieldset class="look-group">
      <legend>Eyes and complexion</legend>
      <div class="look-chips"><button v-for="item in NATIVE_CHARACTER_CATALOG.eyeColors" :key="item.id" type="button" class="look-chip" :aria-pressed="recipe.appearance.eyeColor === item.id" @click="appearance({ eyeColor: item.id })">{{ item.label }}</button></div>
      <div class="look-chips"><button v-for="item in NATIVE_CHARACTER_CATALOG.complexions" :key="item.id" type="button" class="look-chip" :aria-pressed="recipe.appearance.complexion === item.id" @click="appearance({ complexion: item.id })">{{ item.label }}</button></div>
    </fieldset>

    <details class="look-group">
      <summary>Detailed body controls</summary>
      <label v-for="item in bodyFeatures" :key="item.id" class="native-range"><span>{{ item.label }} <output>{{ recipe.appearance.features[item.id]?.toFixed(2) }}</output></span><input type="range" :aria-label="item.label" :min="item.min" :max="item.max" step="0.05" :value="recipe.appearance.features[item.id]" @input="feature(item.id, ($event.target as HTMLInputElement).value)"></label>
    </details>

    <details class="look-group">
      <summary>Detailed face controls</summary>
      <div class="look-chips"><button v-for="item in NATIVE_CHARACTER_CATALOG.appearancePresets" :key="item.id" type="button" class="look-chip" @click="preset('face', item.features)">{{ item.label }}</button></div>
      <label v-for="item in faceFeatures" :key="item.id" class="native-range"><span>{{ item.label }} <output>{{ recipe.appearance.features[item.id]?.toFixed(2) }}</output></span><input type="range" :aria-label="item.label" :min="item.min" :max="item.max" step="0.05" :value="recipe.appearance.features[item.id]" @input="feature(item.id, ($event.target as HTMLInputElement).value)"></label>
    </details>

    <fieldset class="look-group">
      <legend>Hands</legend>
      <div class="look-chips"><button v-for="item in NATIVE_CHARACTER_CATALOG.handPoses" :key="item.id" type="button" class="look-chip" :aria-pressed="recipe.appearance.handPose === item.id" @click="appearance({ handPose: item.id })">{{ item.label }}</button></div>
    </fieldset>

    <fieldset class="look-group">
      <legend>Expression</legend>
      <div class="look-chips"><button v-for="item in NATIVE_CHARACTER_CATALOG.emotions" :key="item.id" type="button" class="look-chip" :aria-pressed="recipe.emotion === item.id" @click="replace({ ...recipe, emotion: item.id })">{{ item.label }}</button></div>
      <label class="native-range"><span>Strength <output>{{ Math.round(recipe.emotionStrength * 100) }}%</output></span><input type="range" aria-label="Expression strength" min="0" max="1" step="0.05" :value="recipe.emotionStrength" @input="replace({ ...recipe, emotionStrength: Number(($event.target as HTMLInputElement).value) })"></label>
    </fieldset>
  </div>
</template>

<style scoped>
.native-look-editor{display:grid;gap:12px}
.native-range{display:grid;gap:6px;margin:10px 0;color:#36515a}
.native-range span{display:flex;justify-content:space-between;gap:12px}
.native-range input{width:100%}
.native-colors{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}
.native-colors legend{grid-column:1/-1}
.native-colors label{display:grid;grid-template-columns:1fr 42px;align-items:center;gap:4px;text-transform:capitalize}
.native-colors input{width:42px;height:34px;padding:1px;border:0;background:transparent}
.native-colors code{grid-column:1/-1;color:#56717a;font-size:11px}
details summary{cursor:pointer;font-weight:700}
</style>
