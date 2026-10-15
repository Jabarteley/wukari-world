<script setup lang="ts">
// Pass on (docs/LEGACY.md): hand a house, cars, a shop, furniture, belongings and a share of goodwill to your own next character (at once) or
// to a friend (they must accept). Loaded when the Houses app's "Pass on" section is opened, never at first paint. The server decides every
// rule and its own sentence is shown; this only asks, shows the summary and sends the confirm with one request id per attempt.
import '../../../ui/controls.css'
import '../../../ui/panels/social.css'
import { computed, onMounted, ref } from 'vue'
import { useApp } from '../../state/app.ts'
import { call, newClientId } from '../social/useSocial.ts'
import { KINDS, confirmWords, expiryWords, includeOf, readPreview, readView } from './legacyModel.ts'
import type { LegacyKind, LegacyPreview, LegacyView } from '../../../types/legacy.ts'

const { game } = useApp()
const view = ref<LegacyView | null>(null)
const failed = ref(false), busy = ref(false)
const to = ref('')
const picked = ref<Set<LegacyKind>>(new Set())
const preview = ref<LegacyPreview | null>(null)
const receipt = ref<string[] | null>(null)
const offline = computed(() => !game.view.value.connected)
const toFriend = computed(() => !!to.value && !view.value?.heirs.some((heir) => heir.id === to.value))
const target = computed(() => view.value?.heirs.find((heir) => heir.id === to.value) ?? view.value?.friends.find((friend) => friend.id === to.value) ?? null)
const kinds = computed(() => (view.value?.kinds ?? []).filter((kind) => !(toFriend.value && kind.heirOnly)))
// One request id per attempt, kept until the server has answered: a double tap or a retry is the same request.
const ids = new Map<string, string>()
const idFor = (key: string): string => { const found = ids.get(key) ?? newClientId(); ids.set(key, found); return found }

async function load(): Promise<void> {
  const result = await call<Record<string, unknown>>('/api/world/legacy')
  failed.value = !result.ok
  if (result.ok) view.value = readView(result)
}
onMounted(() => { void load() })
function choose(): void { preview.value = null; receipt.value = null; picked.value = new Set(KINDS.filter((key) => kinds.value.some((kind) => kind.key === key && kind.lines.length))) }
function toggle(key: LegacyKind): void { const next = new Set(picked.value); if (next.has(key)) next.delete(key); else next.add(key); picked.value = next; preview.value = null }
async function check(): Promise<void> {
  if (busy.value || !to.value) return
  busy.value = true
  try { const result = await call<Record<string, unknown>>('/api/world/legacy/preview', { to: to.value, include: includeOf(picked.value, toFriend.value) }); preview.value = readPreview(result as unknown) } finally { busy.value = false }
}
/** A write with its own request id; the server's sentence is shown when it refuses. */
async function write(path: string, key: string, body: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  if (busy.value || offline.value) return null
  busy.value = true
  try {
    const result = await call<Record<string, unknown>>(path, { requestId: idFor(key), ...body })
    if (!result.ok) { if (!result.transport) ids.delete(key); game.toast(result.reason, 'error'); return null }
    ids.delete(key)
    return result
  } finally { busy.value = false }
}
async function confirm(): Promise<void> {
  const answer = await write('/api/world/legacy/pass', `pass:${to.value}:${[...picked.value].sort().join(',')}`, { to: to.value, include: includeOf(picked.value, toFriend.value) })
  if (!answer) return
  receipt.value = Array.isArray(answer.lines) ? (answer.lines as string[]) : []
  preview.value = null; to.value = ''; picked.value = new Set()
  game.toast(answer.code === 'offered' ? 'Offer sent. Nothing moves until they accept.' : 'Passed on.', 'good')
  await load(); void game.refresh()
}
async function answer(path: string, offerId: string, good: string): Promise<void> {
  const result = await write(path, `${path}:${offerId}`, { offer: offerId })
  if (!result) return
  game.toast(result.code === 'offer_void' ? String(result.reason ?? 'It could not go ahead. Nothing was passed.') : good, result.code === 'offer_void' ? 'error' : 'good')
  await load(); void game.refresh()
}
</script>

