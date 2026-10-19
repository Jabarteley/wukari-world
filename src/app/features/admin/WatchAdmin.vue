<script setup lang="ts">
// Shared watching for the admins (server/routes/watch-admin.ts, docs/ALLWORLD-HOUSE.md): enter a fixture's result (there is no score feed),
// start or stop an Allworld House season, approve or decline artists, take a premiere down. Every change is audited.
import { onMounted, ref } from 'vue'
import { useAdmin } from './useAdmin.ts'
import { recordDone } from './adminUi.ts'
import type { WatchAdminView } from '../../../types/watch.ts'

const api = useAdmin()
const data = ref<WatchAdminView | null>(null), error = ref('')
const scores = ref<Record<string, { home: number; away: number }>>({})
const start = ref({ room: '', cities: '', mates: 8, now: false })
const reasons = ref<Record<string, string>>({})
const when = (at: number): string => new Date(at + 3600000).toISOString().slice(0, 16).replace('T', ' ')
async function load(): Promise<void> {
  const r = await api.get<WatchAdminView>('/api/admin/watch')
  if (r.ok) { data.value = r.data; error.value = ''; for (const f of r.data.fixtures) scores.value[f.id] ??= { home: f.result?.home ?? 0, away: f.result?.away ?? 0 } } else error.value = r.error.reason
}
onMounted(load)
async function act(action: string, body: Record<string, unknown> = {}): Promise<void> {
  const r = await api.post<{ ok: boolean; summary?: string; reason?: string }>('/api/admin/watch', { action, ...body }, `watch:${action}:${JSON.stringify(body)}`)
  const ok = r.ok && r.data.ok !== false
  recordDone(r.ok ? (r.data.ok === false ? r.data.reason ?? 'Refused.' : r.data.summary ?? 'Done.') : r.error.reason, ok)
  if (ok) await load()
}
function startSeason(): void {
  const cities = start.value.cities.split(/[\s,]+/).filter(Boolean)
  void act('house.start', { ...(start.value.room.trim() ? { room: start.value.room.trim() } : {}), ...(cities.length ? { cities } : {}), mates: start.value.mates, now: start.value.now })
}
</script>

<template>
  <div class="adm-card" style="margin-top:12px" data-admin="watch">
    <div class="adm-row adm-between"><h3>Watch: match results, Allworld House, artists</h3><button class="adm-btn" type="button" @click="load">Refresh</button></div>
    <p v-if="error" class="adm-error" role="alert">{{ error }}</p>
    <template v-if="data">
      <h4>Match results</h4>
      <p class="adm-sub">Fixtures are added under Festivals. Type the final score after the whistle; predictions are scored once (a second save corrects it).</p>
      <table class="adm-table"><tbody>
        <tr v-for="f in data.fixtures" :key="f.id"><td><b>{{ f.title }}</b><div class="adm-sub">{{ f.id }} · {{ when(f.start) }} · {{ f.picks }} picks{{ f.result ? ` · result ${f.result.home}-${f.result.away}` : '' }}</div></td>
          <td v-if="f.teams && scores[f.id]"><input v-model.number="scores[f.id]!.home" type="number" min="0" max="20" style="width:52px"> - <input v-model.number="scores[f.id]!.away" type="number" min="0" max="20" style="width:52px">
            <button class="adm-btn" type="button" @click="act('result.save', { fixture: f.id, home: scores[f.id]!.home, away: scores[f.id]!.away })">Save result</button></td>
          <td v-else class="adm-sub">no two sides</td></tr>
      </tbody></table>

      <h4>Allworld House</h4>
      <p v-if="data.house.season" class="adm-sub">Season {{ data.house.season.number }}: {{ data.house.season.phase }}, week {{ data.house.season.week }}, room {{ data.house.season.room }}, {{ data.votes }} votes this season so far ·
        <span v-for="m in data.house.season.mates" :key="m.id">{{ m.label }}{{ m.in ? '' : ' (out)' }}; </span></p>
      <p class="adm-row">
        <label>House room (world:room:g.N, empty = the Square) <input v-model="start.room" style="width:180px"></label>
        <label>Cities <input v-model="start.cities" placeholder="lagos abuja accra" style="width:180px"></label>
        <label>Housemates <input v-model.number="start.mates" type="number" min="6" max="8" style="width:56px"></label>
        <label><input v-model="start.now" type="checkbox"> Start this week</label>
        <button class="adm-btn" type="button" @click="startSeason">Start a season</button>
        <button class="adm-btn danger" type="button" @click="act('house.stop')">Stop the season</button>
      </p>

      <h4>Artists</h4>
      <p v-if="!data.artists.length" class="adm-sub">No applications.</p>
      <table class="adm-table"><tbody>
        <tr v-for="a in data.artists" :key="a.id"><td><b>{{ a.name }}</b> · {{ a.status }}<div class="adm-sub">{{ a.about }} · <a :href="`https://youtu.be/${a.track}`" target="_blank" rel="noopener noreferrer">track</a> <span v-for="link in a.links" :key="link">· <a :href="link" target="_blank" rel="noopener noreferrer nofollow">{{ link }}</a> </span> · {{ a.id }}</div></td>
          <td><button v-if="a.status !== 'approved'" class="adm-btn" type="button" @click="act('artist.approve', { id: a.id })">Approve</button>
            <input v-model="reasons[a.id]" placeholder="reason (optional)" style="width:140px"> <button v-if="a.status !== 'declined'" class="adm-btn danger" type="button" @click="act('artist.decline', { id: a.id, reason: reasons[a.id] ?? '' })">Decline</button></td></tr>
      </tbody></table>
      <h4>Premieres</h4>
      <p v-if="!data.premieres.length" class="adm-sub">None.</p>
      <p v-for="p in data.premieres" :key="p.id" class="adm-row">{{ p.artist }} · “{{ p.title }}” · {{ when(p.start) }} · {{ p.phase }} <button class="adm-btn danger" type="button" @click="act('premiere.remove', { id: p.id })">Take down</button></p>
    </template>
  </div>
</template>
