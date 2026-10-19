<script setup lang="ts">
// The weekly world event for the admins (server/routes/world-events-admin.ts, docs/WORLD-EVENTS.md): the weekly slot, the rotation (hide or
// show a built-in event), events added or replaced as JSON, a surprise drop now, and a stage's moderator. No release needed; every change
// is audited.
import { onMounted, ref } from 'vue'
import { useAdmin } from './useAdmin.ts'
import { recordDone } from './adminUi.ts'
import type { WorldEventsAdminView } from '../../../types/world-events.ts'

const api = useAdmin()
const data = ref<WorldEventsAdminView | null>(null), error = ref('')
const schedule = ref({ weekday: 6, hour: 20, minute: 0, minutes: 60, warmup: 60, off: false })
const draft = ref(''), room = ref('world:square'), moderator = ref('')
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const when = (at: number): string => new Date(at + 3600000).toISOString().slice(0, 16).replace('T', ' ')
async function load(): Promise<void> {
  const r = await api.get<WorldEventsAdminView>('/api/admin/world-events')
  if (r.ok) { data.value = r.data; schedule.value = { ...r.data.schedule }; error.value = '' } else error.value = r.error.reason
}
onMounted(load)
async function act(action: string, body: Record<string, unknown> = {}): Promise<void> {
  const r = await api.post<{ ok: boolean; summary?: string; reason?: string }>('/api/admin/world-events', { action, ...body }, `world-events:${action}:${JSON.stringify(body)}`)
  const ok = r.ok && r.data.ok !== false
  recordDone(r.ok ? (r.data.ok === false ? r.data.reason ?? 'Refused.' : r.data.summary ?? 'Done.') : r.error.reason, ok)
  if (ok) await load()
}
function saveEvent(): void {
  let item: unknown
  try { item = JSON.parse(draft.value) } catch { recordDone('That is not JSON.', false); return }
  void act('event.save', { item })
}
</script>

<template>
  <div class="adm-card" style="margin-top:12px" data-admin="world-events">
    <div class="adm-row adm-between"><h3>World event (weekly)</h3><button class="adm-btn" type="button" @click="load">Refresh</button></div>
    <p v-if="error" class="adm-error" role="alert">{{ error }}</p>
    <template v-if="data">
      <p class="adm-sub">Next: <span v-for="item in data.next" :key="item.week">{{ when(item.startsAt) }} {{ item.title }} ({{ item.city }}); </span></p>
      <p class="adm-row">
        <label>Day <select v-model.number="schedule.weekday"><option v-for="(day, at) in DAYS" :key="day" :value="at">{{ day }}</option></select></label>
        <label>Time <input v-model.number="schedule.hour" type="number" min="0" max="23" style="width:56px">:<input v-model.number="schedule.minute" type="number" min="0" max="59" style="width:56px"></label>
        <label>Minutes <input v-model.number="schedule.minutes" type="number" min="15" max="240" style="width:70px"></label>
        <label>Warm-up <input v-model.number="schedule.warmup" type="number" min="0" max="180" style="width:70px"></label>
        <label><input v-model="schedule.off" type="checkbox"> Off</label>
        <button class="adm-btn" type="button" @click="act('schedule.save', { item: schedule })">Save the schedule</button>
      </p>
      <table class="adm-table"><tbody>
        <tr v-for="item in data.builtIn" :key="item.id"><td><b>{{ item.title }}</b><div class="adm-sub">{{ item.id }} · {{ item.city }} · {{ item.goal }}</div></td>
          <td><button class="adm-btn" type="button" @click="act(data.hidden.includes(item.id) ? 'show' : 'hide', { id: item.id })">{{ data.hidden.includes(item.id) ? 'Show' : 'Hide' }}</button></td></tr>
        <tr v-for="item in data.custom" :key="`c${item.id}`"><td><b>{{ item.title }}</b><div class="adm-sub">{{ item.id }} · {{ item.city }} · {{ item.goal }} · target {{ item.target }}{{ item.on ? ` · on ${item.on}` : ' · in the rotation' }}</div></td>
          <td><button class="adm-btn" type="button" @click="draft = JSON.stringify(item, null, 1)">Edit</button> <button class="adm-btn danger" type="button" @click="act('event.remove', { id: item.id })">Remove</button></td></tr>
      </tbody></table>
      <label class="adm-sub">Add or replace an event (JSON: id, title, blurb, city, goal gather | deliver | answer, target, venues, questions [{ q, answers }], change { label, colours [two #rrggbb] }, on YYYY-MM-DD or none)
        <textarea v-model="draft" rows="6" style="width:100%"></textarea></label>
      <p class="adm-row"><button class="adm-btn" type="button" :disabled="!draft.trim()" @click="saveEvent">Save the event</button>
        <button class="adm-btn" type="button" @click="act('drop')">Drop a surprise in the Square now</button></p>
      <p class="adm-row"><label>Stage room <input v-model="room" style="width:160px"></label><label>Moderator (public id, empty = the game) <input v-model="moderator" style="width:220px"></label>
        <button class="adm-btn" type="button" @click="act('stage.moderator', { room, moderator })">Set</button> <button class="adm-btn danger" type="button" @click="act('stage.end', { room })">End the stage</button></p>
    </template>
  </div>
</template>
