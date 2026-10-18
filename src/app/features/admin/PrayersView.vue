<script setup lang="ts">
// Prayers: what residents and players asked for, newest first, with filters, and the acts that can answer. The words of a prayer are read-only;
// an act is checked and written to the log by the server (docs/PRAYERS.md). The person meets only what the act did in their world, never a message
// from the owner. Money here is game money only.
import { computed, onMounted, reactive, ref } from 'vue'
import { useAdmin } from './useAdmin.ts'
import { absolute, relative } from './adminModel.ts'
import { recordDone } from './adminUi.ts'

interface Prayer { n: number; at: number; by: 'resident' | 'player'; who: string; name: string; city: string; venue: string | null; text: string; situation: string; minor?: true; answered?: { at: number; act: string; line: number } }
interface Line { n: number; at: number; adminName: string; kind: string; targetKind: string; target: string; targetName: string; city: string; prayer: number | null; summary: string; reason: string; gist: number | null }
interface Page { items: Prayer[]; total: number; unanswered: number; next: number | null; log: { lines: Line[]; total: number }; acts: string[]; skies: string[]; notice: string; limits: { blessMax: number; moneyMax: number; weatherHoursMax: number; dreamMax: number; sickGapDays: number } }

const api = useAdmin()
const f = reactive({ by: '', city: '', answered: '' })
const page = ref<Page | null>(null), items = ref<Prayer[]>([]), error = ref(''), busy = ref(false)
async function load(more = false): Promise<void> {
  const r = await api.get<Page>('/api/admin/prayers', { by: f.by, city: f.city.trim().toLowerCase(), answered: f.answered, before: more && items.value.length ? items.value[items.value.length - 1]!.n : undefined })
  if (!r.ok) { error.value = r.error.reason; return }
  page.value = r.data; items.value = more ? [...items.value, ...r.data.items] : r.data.items; error.value = ''
}
onMounted(() => { void load() })

const WORDS: Record<string, string> = { heal: 'Heal', sicken: 'An illness', give: 'Give game money', take: 'Take game money', bless: 'Bless a stall for a day', weather: 'Weather over a city', dream: 'A dream or a sign', cross: 'Cross two paths', silence: 'Silence' }
const act = reactive({ kind: 'heal', prayer: 0, target: '', other: '', city: '', venue: '', amount: 500, hours: 3, sky: 'rain', text: '', form: 'dream', reason: '' })
const current = computed(() => items.value.find((item) => item.n === act.prayer) ?? null)
function answer(item: Prayer): void { act.prayer = item.n; act.target = item.who; act.city = item.city; act.reason = ''; out.value = null }
const out = ref<{ ok: boolean; text: string } | null>(null)
const needs = (...kinds: string[]): boolean => kinds.includes(act.kind)
async function take(): Promise<void> {
  busy.value = true
  const body: Record<string, unknown> = { kind: act.kind, reason: act.reason, ...(act.prayer ? { prayer: act.prayer } : {}), ...(act.target ? { target: act.target.trim() } : {}) }
  if (needs('cross')) Object.assign(body, { other: act.other.trim(), venue: act.venue.trim() })
  if (needs('give', 'take', 'bless')) body.amount = Number(act.amount)
  if (needs('weather')) Object.assign(body, { city: act.city.trim(), sky: act.sky, hours: Number(act.hours) })
  if (needs('dream')) Object.assign(body, { text: act.text, form: act.form })
  const r = await api.post<{ ok: boolean; summary: string }>('/api/admin/prayers/act', body, `prayer-act:${JSON.stringify(body)}`)
  busy.value = false
  out.value = r.ok ? { ok: true, text: r.data.summary } : { ok: false, text: r.error.reason }
  recordDone(out.value.text, out.value.ok)
  if (r.ok) { act.reason = ''; act.prayer = 0; await load() }
}
</script>

