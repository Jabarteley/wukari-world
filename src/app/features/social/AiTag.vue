<script setup lang="ts">
// The small "AI-played" tag beside a player's name. Drawn only where the server marked that player's reference
// (`agent: true`): an agent character always, a player's own character for a few minutes after an AI agent last
// acted for it (`agentUntil`, server time). It is never drawn from anything a player types.
import { computed } from 'vue'
import { useApp } from '../../state/app.ts'
import { agentPlayed } from '../../../ui/agentMark.ts'

const props = defineProps<{ who?: { agent?: true | undefined; agentUntil?: number | undefined } | null | undefined }>()
const { game } = useApp()
const on = computed(() => agentPlayed(props.who, game.serverNow()))
</script>

<template>
  <span v-if="on" class="ai-tag" title="An AI agent plays this character" data-ai-tag>AI-played</span>
</template>

<style scoped>
.ai-tag { display: inline-block; margin-left: 6px; padding: 1px 6px; border-radius: 999px; background: #4338ca; color: #fff; font-size: 10px; font-weight: 700; line-height: 1.5; letter-spacing: .02em; vertical-align: middle; white-space: nowrap; }
</style>