<template>
  <section class="pass-on" data-legacy="app" aria-label="Pass on">
    <p class="social-note">Pass a house, cars, a shop, furniture and a share of the goodwill you have built to your next character, or to a friend who agrees. Money, debts, land and anything you bought for real stay with you.</p>
    <p v-if="failed && !view" class="ui-error" role="alert">This could not load. <button type="button" class="social-btn" @click="load">Try again</button></p>
    <template v-if="view">
      <article v-for="offer in view.incoming" :key="offer.id" class="ui-card" data-legacy="incoming">
        <strong>{{ offer.from.name }} offers you</strong>
        <ul><li v-for="line in offer.lines" :key="line">{{ line }}</li></ul>
        <p class="ui-note">Open {{ expiryWords(offer.expires, Date.now()) }}. Nothing moves until you accept.</p>
        <button type="button" class="social-btn" :disabled="busy || offline" @click="answer('/api/world/legacy/accept', offer.id, 'Yours now.')">Accept</button>
        <button type="button" class="social-btn" :disabled="busy || offline" @click="answer('/api/world/legacy/decline', offer.id, 'Turned down.')">Decline</button>
      </article>
      <article v-if="view.outgoing" class="ui-card" data-legacy="outgoing">
        <strong>Waiting for {{ view.outgoing.to.name }}</strong>
        <ul><li v-for="line in view.outgoing.lines" :key="line">{{ line }}</li></ul>
        <p class="ui-note">Nothing has moved. It moves only if they accept, {{ expiryWords(view.outgoing.expires, Date.now()) }}.</p>
        <button type="button" class="social-btn" :disabled="busy || offline" @click="answer('/api/world/legacy/cancel', view.outgoing.id, 'Offer taken back.')">Cancel the offer</button>
      </article>
      <p v-if="receipt" class="ui-note" role="status" data-legacy="receipt">Done: {{ receipt.join(', ') || 'nothing moved' }}.</p>
      <template v-if="!view.outgoing">
        <p v-if="!view.kinds.length" class="ui-note">You have nothing to pass on yet. A bigger house, a car, a shop and furniture can all be passed on.</p>
        <form v-else class="pass-form" @submit.prevent="check">
          <label for="pass-who">Who gets it</label>
          <select id="pass-who" v-model="to" class="social-field" @change="choose">
            <option value="" disabled>Choose…</option>
            <optgroup v-if="view.heirs.length" label="My next character"><option v-for="heir in view.heirs" :key="heir.id" :value="heir.id">{{ heir.name }}</option></optgroup>
            <optgroup v-if="view.friends.length" label="A friend (they must accept)"><option v-for="friend in view.friends" :key="friend.id" :value="friend.id">{{ friend.name }}</option></optgroup>
          </select>
          <p v-if="!view.heirs.length && !view.friends.length" class="ui-note">{{ view.adult ? 'You have no other character and no friend who can receive things yet.' : 'Passing things to a friend is for players who said they are 18 or older.' }}</p>
          <fieldset v-if="to" class="pass-kinds">
            <legend>What to pass</legend>
            <label v-for="kind in kinds" :key="kind.key" class="pass-kind">
              <input type="checkbox" :checked="picked.has(kind.key)" :disabled="!kind.lines.length" @change="toggle(kind.key)">
              <span><strong>{{ kind.label }}</strong> {{ kind.lines.join(', ') }}<small v-for="stay in kind.stays" :key="stay.what" class="ui-why"> {{ stay.what }}: {{ stay.why }}</small></span>
            </label>
          </fieldset>
          <button v-if="to" type="submit" class="social-btn" :disabled="busy || offline || !picked.size">See the summary</button>
        </form>
        <section v-if="preview" class="ui-card" data-legacy="summary" aria-live="polite">
          <template v-if="preview.ok">
            <strong>{{ preview.kind === 'heir' ? `Passing to ${preview.to?.name}` : `Offering to ${preview.to?.name}` }}</strong>
            <ul><li v-for="line in preview.lines" :key="line">{{ line }}</li></ul>
            <p v-for="stay in preview.stays" :key="stay.what" class="ui-why">Stays with you: {{ stay.what }}. {{ stay.why }}</p>
            <p class="ui-note">{{ preview.kind === 'heir' ? 'This moves now and cannot be undone. Your house becomes the free starter house.' : 'Nothing moves until they accept. They can say no, and you can take it back.' }}</p>
            <button type="button" class="social-btn" :disabled="busy || offline" @click="confirm">{{ confirmWords(preview.kind ?? 'other', target?.name ?? 'them') }}</button>
          </template>
          <p v-else class="ui-why" role="alert">{{ preview.reason ?? 'That cannot be passed.' }}</p>
        </section>
      </template>
    </template>
  </section>
</template>

<style scoped>
.pass-on { margin: 8px 0; }
.pass-form { display: flex; flex-direction: column; gap: 8px; }
.pass-kinds { border: 0; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.pass-kind { display: flex; gap: 8px; align-items: flex-start; }
</style>