<template>
  <section aria-label="Prayers">
    <div class="adm-card">
      <h3>Prayers</h3>
      <p class="adm-sub">Read by the people who run Allworld. {{ page ? `${page.total} kept, ${page.unanswered} not answered.` : '' }} A resident or player never receives a message from here: an act shows up in their world, and a line may appear in the gist.</p>
      <div class="adm-row">
        <label>From<select v-model="f.by" @change="load()"><option value="">Anyone</option><option value="resident">Residents</option><option value="player">Players</option></select></label>
        <label>City<input v-model="f.city" placeholder="lagos" @change="load()"></label>
        <label>Answered<select v-model="f.answered" @change="load()"><option value="">Both</option><option value="no">Not yet</option><option value="yes">Answered</option></select></label>
      </div>
      <p v-if="error" class="adm-error" role="alert">{{ error }}</p>
      <p v-if="page && !items.length" class="adm-muted">No prayers match.</p>
      <table v-else class="adm-table adm-stack"><thead><tr><th>When</th><th>Who</th><th>Prayer</th><th>Situation</th><th></th></tr></thead><tbody>
        <tr v-for="item in items" :key="item.n">
          <td class="adm-when" :title="absolute(item.at)">{{ relative(item.at, api.now()) }}</td>
          <td><b>{{ item.name }}</b><div class="adm-sub">{{ item.by }} · {{ item.city || 'no city' }}<template v-if="item.minor"> · under 18</template></div></td>
          <td class="adm-grow">{{ item.text }}</td>
          <td class="adm-sub" data-label="Situation">{{ item.situation }}</td>
          <td><span v-if="item.answered" class="adm-sub">{{ WORDS[item.answered.act] ?? item.answered.act }} (act {{ item.answered.line }})</span><button v-else class="adm-btn" @click="answer(item)">Answer</button></td>
        </tr>
      </tbody></table>
      <button v-if="page?.next" class="adm-btn" @click="load(true)">More</button>
    </div>

    <div class="adm-card" style="margin-top:12px">
      <h3>Take an act</h3>
      <p v-if="current" class="adm-sub">Answering prayer {{ current.n }} from {{ current.name }}: “{{ current.text }}” <a href="#" @click.prevent="act.prayer = 0">(not for a prayer)</a></p>
      <div class="adm-row prayer-act-fields">
        <label>Act<select v-model="act.kind"><option v-for="kind in page?.acts ?? []" :key="kind" :value="kind">{{ WORDS[kind] ?? kind }}</option></select></label>
        <label v-if="!needs('weather', 'silence')">Person (player id, or resident id)<input v-model="act.target" autocomplete="off"></label>
        <label v-if="needs('cross')">The other person<input v-model="act.other" autocomplete="off"></label>
        <label v-if="needs('cross')">Place (venue id)<input v-model="act.venue" autocomplete="off"></label>
        <label v-if="needs('give', 'take')">₦ game money (most {{ page?.limits.moneyMax }})<input v-model.number="act.amount" type="number" min="1"></label>
        <label v-if="needs('bless')">₦ into the till (most {{ page?.limits.blessMax }})<input v-model.number="act.amount" type="number" min="1" :max="page?.limits.blessMax"></label>
        <template v-if="needs('weather')">
          <label>City<input v-model="act.city" placeholder="ibadan"></label>
          <label>Sky<select v-model="act.sky"><option v-for="sky in page?.skies ?? []" :key="sky" :value="sky">{{ sky }}</option></select></label>
          <label>Hours (1 to {{ page?.limits.weatherHoursMax }})<input v-model.number="act.hours" type="number" min="1" :max="page?.limits.weatherHoursMax"></label>
        </template>
        <template v-if="needs('dream')">
          <label>As<select v-model="act.form"><option value="dream">a dream</option><option value="sign">a sign</option></select></label>
          <label>The line, gently (most {{ page?.limits.dreamMax }})<input v-model="act.text" :maxlength="page?.limits.dreamMax ?? 140"></label>
        </template>
        <label>Reason (kept in the log)<input v-model="act.reason" maxlength="200"></label>
      </div>
      <p class="adm-sub"><template v-if="act.kind === 'sicken'">Once a week at most, never on a minor. </template><template v-if="act.kind === 'give' || act.kind === 'take'">Game money through the wallet and the admin limits; never real money. </template>A line may appear in the gist; no names unless the person is a confirmed adult and the line is kind.</p>
      <p><button class="adm-btn primary" :disabled="busy || act.reason.trim().length < 3" @click="take">Do it</button></p>
      <p v-if="out" :class="out.ok ? 'adm-ok' : 'adm-error'" role="status">{{ out.text }}</p>
    </div>

    <div class="adm-card" style="margin-top:12px">
      <h3>The log of acts</h3>
      <p class="adm-sub">Append-only: who, when, what, target, reason. {{ page?.log.total ?? 0 }} in all.</p>
      <p v-if="page && !page.log.lines.length" class="adm-muted">Nothing yet.</p>
      <table v-else class="adm-table adm-stack"><thead><tr><th>#</th><th>When</th><th>Who</th><th>What</th><th>Target</th><th>Reason</th></tr></thead><tbody>
        <tr v-for="line in page?.log.lines ?? []" :key="line.n">
          <td class="adm-hide-sm">{{ line.n }}</td><td class="adm-when" :title="absolute(line.at)">{{ relative(line.at, api.now()) }}</td><td data-label="Who">{{ line.adminName }}</td>
          <td><b>{{ WORDS[line.kind] ?? line.kind }}</b><div class="adm-sub">{{ line.summary }}<template v-if="line.prayer"> · prayer {{ line.prayer }}</template><template v-if="line.gist"> · gist {{ line.gist }}</template></div></td>
          <td data-label="Target">{{ line.targetName }}<div class="adm-sub">{{ line.targetKind }}{{ line.city ? ` · ${line.city}` : '' }}</div></td><td class="adm-grow" data-label="Reason">{{ line.reason }}</td>
        </tr>
      </tbody></table>
    </div>
  </section>
</template>

<style scoped>
.prayer-act-fields > label { flex: 1 1 200px; min-width: 0; }
.prayer-act-fields > label > input,
.prayer-act-fields > label > select { box-sizing: border-box; width: 100%; min-width: 0; }
</style>
