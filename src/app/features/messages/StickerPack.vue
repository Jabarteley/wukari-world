<script setup lang="ts">
// The sticker tab of the emoji picker: three small sets of text stickers. A tap sends one as a message (Composer.vue). Fetched with defineAsyncComponent.
import { ref } from 'vue'
import { STICKER_SETS } from './stickerData.ts'

const emit = defineEmits<{ pick: [sticker: string] }>()
const set = ref(STICKER_SETS[0]!.id)
</script>

<template>
  <div class="stickers" data-chat="stickers">
    <div class="stickers-tabs" role="tablist">
      <button v-for="item in STICKER_SETS" :key="item.id" type="button" role="tab" :aria-selected="set === item.id" @click="set = item.id">{{ item.icon }} {{ item.label }}</button>
    </div>
    <div class="stickers-grid">
      <button v-for="sticker in STICKER_SETS.find((item) => item.id === set)?.stickers" :key="sticker" type="button" @pointerdown.prevent @click="emit('pick', sticker)">{{ sticker }}</button>
    </div>
  </div>
</template>

<style scoped>
.stickers-tabs { display: flex; gap: 4px; margin-bottom: 4px; overflow-x: auto; }
.stickers-tabs button { flex: none; min-height: 32px; padding: 0 10px; border: 0; border-radius: var(--r-pill); background: none; font: 600 13px var(--font); cursor: pointer; }
.stickers-tabs button[aria-selected='true'] { background: var(--c-fill-2); }
.stickers-grid { display: flex; flex-wrap: wrap; gap: 6px; max-height: 168px; overflow-y: auto; overscroll-behavior: contain; }
.stickers-grid button { min-height: 38px; padding: 0 12px; border: 1px solid var(--c-line); border-radius: var(--r-pill); background: #fff; font: 600 14px var(--font); cursor: pointer; }
.stickers-grid button:hover, .stickers-grid button:focus-visible { background: var(--c-fill-2); outline: none; }
</style>
