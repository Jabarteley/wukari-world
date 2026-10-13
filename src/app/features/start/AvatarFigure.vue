<script setup lang="ts">
// The flat standing figure of a look: what the preview stage shows until the 3D canvas has
// arrived, and instead of it when WebGL is not available. Drawn from shapes (lookModel.ts), never
// from markup.
import { computed } from 'vue'
import type { Look } from '../../../types/life.ts'
import { avatarShapes } from './lookModel.ts'

const props = withDefaults(defineProps<{
  look: Look
  /** Width in CSS pixels. */
  size?: number
  /** The text alternative; '' draws the figure as decoration. */
  label?: string
  /** A close-up for option thumbnails: the head, or the upper body. Whole figure by default. */
  crop?: 'head' | 'body'
}>(), { size: 150, label: 'Preview of your character', crop: undefined })
const box = computed(() => (props.crop === 'head' ? { view: '24 4 72 72', w: 1, h: 1 } : props.crop === 'body' ? { view: '10 44 100 100', w: 1, h: 1 } : { view: '0 0 120 190', w: 120, h: 190 }))
const shapes = computed(() => avatarShapes(props.look))
</script>

<template>
  <svg class="look-avatar" role="img" :aria-label="label" :viewBox="box.view" :width="size" :height="Math.round(size * box.h / box.w)">
    <component :is="shape.tag" v-for="(shape, index) in shapes" :key="index" v-bind="shape.attrs" />
  </svg>
</template>
