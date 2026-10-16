<script setup lang="ts">
// Game art credits in the Help sheet: loaded with its data only when a player asks (HelpBody.vue), never in the first download.
import { onMounted, ref } from 'vue'
import { loadCredits } from './assetCredits.ts'
import type { Credits } from './assetCredits.ts'

const credits = ref<Credits | null>(null)
const failed = ref(false)
onMounted(async () => {
  try { credits.value = await loadCredits() } catch { failed.value = true }
})
</script>

<template>
  <section class="asset-credits" aria-label="Game art credits">
    <p v-if="failed">The credits could not load. They are also at <a href="/assets/CREDITS.txt" target="_blank" rel="noopener">CREDITS.txt</a>.</p>
    <p v-else-if="!credits">Loading credits…</p>
    <template v-else>
      <ul>
        <li v-for="row in [...credits.required, ...credits.thanks]" :key="row.title">
          <a v-if="row.url" :href="row.url" target="_blank" rel="noopener noreferrer">{{ row.title }}</a><template v-else>{{ row.title }}</template>
          · <a v-if="row.licenceUrl" :href="row.licenceUrl" target="_blank" rel="noopener noreferrer">{{ row.licence }}</a><template v-else>{{ row.licence }}</template>
          <template v-if="row.detail"> · {{ row.detail }}</template>
        </li>
      </ul>
      <p><a href="/assets/CREDITS.txt" target="_blank" rel="noopener">Every file, in full</a></p>
    </template>
  </section>
</template>

<style scoped>
.asset-credits { margin: 8px 0 0; text-align: left; }
.asset-credits ul { margin: 0; padding: 0 0 0 16px; }
.asset-credits li { margin: 0 0 4px; }
.asset-credits p { margin: 4px 0 0; }
.asset-credits a { color: inherit; }
</style>
