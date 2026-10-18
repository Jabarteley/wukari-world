<script setup lang="ts">
// The feed's moderation log (server/routes/feed-admin.ts): what the AI reviewer (and any admin) decided about reported posts, replies,
// crews, events, gigs and profiles, and about new public pictures, newest first. Every decision can be undone: the thing comes back as it was.
import { onMounted, ref } from 'vue'
import { useAdmin } from './useAdmin.ts'
import { relative } from './adminModel.ts'
import { recordDone } from './adminUi.ts'

interface Decision { n: number; at: number; by: 'ai' | 'operator'; kind: string; id: string; action: 'remove' | 'hide' | 'keep'; category: string; reason: string; text: string; author: string | null; saw?: 'text' | 'image'; undone?: { at: number; by: string } }
const emit = defineEmits<{ player: [id: string] }>()
const api = useAdmin()
const rows = ref<Decision[]>([]), open = ref(0), error = ref(''), busy = ref(0)
async function load(): Promise<void> {
  const r = await api.get<{ decisions: Decision[]; open: number }>('/api/admin/feed')
  if (r.ok) { rows.value = r.data.decisions; open.value = r.data.open; error.value = '' } else error.value = r.error.reason
}
onMounted(load)
async function undo(d: Decision): Promise<void> {
  busy.value = d.n
  const r = await api.post('/api/admin/feed/undo', { n: d.n }, `feed-undo:${d.n}`)
  busy.value = 0
  recordDone(r.ok ? 'Undone: it is back as it was' : r.error.reason, r.ok)
  if (r.ok) await load()
}
const word = (d: Decision): string => (d.action === 'remove' ? 'Removed' : d.action === 'hide' ? 'Hidden' : 'Kept')
</script>

<template>
  <div class="adm-card" data-admin="feed-decisions">
    <div class="adm-row adm-between"><h3>Feed decisions</h3><button class="adm-btn" type="button" @click="load">Refresh</button></div>
    <p class="adm-sub">The AI reviewer decides every report at once, and checks every new public picture and portrait. Undo puts the thing back. {{ open }} report{{ open === 1 ? '' : 's' }} still waiting.</p>
    <p v-if="error" class="adm-error" role="alert">{{ error }}</p>
    <p v-else-if="!rows.length" class="adm-muted">No decisions yet.</p>
    <p v-for="d in rows" :key="d.n" class="adm-line">
      <span><b>{{ word(d) }}</b> {{ d.kind }} · {{ d.category }}<template v-if="d.saw === 'image'"> · saw the picture</template> · {{ d.by === 'ai' ? 'AI reviewer' : 'admin' }} · {{ relative(d.at, Date.now()) }}<br>“{{ d.text.slice(0, 160) }}”<br><small class="adm-muted">{{ d.reason }}</small><small v-if="d.undone" class="adm-muted"> · undone by {{ d.undone.by }}</small></span>
      <button v-if="d.author" class="adm-btn" type="button" @click="emit('player', d.author)">Author</button>
      <button v-if="!d.undone && d.action !== 'keep'" class="adm-btn" type="button" :disabled="busy === d.n" @click="undo(d)">Undo</button>
    </p>
  </div>
</template>
