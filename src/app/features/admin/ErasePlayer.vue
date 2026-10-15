<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAdmin } from './useAdmin.ts'
import { recordDone } from './adminUi.ts'

const props = defineProps<{ id: string; name: string }>()
const emit = defineEmits<{ erased: []; active: [value: boolean] }>()
const api = useAdmin()
interface Preview { token: string; plan: string; characters: { id: string; name: string; kind: string }[]; scope: string; summary: string }
interface Reply extends Partial<Preview> { code: string; jobId?: string; summary: string }
const open = ref(false), busy = ref(false), reason = ref(''), typed = ref(''), error = ref(''), preview = ref<Preview | null>(null), job = ref(''), status = ref('')
watch(open, value => emit('active', value))
watch(() => props.id, () => { open.value = false; preview.value = null; job.value = ''; reason.value = ''; typed.value = ''; error.value = ''; status.value = '' })
watch(reason, () => { preview.value = null; typed.value = '' })
async function submit(): Promise<void> {
  if (busy.value) return
  busy.value = true; error.value = ''
  const body = { reason: reason.value.trim(), ...(preview.value ? { confirm: preview.value.token, plan: preview.value.plan, typed: typed.value } : {}) }
  const reply = job.value
    ? await api.post<Reply>(`/api/admin/erasure/${job.value}/retry`, {}, `erase-retry:${job.value}`)
    : await api.post<Reply>(`/api/admin/players/${props.id}/erase`, body, `erase:${props.id}:${reason.value.trim()}`)
  busy.value = false
  if (!reply.ok) { error.value = reply.error.reason; if (reply.error.code === 'erasure_confirmation_changed') preview.value = null; return }
  if (reply.data.code === 'confirmation_required') { preview.value = reply.data as Preview; return }
  status.value = reply.data.summary
  if (reply.data.code === 'player_erased') { recordDone(reply.data.summary, true); emit('erased'); return }
  if (reply.data.jobId) job.value = reply.data.jobId
}
</script>

<template>
  <section class="adm-card adm-danger-zone" aria-label="Permanent player erasure">
    <h3>Erase player permanently</h3>
    <p>Remove {{ name }} from Allworld, including their profile, progress and map homes. This cannot be undone.</p>
    <button v-if="!open" class="adm-btn danger" type="button" @click="open = true">Erase player…</button>
    <form v-else class="adm-form" @submit.prevent="submit">
      <template v-if="!job">
        <label>Reason<input v-model="reason" maxlength="200" :disabled="busy" autocomplete="off"></label>
        <template v-if="preview">
          <p>{{ preview.summary }}</p>
          <p v-if="preview.scope === 'account'"><strong>This removes the whole Allworld account and every character listed below.</strong></p>
          <ul><li v-for="character in preview.characters" :key="character.id">{{ character.name }} · {{ character.kind }} <code>{{ character.id }}</code></li></ul>
          <label>Type <code>ERASE {{ id }}</code> to confirm<input v-model="typed" :disabled="busy" autocomplete="off" spellcheck="false"></label>
        </template>
      </template>
      <p v-if="status" role="status">{{ status }}</p>
      <p v-if="error" class="adm-error" role="alert">{{ error }}</p>
      <div class="adm-row">
        <button class="adm-btn danger" :disabled="busy || (!job && (reason.trim().length < 3 || Boolean(preview && typed !== `ERASE ${id}`)))">{{ busy ? 'Working…' : job ? 'Retry remaining cleanup' : preview ? 'Permanently erase' : 'Preview erasure' }}</button>
        <button v-if="!job" class="adm-btn" type="button" :disabled="busy" @click="open = false; preview = null; typed = ''">Cancel</button>
      </div>
    </form>
  </section>
</template>
