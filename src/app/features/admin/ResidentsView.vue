<script setup lang="ts">
// The residents' voice (docs/RESIDENTS.md Phase 13c): the five wishes and needs asked for most, their president and this week's election, the
// Sunday letters "to the Founders", and a box to answer. An answer reaches the world as news or a decree (a line in the gist, and word the
// residents hear in their next thoughts); it is never a message to a person. Every number is the server's.
import { onMounted, reactive, ref } from 'vue'
import { useAdmin } from './useAdmin.ts'
import { absolute, relative } from './adminModel.ts'
import { recordDone } from './adminUi.ts'

interface Cluster { text: string; count: number; by: string[]; cities: string[]; why: string[] }
interface Letter { week: number; at: number; by: { id: string; name: string; city: string }; caretaker: boolean; text: string; source: 'model' | 'rules'; wishes: string[]; needs: string[] }
interface Reply { n: number; at: number; kind: 'news' | 'decree'; text: string; admin: string; gist: number | null; letter: number | null }
interface Page {
  on: boolean; residents: number; replyMax: number; sunday: boolean; nextLetterDue: boolean
  today: { wishes: Cluster[]; needs: Cluster[] }; week: { wishes: Cluster[]; needs: Cluster[] }
  days: { day: number; wishes: Cluster[]; needs: Cluster[] }[]
  assembly: { week: number; phase: string; endsAt: number; candidates: { id: string; name: string; slogan: string; votes: number }[]; votes: number }
  president: { id: string; name: string; city: string; caretaker: boolean } | null
  letters: Letter[]; replies: Reply[]
}
const api = useAdmin()
const page = ref<Page | null>(null), error = ref(''), busy = ref(false), out = ref<{ ok: boolean; text: string } | null>(null)
const form = reactive({ text: '', kind: 'news' as 'news' | 'decree', letter: 0 })
async function load(): Promise<void> {
  const r = await api.get<Page>('/api/admin/residents')
  if (!r.ok) { error.value = r.error.reason; return }
  page.value = r.data; error.value = ''
}
onMounted(() => { void load() })
async function send(): Promise<void> {
  busy.value = true
  const body: Record<string, unknown> = { text: form.text, kind: form.kind, ...(form.letter ? { letter: form.letter } : {}) }
  const r = await api.post<{ ok: boolean; summary: string }>('/api/admin/residents/reply', body, `residents-reply:${JSON.stringify(body)}`)
  busy.value = false
  out.value = r.ok ? { ok: true, text: r.data.summary } : { ok: false, text: r.error.reason }
  recordDone(out.value.text, out.value.ok)
  if (r.ok) { form.text = ''; form.letter = 0; await load() }
}
</script>

