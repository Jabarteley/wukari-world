<script setup lang="ts">
// The location badge (docs/FEED.md): optional. The device checks which city, and which local government of it, it is in (locateCity.ts,
// fetched only when pressed); the position never leaves it. Only after "Show it" are the city id (and the local government's id) sent;
// the server adds whether the network's country agreed. "City only" sends the city without the local government.
import './feed.css'
import { ref } from 'vue'
import { useApp } from '../../state/app.ts'
import { LOCATED, badgePlaceText } from '../../../feed/model.ts'
import type { ProfileView } from '../../../types/feed.ts'

const props = defineProps<{ located?: ProfileView['located'] }>()
const emit = defineEmits<{ changed: [profile: ProfileView] }>()
const { game } = useApp()
const busy = ref(false), found = ref<{ city: string; name: string; lga?: string; lgaName?: string } | null>(null), line = ref('')
const toast = (t: string, tone?: 'error'): void => game.toast(t, tone === 'error' ? 'error' : 'info')
async function send(body: object): Promise<void> {
  busy.value = true
  let r: { ok: true; profile: ProfileView } | { ok: false; reason: string }
  try { r = await game.fetchJson('/api/feed/located', { method: 'POST', body }) } catch (e) { r = { ok: false, reason: (e as { reason?: string }).reason ?? 'That did not go through.' } }
  busy.value = false
  if (!r.ok) { toast(r.reason, 'error'); return }
  found.value = null; emit('changed', r.profile)
  toast(r.profile.located ? `Your profile now shows: in ${badgePlaceText(r.profile.located)}.` : 'The badge is off.')
}
async function check(): Promise<void> {
  busy.value = true; line.value = ''
  const { locateCity } = await import('./locateCity.ts')
  const r = await locateCity()
  busy.value = false
  if (r.kind === 'found') found.value = { city: r.city, name: r.name, ...(r.lga && r.lgaName ? { lga: r.lga, lgaName: r.lgaName } : {}) }
  else line.value = r.line
}
</script>

<template>
  <div class="feed-card feed-form" data-feed="located">
    <b>Location badge</b>
    <template v-if="props.located && !found">
      <p class="feed-body">📍 In {{ badgePlaceText(props.located) }} · confirmed by your device<template v-if="props.located.net"> and network</template></p>
      <p class="feed-note">Everyone who sees your profile sees {{ props.located.lgaName ? 'the area and the city' : 'the city' }}, nothing more. It lasts {{ LOCATED.days }} days. Some communities are only for people with a badge in their place.</p>
      <div class="feed-row"><button type="button" class="social-btn" :disabled="busy" @click="check">Check again</button><button type="button" class="feed-pill" :disabled="busy" @click="send({ on: false })">Remove</button></div>
    </template>
    <template v-else-if="found">
      <p class="feed-body">Your device says you are in <b>{{ badgePlaceText(found) }}</b>.</p>
      <p class="feed-note"><b>{{ badgePlaceText(found) }}</b> — show it? Only {{ found.lgaName ? 'the area and the city are' : 'the city is' }} sent, never where you are in it. People near you see your posts first in Near you.</p>
      <div class="feed-row"><button type="button" class="social-btn is-primary" :disabled="busy" @click="send({ city: found.city, ...(found.lga ? { lga: found.lga } : {}) })">Show it</button><button v-if="found.lga" type="button" class="feed-pill" :disabled="busy" @click="send({ city: found.city })">City only</button><button type="button" class="feed-pill" @click="found = null">Not now</button></div>
    </template>
    <template v-else>
      <p class="feed-note">Optional. Let your phone confirm which city you are in, and get a badge on your profile. It also lets you join, or start, communities kept for people in a place. Your position is checked on this device and never sent or kept.</p>
      <button type="button" class="social-btn" :disabled="busy" @click="check">{{ busy ? 'Checking…' : 'Check where I am' }}</button>
    </template>
    <p v-if="line" class="feed-note" role="status">{{ line }}</p>
  </div>
</template>
