<script setup lang="ts">
// The calm banner under a line that asks the reader for money, a withdrawal, an account number or a code. It states the fact, offers /money, and reports in one tap.
// It is only drawn for lines from other people; the server decides which lines (the `scam` flag), so it is the same in room chat, messages and feed replies.
import { ref } from 'vue'
import { SCAM_MONEY_PAGE, SCAM_NOTICE } from './scamNotice.ts'

const emit = defineEmits<{ report: [] }>()
const sent = ref(false)
function report(): void { if (sent.value) return; sent.value = true; emit('report') }
</script>

<template>
  <div class="scam-notice" role="note" data-scam-notice>
    <span class="scam-text">{{ SCAM_NOTICE }} <a :href="SCAM_MONEY_PAGE" target="_blank" rel="noopener">What is real money?</a></span>
    <button type="button" class="scam-report" :disabled="sent" data-scam-report @click.stop="report">{{ sent ? 'Reported' : 'Report' }}</button>
  </div>
</template>

<style scoped>
.scam-notice { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; margin: 6px 0 2px; padding: 6px 10px; border-radius: 10px; background: #fff6df; color: #5a4300; font-size: 12px; line-height: 1.35; white-space: normal; text-align: left; }
.scam-text { flex: 1 1 180px; min-width: 0; }
.scam-text a { color: inherit; font-weight: 700; }
.scam-report { flex: none; min-height: 28px; padding: 0 12px; border: 1px solid #c9a24a; border-radius: 999px; background: #fff; color: #5a4300; font: inherit; font-weight: 700; cursor: pointer; }
.scam-report:disabled { opacity: .7; cursor: default; }
</style>
