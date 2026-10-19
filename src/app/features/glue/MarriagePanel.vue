<script setup lang="ts">
// Marriage (docs/SOCIAL-GLUE.md "Family life"), a part of Family: two adult players, both say yes, a ceremony where both stand in the
// same place with whoever is there as guests, rings that are only for looks, a shared home each may offer, and either may end it alone.
// No money moves. There is no child arc.
import { computed, onMounted, ref, watch } from 'vue'
import { useApp } from '../../state/app.ts'
import { social } from '../social/useSocial.ts'
import { visitHome } from '../visit/visitStore.ts'
import type { FamilyLifeView } from '../../../types/glue.ts'
import type { Ring } from '../../../glue/model.ts'
import { glue, glueCall } from './glueStore.ts'

const { game, shell } = useApp()
/** Into the home your spouse shares with you, by the ordinary visit (the server lets a spouse in even while its owner is out). */
const enterHome = (id: string, name: string): Promise<boolean> => visitHome({ toast: (text, tone) => game.toast(text, tone === 'error' ? 'error' : 'info'), open: (panel, params) => shell.open(panel, params as never) }, id, name)
const me = computed(() => game.view.value.session?.id ?? '')
const view = ref<FamilyLifeView | null>(null), busy = ref(false), problem = ref<string | null>(null), asking = ref(false), ending = ref(false)
const form = ref({ to: '', ring: 'gold' as Ring })
const friends = computed(() => social.me?.friends ?? [])
async function load(): Promise<void> { const r = await glueCall<FamilyLifeView>('/api/glue/family'); if (r.ok) view.value = r; else problem.value = r.reason }
onMounted(load)
watch(() => glue.rev.family, load)
async function send(path: string, body: Record<string, unknown> = {}, done?: string): Promise<boolean> {
  busy.value = true; problem.value = null
  const r = await glueCall<{ family: FamilyLifeView }>(path, body)
  busy.value = false
  if (!r.ok) { problem.value = r.reason; return false }
  view.value = r.family
  if (done) game.toast(done)
  return true
}
const m = computed(() => view.value?.marriage ?? null)
const sharedByMe = computed(() => Boolean(m.value?.shared.includes(me.value)))
const sharedByThem = computed(() => Boolean(m.value && m.value.shared.includes(m.value.with.id)))
const since = (at: number): string => new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
</script>

<template>
  <section class="family-section" data-glue="marriage" aria-label="Marriage">
    <h3>Marriage</h3>
    <p v-if="problem" class="family-notice" role="alert">{{ problem }}</p>
    <template v-if="view">
      <article v-for="p in view.asked" :key="p.id" class="family-card">
        <h4>{{ p.with.name }} asked you to marry them</h4>
        <p>With a {{ p.ringLabel.toLowerCase() }}. Saying yes makes you engaged; the ceremony is when you are both in the same place.</p>
        <div class="family-actions">
          <button type="button" class="social-btn is-primary" :disabled="busy" @click="send('/api/glue/family/answer', { id: p.id, yes: true }, 'You said yes!')">Yes</button>
          <button type="button" class="social-btn" :disabled="busy" @click="send('/api/glue/family/answer', { id: p.id, yes: false })">No</button>
        </div>
      </article>
      <article v-if="m" class="family-card">
        <template v-if="m.state === 'married'">
          <h4>💍 Married to {{ m.with.name }}</h4>
          <p>Since {{ since(m.since ?? m.at) }}<template v-if="m.venue"> at {{ m.venue }}</template>. {{ m.ringLabel }}.</p>
          <label class="feed-row"><input type="checkbox" :checked="sharedByMe" :disabled="busy" @change="send('/api/glue/family/home', { on: ($event.target as HTMLInputElement).checked }, ($event.target as HTMLInputElement).checked ? 'Your home is now your home together.' : 'Your home is yours alone again.')"> Share my home with {{ m.with.name }} (they come in any time and can arrange it in 3D)</label>
          <button v-if="sharedByThem" type="button" class="social-btn is-primary" :disabled="busy" @click="enterHome(m.with.id, m.with.name)">Go to our home</button>
          <template v-if="!ending"><button type="button" class="social-btn" @click="ending = true">End the marriage</button></template>
          <div v-else class="family-actions" role="alertdialog" aria-label="End the marriage?">
            <p>End your marriage with {{ m.with.name }}? You do not need their agreement. Nothing is paid or split; a shared home stops being shared.</p>
            <button type="button" class="social-btn is-primary" :disabled="busy" @click="send('/api/glue/family/divorce', {}, 'Your marriage has ended.').then(() => (ending = false))">End it</button>
            <button type="button" class="social-btn" @click="ending = false">Keep it</button>
          </div>
        </template>
        <template v-else-if="m.state === 'engaged'">
          <h4>Engaged to {{ m.with.name }}</h4>
          <p>Hold the ceremony when you are both in the same place in the game: a venue, the Square or a group room. Everyone there is your guest.</p>
          <div class="family-actions">
            <button type="button" class="social-btn is-primary" :disabled="busy" data-glue="ceremony" @click="send('/api/glue/family/ceremony', {}, 'Congratulations!')">Hold the ceremony</button>
            <button type="button" class="social-btn" :disabled="busy" @click="send('/api/glue/family/withdraw', {}, 'The engagement is off.')">Call it off</button>
          </div>
        </template>
        <template v-else>
          <h4>You asked {{ m.with.name }}</h4>
          <p>Waiting for their answer.</p>
          <button type="button" class="social-btn" :disabled="busy" @click="send('/api/glue/family/withdraw', {}, 'Proposal taken back.')">Take it back</button>
        </template>
      </article>
      <template v-else>
        <button v-if="!asking" type="button" class="social-btn" @click="asking = true">Propose to a friend</button>
        <form v-else class="family-card" @submit.prevent="send('/api/glue/family/propose', { to: form.to, ring: form.ring }, 'Asked. Now we wait.').then((ok) => { if (ok) asking = false })">
          <p>Marriage is between two players who are both 18 or older and friends. They choose whether to say yes.</p>
          <label class="feed-row">Who <select v-model="form.to"><option value="">Choose a friend</option><option v-for="f in friends" :key="f.id" :value="f.id">{{ f.name }}</option></select></label>
          <label class="feed-row">Ring <select v-model="form.ring"><option v-for="r in view.rings" :key="r.id" :value="r.id">{{ r.label }}</option></select></label>
          <div class="family-actions"><button type="submit" class="social-btn is-primary" :disabled="busy || !form.to">Ask</button><button type="button" class="social-btn" @click="asking = false">Not now</button></div>
        </form>
      </template>
    </template>
  </section>
</template>

<style scoped>
.family-section{display:grid;gap:10px}
.family-card{display:grid;gap:10px;background:#fff;padding:16px;border:1px solid #dce4df;border-radius:16px;min-width:0;color:#25372f}
.family-card h4{font-size:17px;margin:2px 0}
.family-card select{width:100%;min-height:44px;font:inherit;padding:10px;border:1px solid #9daa9f;border-radius:8px;background:#fff;color:#25372f}
.family-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.family-notice{padding:12px;background:#fff4d7;border-radius:12px}
</style>