<template>
  <section aria-label="Residents">
    <div class="adm-card">
      <h3>What the residents ask for</h3>
      <p class="adm-sub">{{ page?.on ? `${page.residents} switched on.` : 'Residents are off.' }} Each night a resident may name one wish and one need. Similar ones are merged; the five asked for most are kept every day. They are proposals: you choose what is built.</p>
      <p v-if="error" class="adm-error" role="alert">{{ error }}</p>
      <div class="adm-two">
        <div>
          <h4>Wishes today</h4>
          <p v-if="page && !page.today.wishes.length" class="adm-muted">None yet today.</p>
          <ol><li v-for="item in page?.today.wishes ?? []" :key="item.text"><b>{{ item.text }}</b> ({{ item.count }})<div class="adm-sub">{{ item.by.join(', ') }} · {{ item.cities.join(', ') }}<template v-if="item.why.length > 1"> · also: {{ item.why.slice(1).join(' / ') }}</template></div></li></ol>
        </div>
        <div>
          <h4>Needs today</h4>
          <p v-if="page && !page.today.needs.length" class="adm-muted">None yet today.</p>
          <ol><li v-for="item in page?.today.needs ?? []" :key="item.text"><b>{{ item.text }}</b> ({{ item.count }})<div class="adm-sub">{{ item.by.join(', ') }} · {{ item.cities.join(', ') }}<template v-if="item.why.length > 1"> · also: {{ item.why.slice(1).join(' / ') }}</template></div></li></ol>
        </div>
      </div>
      <details><summary>The week so far</summary>
        <div class="adm-two">
          <ol><li v-for="item in page?.week.wishes ?? []" :key="item.text">{{ item.text }} ({{ item.count }})</li></ol>
          <ol><li v-for="item in page?.week.needs ?? []" :key="item.text">{{ item.text }} ({{ item.count }})</li></ol>
        </div>
      </details>
    </div>

    <div class="adm-card" style="margin-top:12px">
      <h3>Their president</h3>
      <p v-if="page?.president"><b>{{ page.president.name }}</b> ({{ page.president.city }})<template v-if="page.president.caretaker"> · caretaker until the vote is counted</template></p>
      <p v-else class="adm-muted">No president yet.</p>
      <p v-if="page" class="adm-sub">This week's election: {{ page.assembly.phase }}, ends {{ absolute(page.assembly.endsAt) }}. {{ page.assembly.votes }} votes among {{ page.assembly.candidates.length }} standing.</p>
      <ul v-if="page?.assembly.candidates.length"><li v-for="c in page.assembly.candidates" :key="c.id">{{ c.name }}: {{ c.votes }} <span class="adm-sub">“{{ c.slogan }}”</span></li></ul>
    </div>

    <div class="adm-card" style="margin-top:12px">
      <h3>Letters to the Founders</h3>
      <p class="adm-sub">One each Sunday (Lagos time) from the president. {{ page?.sunday && page.nextLetterDue ? 'Today is Sunday: this week\'s letter is due.' : '' }}</p>
      <p v-if="page && !page.letters.length" class="adm-muted">No letter yet.</p>
      <article v-for="letter in page?.letters ?? []" :key="letter.week" class="adm-sub" style="margin-bottom:12px">
        <b>{{ letter.by.name }}</b> · <span :title="absolute(letter.at)">{{ relative(letter.at, api.now()) }}</span> · {{ letter.source === 'model' ? 'in their own words' : 'written by the rules (the model did not answer)' }}
        <p style="white-space:pre-wrap;margin:4px 0">{{ letter.text }}</p>
        <button class="adm-btn" @click="form.letter = letter.week">Answer this letter</button>
      </article>
    </div>

    <div class="adm-card" style="margin-top:12px">
      <h3>Answer the residents</h3>
      <p v-if="form.letter" class="adm-sub">Answering the letter of week {{ form.letter }}. <a href="#" @click.prevent="form.letter = 0">(not for a letter)</a></p>
      <div class="adm-row">
        <label>As<select v-model="form.kind"><option value="news">news</option><option value="decree">a decree</option></select></label>
        <label style="flex:1">Your words (at most {{ page?.replyMax ?? 400 }})<textarea v-model="form.text" rows="3" :maxlength="page?.replyMax ?? 400" style="width:100%"></textarea></label>
      </div>
      <p class="adm-sub">It appears in the gist and the residents hear it as news from the Founders in the next days. It is never a message to a person. Speak in the world's own terms: no game, player, AI or model, no money asks, no links.</p>
      <p><button class="adm-btn primary" :disabled="busy || form.text.trim().length < 5" @click="send">Send</button></p>
      <p v-if="out" :class="out.ok ? 'adm-ok' : 'adm-error'" role="status">{{ out.text }}</p>
      <h4>Sent</h4>
      <p v-if="page && !page.replies.length" class="adm-muted">Nothing sent yet.</p>
      <ul><li v-for="reply in page?.replies ?? []" :key="reply.n"><span class="adm-sub">{{ reply.kind }} · {{ relative(reply.at, api.now()) }}<template v-if="reply.gist"> · gist {{ reply.gist }}</template></span> {{ reply.text }}</li></ul>
    </div>
  </section>
</template>
