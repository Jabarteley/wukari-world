<script setup lang="ts">
// The small HUD line of close friends (docs/SOCIAL-GLUE.md): "Tunde is in the Square now", and how many more. A lazy chunk. It asks the
// server once a minute while the page is visible, and at once when the server says a close friend changed their sharing. Shows nothing
// when no close friend who shares with you is anywhere. A tap opens People.
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useApp } from '../../state/app.ts'
import { GLUE } from '../../../glue/model.ts'
import { glue, loadNow } from './glueStore.ts'

const { shell } = useApp()
let timer: ReturnType<typeof setInterval> | undefined
const tick = (): void => { if (typeof document === 'undefined' || document.visibilityState !== 'hidden') void loadNow() }
onMounted(() => { void loadNow(true); timer = setInterval(tick, GLUE.close.pollMs) })
onBeforeUnmount(() => { if (timer !== undefined) clearInterval(timer) })
const first = computed(() => glue.now[0] ?? null)
const more = computed(() => Math.max(0, glue.now.length - 1))
</script>

<template>
  <button v-if="first" type="button" class="close-now-chip" data-glue="close-chip" :aria-label="`${first.line}${more ? ` and ${more} more close friends` : ''}. Open People.`" @click="shell.open('people')">
    <b>{{ first.line }}</b><small v-if="more"> +{{ more }}</small>
  </button>
</template>

<style scoped>
.close-now-chip { display: flex; align-items: baseline; gap: 4px; max-width: 240px; min-height: 32px; padding: 4px 10px; border: 1px solid var(--c-line, #ccc); border-radius: 999px; background: var(--c-panel, #fff); color: var(--c-ink, #111); font: 600 12px var(--font, sans-serif); cursor: pointer; }
.close-now-chip b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
