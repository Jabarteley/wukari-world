<script setup lang="ts">
// What the scene pane says when the 3D scene cannot be shown (sceneSupport.ts said no, or the renderer threw): the plain words, the
// address, and a Copy link button. A lazy chunk: a browser that can draw the scene never fetches it.
import { ref } from 'vue'
import { browserSceneSupport } from './sceneSupport.ts'
import { COPIED_LABEL, COPY_LABEL, copyGameLink, sceneHelp } from './sceneWords.ts'

// Why: asked again here (it is cheap, and only a browser that cannot show the scene gets here); a scene that could start but threw reads as 'failed'.
const found = browserSceneSupport()
const help = sceneHelp(found.ok ? 'failed' : found.reason)
const address = `${globalThis.location?.origin ?? ''}/`
const copied = ref(false)
async function copy(): Promise<void> { copied.value = await copyGameLink(address) }
</script>

<template>
  <strong>{{ help.title }}</strong>
  <small data-scene-help>{{ help.help }}</small>
  <small class="scene-address" data-scene-address>{{ address }}</small>
  <button type="button" class="scene-retry" data-scene-copy @click="copy">{{ copied ? COPIED_LABEL : COPY_LABEL }}</button>
</template>
