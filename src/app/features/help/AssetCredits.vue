<script setup lang="ts">
// Game art credits in the Help sheet: this component and its data load only when a player asks (HelpBody.vue), never in the first download.
import { assetCredits } from './assetCredits.ts'

const credits = assetCredits()
const rows = [...credits.required, ...credits.thanks]
</script>

<template>
  <section class="asset-credits" aria-label="Game art credits">
    <ul>
      <li v-for="row in rows" :key="row.title">
        <a v-if="row.url" :href="row.url" target="_blank" rel="noopener noreferrer">{{ row.title }}</a><template v-else>{{ row.title }}</template>
        · <a v-if="row.licenceUrl" :href="row.licenceUrl" target="_blank" rel="noopener noreferrer">{{ row.licence }}</a><template v-else>{{ row.licence }}</template>
        <template v-if="row.detail"> · {{ row.detail }}</template>
      </li>
    </ul>
    <p><a href="/assets/CREDITS.txt" target="_blank" rel="noopener">Every file, in full</a></p>
  </section>
</template>

<style scoped>
.asset-credits { margin: 8px 0 0; text-align: left; }
.asset-credits ul { margin: 0; padding: 0 0 0 16px; }
.asset-credits li { margin: 0 0 4px; }
.asset-credits p { margin: 4px 0 0; }
.asset-credits a { color: inherit; }
</style>
