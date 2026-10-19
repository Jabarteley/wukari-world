<script setup lang="ts">
// Feedback (phone app): the public board where players share ideas, vote and see what is planned and shipped (./board.ts), and the
// in-game report for something that went wrong. The board opens in a new tab; the game stays where it is.
import { useApp } from '../../state/app.ts'
import BaseButton from '../../ui/BaseButton.vue'
import HeroCard from '../../ui/HeroCard.vue'
import { FEEDBACK_URL } from './board.ts'

const { shell } = useApp()
</script>

<template>
  <div class="feedback-app" data-feedback="app">
    <HeroCard label="Feedback" figure="Help shape Allworld">
      Share an idea, vote for the ones you want, and watch them move to Planned and Shipped. The team reads every one.
    </HeroCard>
    <a class="ui-button is-primary is-block feedback-board" :href="FEEDBACK_URL" target="_blank" rel="noopener noreferrer" data-feedback="board">Open the feedback board</a>
    <p class="feedback-note">It opens in a new tab. You can post as a guest or sign in to follow your ideas.</p>
    <BaseButton block @click="shell.open('support', { category: 'bug' })">Something went wrong? Report a problem</BaseButton>
  </div>
</template>

<style scoped>
.feedback-app { display: grid; gap: 12px; }
.feedback-board { text-align: center; text-decoration: none; }
.feedback-note { margin: 0; color: var(--muted, #5b6b63); font-size: 14px; }
</style>
