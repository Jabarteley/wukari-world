<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { StoryLearningLesson } from './storyLearning.ts'
import BaseButton from '../../ui/BaseButton.vue'

const props = defineProps<{ episodeId: string; lesson: StoryLearningLesson }>()
const selected = ref<number | null>(null)
const correct = computed(() => selected.value === props.lesson.correctIndex)

watch(() => props.episodeId, () => { selected.value = null })
function answer(index: number): void {
  if (!correct.value) selected.value = index
}
</script>

<template>
  <section class="story-learning" :aria-labelledby="`learning-${episodeId}-title`">
    <div class="learning-heading">
      <span class="learning-label">Local history · sourced note</span>
      <h3 :id="`learning-${episodeId}-title`">A fact about this place</h3>
    </div>
    <p class="learning-boundary">{{ lesson.boundaryText }}</p>
    <p class="learning-fact">{{ lesson.fact }}</p>
    <p class="learning-source"><b>Source:</b> {{ lesson.source.publisher }}, <cite>{{ lesson.source.title }}</cite><span> ({{ lesson.source.locator }}; {{ lesson.source.basis }}).</span> <a :href="lesson.source.url" target="_blank" rel="noopener noreferrer">Read the source<span class="sr-only"> (opens in a new tab)</span></a></p>

    <fieldset class="learning-question">
      <legend>{{ lesson.question }}</legend>
      <div class="learning-choices">
        <BaseButton
          v-for="(choice, index) in lesson.choices"
          :key="`${episodeId}-choice-${index}`"
          class="learning-choice"
          :variant="selected === index ? (correct ? 'selected' : 'default') : 'default'"
          :aria-pressed="selected === index"
          :disabled="correct"
          @click="answer(index)"
        >{{ choice }}</BaseButton>
      </div>
    </fieldset>
    <p v-if="selected !== null" class="learning-feedback" :class="{ 'is-correct': correct }" role="status" aria-live="polite">{{ correct ? lesson.explanation : lesson.retryFeedback }}</p>
  </section>
</template>

<style scoped>
.story-learning { min-width: 0; display: grid; gap: 10px; padding: 13px; border: 1px solid var(--c-line); border-radius: var(--r-sm); background: var(--c-blue-soft); }
.learning-heading { display: grid; gap: 2px; }
.learning-label { color: var(--c-blue); font-size: 11px; font-weight: 750; letter-spacing: .02em; }
.learning-heading h3 { margin: 0; color: var(--c-ink); font-size: 15px; line-height: 1.3; }
.learning-boundary,.learning-fact,.learning-source,.learning-feedback { margin: 0; overflow-wrap: anywhere; font-size: 13px; line-height: 1.5; }
.learning-boundary,.learning-source { color: var(--c-ink-2); }
.learning-fact { color: var(--c-ink); font-weight: 650; }
.learning-source { font-size: 12px; }
.learning-source a { display: inline-block; min-height: 44px; padding: 10px 0; color: var(--c-blue); font-weight: 700; text-underline-offset: 2px; }
.learning-question { min-width: 0; margin: 0; padding: 0; border: 0; }
.learning-question legend { margin-bottom: 8px; color: var(--c-ink); font-size: 13px; font-weight: 700; line-height: 1.45; overflow-wrap: anywhere; }
.learning-choices { display: grid; gap: 8px; }
.learning-choices :deep(.learning-choice) { display: block; width: 100%; min-height: 44px; padding: 10px 12px; text-align: left; white-space: normal; line-height: 1.35; overflow-wrap: anywhere; }
.learning-feedback { padding: 9px 10px; border-radius: var(--r-sm); background: var(--c-surface-solid); color: var(--c-ink-2); }
.learning-feedback.is-correct { color: var(--c-green-dark); font-weight: 650; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
</style>
