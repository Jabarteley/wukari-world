<script setup lang="ts">
// What a seller who came from /shops or /services needs to know before My shop: the three steps in one line, what publishing really needs
// (the server's own rules, never loosened here) and, for a guest, the moment to sign up: when it is needed, not before.
import { SETUP_NEEDS, SETUP_STEPS } from '../start/entryModel.ts'

defineProps<{ guest: boolean }>()
const emit = defineEmits<{ signup: [] }>()
</script>

<template>
  <section class="sc-setup" aria-label="Setting up your shop" data-setup-checklist>
    <ol class="sc-setup-steps"><li v-for="step in SETUP_STEPS" :key="step">{{ step }}</li></ol>
    <p v-if="guest" class="sc-setup-lead">Your shop is saved to an account. Sign up free to start filling it in; it takes a moment and your character comes with you.</p>
    <button v-if="guest" type="button" class="ui-button is-primary is-block" data-setup-signup @click="emit('signup')">Sign up free</button>
    <details class="sc-setup-needs" :open="guest">
      <summary>What publishing needs</summary>
      <ul><li v-for="need in SETUP_NEEDS" :key="need">{{ need }}</li></ul>
    </details>
  </section>
</template>

<style scoped>
.sc-setup { display: grid; gap: 10px; padding: 14px; border: 1px solid var(--c-line); border-radius: 16px; background: var(--c-amber-soft); color: var(--c-ink); }
.sc-setup p { margin: 0; }
.sc-setup-steps { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 0; list-style: none; counter-reset: step; }
.sc-setup-steps li { counter-increment: step; display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: var(--r-pill); background: #fff; color: var(--c-amber-dark); font-size: 13px; font-weight: 700; }
.sc-setup-steps li::before { content: counter(step); display: grid; place-items: center; width: 18px; height: 18px; border-radius: 50%; background: var(--c-amber-dark); color: #fff; font-size: 11px; }
.sc-setup-lead { color: var(--c-ink-2); font-size: 14px; }
.sc-setup-needs { font-size: 13.5px; color: var(--c-ink-2); }
.sc-setup-needs summary { display: flex; align-items: center; min-height: var(--tap); cursor: pointer; font-weight: 700; color: var(--c-green-dark); }
.sc-setup-needs ul { margin: 0; padding-left: 20px; }
</style>
