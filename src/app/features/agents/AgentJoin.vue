<script setup lang="ts">
// "Connect your own assistant" inside Settings, AI agents (lazy: its own chunk, loaded only from AgentAccess.vue).
// Shows, for each popular assistant, the exact lines to paste. The key just made (shown once above) fills them in while it is on screen;
// this file NEVER keeps a key: it is only a prop, drawn on the page, gone when the section is closed or the key is dismissed.
import { computed, ref } from 'vue'
import { ASSISTANTS, STARTER_PROMPT, joinFor } from './joinModel.ts'
import type { AssistantId } from './joinModel.ts'
import { MCPB_FILENAME } from './mcpbBundle.ts'
import type { AgentKeyMade } from '../../../types/agents-http.ts'

const props = defineProps<{ made: AgentKeyMade | null; signedIn: boolean }>()
const tab = ref<AssistantId>('claude')
const copied = ref('')
const said = ref('')
const guides = computed(() => joinFor({ signedIn: props.signedIn, made: props.made, origin: location.origin }))
const live = computed(() => guides.value.hasKey)
const guide = computed(() => guides.value.guides.find((item) => item.id === tab.value) ?? guides.value.guides[0])

async function copy(what: string, text: string): Promise<void> {
  try { await navigator.clipboard.writeText(text); copied.value = what; said.value = '' } catch { copied.value = ''; said.value = 'Copy did not work here: select the text and copy it yourself.' }
}
async function download(): Promise<void> {
  try {
    const { buildMcpb } = await import('./mcpbBundle.ts')
    const bytes = buildMcpb({ url: guides.value.url }), link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/zip' })); link.download = MCPB_FILENAME
    link.click()
    setTimeout(() => { URL.revokeObjectURL(link.href) }, 5000)
  } catch { said.value = 'The download did not work. Try again.' }
}
</script>

<template>
  <section class="agent-join" data-agent-join>
    <h4 class="ui-section">Connect your own assistant</h4>
    <p v-if="!live" class="settings-note" data-agent-join-wait>Make a key above and your own lines appear here. The key is shown once.</p>
    <div class="agent-join-tabs" role="tablist">
      <button v-for="item in ASSISTANTS" :key="item.id" type="button" role="tab" class="ui-button" :class="{ 'is-primary': tab === item.id }" :aria-selected="tab === item.id" :data-agent-join-tab="item.id" @click="tab = item.id">{{ item.name }}</button>
    </div>
    <div v-if="guide" class="agent-join-body" :data-agent-join-guide="guide.id">
      <b>{{ guide.title }}</b>
      <ol><li v-for="step in guide.steps" :key="step">{{ step }}</li></ol>
      <label v-for="item in guide.paste" :key="item.label" class="ui-row"><span class="ui-row-body"><b>{{ item.label }}</b><textarea class="ui-input" readonly rows="2" :value="item.text" :aria-label="item.label" /><button type="button" class="ui-button" @click="copy(`${guide.id}:${item.label}`, item.text)">{{ copied === `${guide.id}:${item.label}` ? 'Copied' : 'Copy' }}</button></span></label>
      <a v-if="guide.link" class="ui-button is-primary" :href="guide.link.href" data-agent-join-link>{{ guide.link.label }}</a>
      <button v-if="guide.bundle" type="button" class="ui-button" data-agent-join-bundle @click="download">Download the desktop bundle</button>
      <p v-if="guide.note" class="settings-note">{{ guide.note }}</p>
    </div>
    <label class="ui-row"><span class="ui-row-body"><b>Starter prompt</b><small>Paste it to your assistant first so it plays well and safely.</small><textarea class="ui-input" readonly rows="8" :value="STARTER_PROMPT" aria-label="Starter prompt" /><button type="button" class="ui-button" data-agent-join-prompt @click="copy('prompt', STARTER_PROMPT)">{{ copied === 'prompt' ? 'Copied' : 'Copy prompt' }}</button></span></label>
    <p v-if="said" class="ui-error" role="alert">{{ said }}</p>
  </section>
</template>

<style scoped>
.agent-join { display: grid; gap: 8px; }
.agent-join-tabs { display: flex; flex-wrap: wrap; gap: 6px; }
.agent-join-body { display: grid; gap: 8px; }
.agent-join-body ol { margin: 0; padding-left: 20px; }
</style>
