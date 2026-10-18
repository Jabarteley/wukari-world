<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useApp } from '../../state/app.ts'
import GameIcon from '../../ui/GameIcon.vue'
import { takeStoryHelpQuery } from './coopModel.ts'
import { setStoryHelpFocus } from './storyUi.ts'

const { game, shell } = useApp()
const story = computed(() => game.view.value.story)

onMounted(() => {
  const id = takeStoryHelpQuery(window.location, window.history)
  if (!id) return
  setStoryHelpFocus(id)
  shell.open('passport', { tab: 'story' })
})
</script>

<template>
  <button
    v-if="story?.enabled === true"
    type="button"
    class="story-chip"
    :aria-label="`Open Story in My Life. ${story.chapterLabel}. Next: ${story.nextStep}`"
    @click="shell.open('passport', { tab: 'story' })"
  >
    <span class="story-chip-icon" aria-hidden="true"><GameIcon name="book" :size="20" /></span>
    <span><b>{{ story.chapterLabel }}</b><small>{{ story.nextStep }}</small></span>
    <span class="story-chip-go" aria-hidden="true"><GameIcon name="chevron" :size="16" /></span>
  </button>
</template>

<style scoped>
.story-chip { display: grid; grid-template-columns: auto minmax(0,1fr) auto; align-items: center; gap: 9px; width: 100%; min-height: var(--tap,44px); padding: 7px 9px; border: 1px solid #fff; border-radius: 17px; background: var(--c-surface); color: var(--c-ink); box-shadow: var(--e-2); text-align: left; pointer-events: auto; cursor: pointer; }
.story-chip-icon { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 11px; background: #e8f0ff; color: #254f91; }
.story-chip b,.story-chip small { display: block; overflow-wrap: anywhere; }
.story-chip b { font-size: 12px; line-height: 1.25; }
.story-chip small { margin-top: 2px; color: var(--c-muted); font-size: 11px; line-height: 1.3; }
.story-chip-go { color: var(--c-muted); }
.story-chip:focus-visible { outline: var(--focus); outline-offset: 2px; }
</style>
