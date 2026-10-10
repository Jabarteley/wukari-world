<script setup lang="ts">
// "THIS NEEDS A SETTLED LIFE": the one notice every screen uses where a guest of the quick start is told to settle in.
// It draws only when it is a settle-in matter: `code` is the refusal's code (never matched against its text), or, with
// `hint`, the life itself is a guest (the short "Settle in first" beside a control that cannot work yet). It always
// carries the one button that opens "Make this life yours"; when that is closed or finished the player is back on
// the sheet they came from (settleModel.ts).
import '../../../ui/controls.css'
import { computed } from 'vue'
import { useApp } from '../../state/app.ts'
import { SETTLE_LABEL, needsSettling } from '../../state/settleRefusal.ts'
import { SETTLE_FIRST_HINT, startSettling } from './settleModel.ts'

const props = defineProps<{
  /** The refusal's code. */
  code?: string | null
  /** What the player was told, in plain words: no pointer to a control that is not on screen. */
  message?: string
  /** Up front: draw for any guest, with `message` or the short "Settle in first". */
  hint?: boolean
}>()
const { game, shell } = useApp()
const onboarding = computed(() => game.view.value.onboarding)
const shown = computed(() => (props.hint ? onboarding.value.guest && !onboarding.value.required : needsSettling(props.code, onboarding.value)))
</script>

<template>
  <div v-if="shown" class="settle-notice" :class="{ 'is-hint': hint }" :role="hint ? undefined : 'alert'" data-settle-notice>
    <p>{{ message || SETTLE_FIRST_HINT }}</p>
    <button type="button" class="ui-button is-primary" data-settle-now @click="startSettling(shell)">{{ SETTLE_LABEL }}</button>
  </div>
</template>

<style scoped>
.settle-notice { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; padding: 10px 12px; border-radius: var(--r-lg, 12px); background: #fbeee9; color: #7d2416; font-size: var(--t-body, 15px); line-height: 1.35; }
.settle-notice p { flex: 1 1 14em; min-width: 0; margin: 0; overflow-wrap: anywhere; }
.settle-notice .ui-button { flex: none; }
.settle-notice.is-hint { background: #eef3ec; color: inherit; padding: 6px 10px; font-size: var(--t-small, 13px); }
</style>
