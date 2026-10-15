<script setup lang="ts">
// One task a house agent gave in person: the agent's face (a letter on its colour, as for any person in a list) with the AI-played mark, what it asked in its
// own words, where and when to find it, a progress bar for a counted task, and Collect or Go. The reward is the server's: the number shown is the one stored.
import { computed } from 'vue'
import type { AgentMissionRow } from '../../../types/view.ts'
import { money } from '../../ui/format.ts'
import BaseButton from '../../ui/BaseButton.vue'
import RowMark from '../../ui/RowMark.vue'
import AiTag from '../social/AiTag.vue'
import { agentHint, agentPercent } from './missionsLines.ts'

const props = defineProps<{
  task: AgentMissionRow
  /** Why Collect cannot be pressed (not connected), or null. */
  why: string | null
  /** 'claim' while that request is on its way. */
  pending: 'claim' | 'swap' | null
}>()
const emit = defineEmits<{ claim: []; go: [] }>()
const hint = computed(() => agentHint(props.task, money))
</script>

<template>
  <li class="gr-item gr-agent" :class="{ 'is-done': task.done, 'is-claimed': task.claimed }" data-agent-task>
    <RowMark :name="task.by.name" :seed="task.by.id" round />
    <div>
      <b>{{ task.by.name }}<AiTag :who="{ agent: true }" /></b>
      <span class="gr-ask">{{ task.label }}</span>
      <small v-if="task.brief" class="gr-brief">“{{ task.brief }}”</small>
      <small>{{ hint }}</small>
      <template v-if="task.count > 1">
        <div class="gr-bar" role="progressbar" aria-valuemin="0" :aria-valuemax="task.count" :aria-valuenow="task.n" :aria-label="task.label"><i :style="{ width: `${agentPercent(task)}%` }" /></div>
        <small>{{ task.n }} of {{ task.count }}</small>
      </template>
    </div>
    <div class="gr-acts">
      <span v-if="task.claimed" class="gr-done">Collected</span>
      <BaseButton v-else-if="task.done" variant="primary" :disabled="Boolean(why) || pending !== null" :reason="why" @click="emit('claim')">{{ pending === 'claim' ? 'Collecting…' : `Collect ${money(task.cash)}` }}</BaseButton>
      <BaseButton v-else-if="task.go" @click="emit('go')">Go</BaseButton>
    </div>
  </li>
</template>

<style scoped>
.gr-item { background: #fff; border-radius: var(--r-md, 16px); box-shadow: var(--e-1), var(--ring); padding: 12px 14px; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 10px; align-items: center; }
.gr-item.is-done { background: var(--c-green-soft); }
.gr-item.is-claimed { opacity: .62; }
.gr-item b { display: block; font-size: 14px; line-height: 1.25; }
.gr-ask { display: block; font-size: 14px; line-height: 1.3; margin-top: 2px; }
.gr-item small { display: block; color: var(--c-muted); font-size: 12px; line-height: 1.35; }
.gr-brief { font-style: italic; margin-top: 2px; }
.gr-bar { height: 6px; border-radius: 99px; background: var(--c-fill-2, #e6e9ee); overflow: hidden; margin-top: 6px; }
.gr-bar i { display: block; height: 100%; background: var(--c-green); border-radius: 99px; }
.gr-acts { display: grid; gap: 6px; justify-items: end; }
.gr-acts :deep(.base-button) { min-height: var(--tap, 44px); white-space: nowrap; }
.gr-done { font-size: 12px; color: var(--c-muted); }
</style>
