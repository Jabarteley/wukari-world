<script setup lang="ts">
// One compact card after shared play: for each person you are not yet friends with, "Add as friend"; once friends, "Send a small gift" and
// "Invite to your room". Dismissible, never a modal. It is drawn after a table game's result (inline) and after five minutes together in
// room voice (floating). Everything goes through the routes that already exist and are checked by the server as ever: the friend request
// (POST /api/social/friends/request), the gift (POST /api/social/transfers, a small game-naira amount, friends only, under the usual
// limits) and the invitation (POST /api/social/visit/invite, friends only). An AI-played character is offered like anyone, always marked.
// Loaded lazily (defineAsyncComponent) so none of it is in the first download.
import { computed, reactive } from 'vue'
import type { FriendOffer } from '../../../types/growth.ts'
import BaseButton from '../../ui/BaseButton.vue'
import AiTag from './AiTag.vue'
import { CARD_TITLE, GIFT_AMOUNT, LATER, addedLine, cardLine, giftLabel } from './friendOfferModel.ts'
import { useApp } from '../../state/app.ts'
import { useSocial } from './useSocial.ts'

const props = defineProps<{ people: FriendOffer[]; source: 'table' | 'voice'; floating?: boolean }>()
const emit = defineEmits<{ close: [asked: string[]] }>()
const client = useSocial()
const { game } = useApp()
/** Per person: what has been done on this card. */
const rows = reactive<Record<string, { friend: boolean; line: string; busy: boolean; gifted: boolean; invited: boolean }>>({})
const row = (id: string) => (rows[id] ??= { friend: false, line: '', busy: false, gifted: false, invited: false })
const shown = computed(() => props.people.slice(0, 3))
const more = computed(() => props.people.length - shown.value.length)

async function add(person: FriendOffer): Promise<void> {
  const r = row(person.id)
  if (r.busy) return
  r.busy = true
  const result = await client.perform<{ code: string }>('/api/social/friends/request', { to: person.id, cityId: client.cityId() }, null)
  r.busy = false
  if (!result.ok) return
  r.friend = result.code === 'accepted' || result.code === 'already_friends'
  r.line = addedLine(result.code)
}
async function gift(person: FriendOffer): Promise<void> {
  const r = row(person.id)
  if (r.busy || r.gifted) return
  r.busy = true
  const result = await client.perform('/api/social/transfers', { to: person.id, amount: GIFT_AMOUNT, cityId: client.cityId(), clientId: client.newClientId() }, `Sent ${person.name} a small gift`)
  r.busy = false
  if (result.ok) { r.gifted = true; client.refreshLife() }
}
async function invite(person: FriendOffer): Promise<void> {
  const r = row(person.id)
  if (r.busy || r.invited) return
  r.busy = true
  const done = await import('../visit/visitStore.ts').then((module) => module.inviteOver([person.id]))
  r.busy = false
  r.invited = done.ok
  game.toast(done.words, done.ok ? 'good' : 'error')
}
const close = (): void => emit('close', props.people.filter((person) => !row(person.id).friend && !row(person.id).line).map((person) => person.id))
</script>

<template>
  <section class="fo-card" :class="{ 'is-floating': floating }" aria-label="Stay in touch" data-friend-offer>
    <header class="fo-head">
      <b>{{ CARD_TITLE[source] }}</b>
      <button type="button" class="fo-x" aria-label="Close" @click="close">×</button>
    </header>
    <p class="fo-line">{{ cardLine(source, shown) }}</p>
    <ul class="fo-list">
      <li v-for="person in shown" :key="person.id" class="fo-row">
        <span class="fo-name">{{ person.name }}<AiTag v-if="person.ai" :who="{ agent: true }" /></span>
        <span class="fo-acts">
          <span v-if="row(person.id).line && !row(person.id).friend" class="fo-done" role="status">{{ row(person.id).line }}</span>
          <BaseButton v-else-if="!row(person.id).friend" small variant="primary" :disabled="row(person.id).busy" @click="add(person)">{{ person.incoming ? 'Accept' : 'Add as friend' }}</BaseButton>
          <template v-else>
            <BaseButton small :disabled="row(person.id).busy || row(person.id).gifted" @click="gift(person)">{{ row(person.id).gifted ? 'Gift sent' : giftLabel(GIFT_AMOUNT) }}</BaseButton>
            <BaseButton small :disabled="row(person.id).busy || row(person.id).invited" @click="invite(person)">{{ row(person.id).invited ? 'Invited' : 'Invite to your room' }}</BaseButton>
          </template>
        </span>
      </li>
    </ul>
    <p v-if="more > 0" class="gr-note">and {{ more }} more</p>
    <footer class="fo-foot"><span class="gr-note">{{ LATER }}</span><BaseButton small @click="close">Not now</BaseButton></footer>
  </section>
</template>

<style scoped>
.fo-card { display: grid; gap: 8px; padding: 12px 14px; border-radius: var(--r-md, 12px); background: var(--c-card, #fff); box-shadow: var(--shadow-sm, 0 1px 6px rgba(0,0,0,.12)); }
.fo-card.is-floating { position: fixed; z-index: 40; left: 50%; bottom: 84px; transform: translateX(-50%); width: min(92vw, 380px); box-shadow: 0 6px 24px rgba(0,0,0,.25); }
.fo-head { display: flex; justify-content: space-between; align-items: center; }
.fo-x { border: 0; background: none; font-size: 22px; line-height: 1; cursor: pointer; min-width: 32px; min-height: 32px; }
.fo-line { margin: 0; }
.fo-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.fo-row { display: grid; gap: 6px; }
.fo-name { font-weight: 650; }
.fo-acts { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.fo-done { color: var(--c-green-dark, #1f6f43); font-weight: 650; }
.fo-foot { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
</style>
