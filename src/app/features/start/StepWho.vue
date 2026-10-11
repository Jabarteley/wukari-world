<script setup lang="ts">
// Step 1, "Who are you?": Man or Woman, a look from large cards with portraits, a shuffle and a name. It
// changes nothing itself: the creator keeps the draft and the device.
import type { Look } from '../../../types/life.ts'
import GameIcon from '../../ui/GameIcon.vue'
import RosterPicker from './RosterPicker.vue'

defineProps<{ look: Look; name: string; error: string; preset?: string | null }>()
const emit = defineEmits<{ replace: [look: Look]; shuffle: []; dice: []; name: [value: string]; submit: [] }>()
</script>

<template>
  <div class="cr-who">
    <RosterPicker :look="look" compact @replace="emit('replace', $event)" @shuffle="emit('shuffle')" />
    <label class="cr-field">Your name
      <span class="cr-input">
        <input name="name" data-qs-name minlength="3" maxlength="24" autocomplete="nickname" autocapitalize="words" spellcheck="false" enterkeyhint="next" :value="name" :aria-invalid="error ? 'true' : undefined" @input="emit('name', ($event.target as HTMLInputElement).value)" @keydown.enter.prevent="emit('submit')">
        <button type="button" class="cr-icon" data-qs="dice" data-key="dice" aria-label="Suggest another name" title="Suggest another name" @click="emit('dice')"><GameIcon name="game" :size="22" /></button>
      </span>
    </label>
  </div>
</template>
