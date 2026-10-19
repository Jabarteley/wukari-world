<script setup lang="ts">
// The neighbourhood for the admins (server/routes/neighbourhood-admin.ts, docs/NEIGHBOURHOOD.md): the noticeboard's notices (remove one, put one
// up that the reviewer could not decide), and "Meet your neighbours": plan a local government's meetup as yourself. Every change is in the audit log.
import { onMounted, ref } from 'vue'
import { useAdmin } from './useAdmin.ts'
import { relative } from './adminModel.ts'
import { recordDone } from './adminUi.ts'

interface Notice { id: string; area: string; kind: string; by: string; body: string; at: number; status: string; reason: string; up: number; down: number; reports: number; ended: string }
interface Meetup { event: string; area: string; month: string; by: string; via: string; going: number }
const api = useAdmin()
const notices = ref<Notice[]>([]), meetups = ref<Meetup[]>([]), error = ref('')
const form = ref({ city: 'lagos', lga: '', place: '', price: 0 })
async function load(): Promise<void> {
  const r = await api.get<{ notices: Notice[]; meetups: Meetup[] }>('/api/admin/neighbourhood')
  if (r.ok) { notices.value = r.data.notices; meetups.value = r.data.meetups; error.value = '' } else error.value = r.error.reason
}
onMounted(load)
async function act(body: Record<string, unknown>, done: string): Promise<void> {
  const r = await api.post('/api/admin/neighbourhood/act', body, `hood:${JSON.stringify(body)}`)
  recordDone(r.ok ? done : r.error.reason, r.ok)
  if (r.ok) await load()
}
async function plan(): Promise<void> {
  const body = { city: form.value.city.trim(), lga: form.value.lga.trim(), ...(form.value.place.trim() ? { place: form.value.place.trim() } : {}), ...(form.value.price > 0 ? { price: form.value.price } : {}) }
  const r = await api.post<{ ok: boolean; reason?: string; priceNote?: string }>('/api/admin/neighbourhood/meetup', body, `hood-meetup:${JSON.stringify(body)}`)
  recordDone(!r.ok ? r.error.reason : r.data.ok === false ? r.data.reason ?? 'Not planned' : r.data.priceNote ? `Planned, free (${r.data.priceNote})` : 'Meetup planned', r.ok && r.data.ok !== false)
  if (r.ok) await load()
}
</script>

<template>
  <div class="adm-card" data-admin="neighbourhood">
    <div class="adm-row adm-between"><h3>Neighbourhood</h3><button class="adm-btn" type="button" @click="load">Refresh</button></div>
    <p class="adm-sub">Notices on the area noticeboards, and the monthly Meet your neighbours. The reviewer reads every notice first; a notice it could not decide waits here.</p>
    <p v-if="error" class="adm-error" role="alert">{{ error }}</p>
    <h4>Notices</h4>
    <p v-if="!notices.length" class="adm-muted">No notices yet.</p>
    <p v-for="n in notices.slice(0, 60)" :key="n.id" class="adm-line"><span><b>{{ n.kind }}</b> · {{ n.area }} · {{ n.by }} · {{ n.status }}<template v-if="n.ended"> (ended: {{ n.ended }})</template> · {{ n.up }} yes {{ n.down }} no<template v-if="n.reports"> · {{ n.reports }} reports</template> · {{ relative(n.at, Date.now()) }}<br>{{ n.body }}<template v-if="n.reason"><br><i>{{ n.reason }}</i></template></span>
      <button v-if="n.status !== 'live'" class="adm-btn" type="button" @click="act({ notice: n.id, action: 'restore' }, 'Notice is up')">Put up</button>
      <button v-if="n.status === 'live'" class="adm-btn" type="button" @click="act({ notice: n.id, action: 'remove', note: 'Removed by Allworld.' }, 'Notice removed')">Remove</button></p>
    <h4>Meetups</h4>
    <p v-if="!meetups.length" class="adm-muted">None planned yet.</p>
    <p v-for="m in meetups.slice(0, 40)" :key="m.event" class="adm-line"><span><b>{{ m.area }}</b> · {{ m.month }} · hosted by {{ m.by }} ({{ m.via }}) · {{ m.going }} going</span></p>
    <h4>Plan a meetup</h4>
    <div class="adm-row">
      <input v-model="form.city" aria-label="City id" placeholder="city, e.g. lagos">
      <input v-model="form.lga" aria-label="Local government id" placeholder="local government, e.g. ikeja">
      <input v-model="form.place" aria-label="Meeting place" placeholder="meeting place (optional)">
      <input v-model.number="form.price" type="number" min="0" aria-label="Ticket price in naira" placeholder="ticket ₦ (0 is free)">
      <button class="adm-btn" type="button" :disabled="!form.city.trim() || !form.lga.trim()" @click="plan">Plan next month's</button>
    </div>
  </div>
</template>
