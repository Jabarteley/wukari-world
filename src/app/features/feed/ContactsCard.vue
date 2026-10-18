<script setup lang="ts">
// Find friends from your contacts (server/feed/contacts.ts). Every number is normalised and hashed HERE, on the device; only the hashes
// leave it. Two people are matched only when both added their own number and each has the other's. Forget deletes everything at once.
import './feed.css'
import { onMounted, ref } from 'vue'
import { useApp } from '../../state/app.ts'
import { numbersInText, numbersInVcf, phoneHash, toE164 } from '../../../feed/phone.ts'
import type { FeedPerson } from '../../../types/feed.ts'

const { game, shell } = useApp()
type Status = { declared: boolean; found: number; adult: boolean }
const status = ref<Status | null>(null), own = ref(''), consent = ref(false), pasted = ref(''), busy = ref(false), matched = ref<FeedPerson[]>([]), waiting = ref<number | null>(null)
const toast = (t: string, tone?: 'error'): void => game.toast(t, tone === 'error' ? 'error' : 'info')
const call = async <T,>(path: string, body?: object): Promise<({ ok: true } & T) | { ok: false; reason: string }> => { try { return await game.fetchJson(path, body ? { method: 'POST', body } : undefined) } catch (e) { return { ok: false, reason: (e as { reason?: string }).reason ?? 'That did not go through.' } } }
async function load(): Promise<void> { const r = await call<Status>('/api/feed/contacts'); if (r.ok) status.value = r }
onMounted(load)
const picker = typeof navigator !== 'undefined' && 'contacts' in navigator && typeof (navigator as { contacts?: { select?: unknown } }).contacts?.select === 'function'
async function declare(): Promise<void> {
  const e164 = toE164(own.value)
  if (!e164) { toast('Use your full number, for example 0803 123 4567.', 'error'); return }
  busy.value = true; const r = await call('/api/feed/contacts/self', { hash: await phoneHash(e164), consent: consent.value }); busy.value = false
  if (r.ok) { own.value = ''; toast('Done. Your number is stored only as a code nobody can read back.'); await load() } else toast(r.reason, 'error')
}
async function send(numbers: string[]): Promise<void> {
  const hashes = [...new Set((await Promise.all(numbers.map((n) => { const e = toE164(n); return e ? phoneHash(e) : null }))).filter((h): h is string => Boolean(h)))].slice(0, 1000)
  if (!hashes.length) { toast('No phone numbers were found there.', 'error'); return }
  busy.value = true; const r = await call<{ matched: FeedPerson[]; waiting: number }>('/api/feed/contacts/match', { hashes }); busy.value = false
  if (!r.ok) { toast(r.reason, 'error'); return }
  matched.value = r.matched; waiting.value = r.waiting; await load()
}
async function pick(): Promise<void> {
  try {
    const chosen = await (navigator as unknown as { contacts: { select(p: string[], o: object): Promise<{ tel?: string[] }[]> } }).contacts.select(['tel'], { multiple: true })
    await send(chosen.flatMap((c) => c.tel ?? []))
  } catch { toast('Your contacts were not shared.', 'error') }
}
async function fromFile(event: Event): Promise<void> { const file = (event.target as HTMLInputElement).files?.[0]; (event.target as HTMLInputElement).value = ''; if (file) await send(numbersInVcf(await file.text())) }
async function forget(): Promise<void> {
  if (!confirm('Forget your number, your contacts and your matches? This cannot be undone.')) return
  const r = await call('/api/feed/contacts/forget', {}); if (r.ok) { matched.value = []; waiting.value = null; toast('Everything is forgotten.'); await load() } else toast(r.reason, 'error')
}
async function add(p: FeedPerson): Promise<void> { try { await game.fetchJson('/api/social/friends/request', { method: 'POST', body: { to: p.id, cityId: game.view.value.cityId } }); toast(`Asked ${p.name} to be your friend.`) } catch (e) { toast((e as { reason?: string }).reason ?? 'That did not go through.', 'error') } }
</script>

<template>
  <div class="feed-card feed-form" data-feed="contacts">
    <b>Find friends from your contacts</b>
    <p class="feed-note">Numbers never leave your phone: only scrambled codes do, and nothing can turn them back into numbers. You and a friend see each other only when you both have each other's number.</p>
    <p v-if="status && !status.adult" class="feed-note">This is for players confirmed as 18 or older.</p>
    <template v-else-if="status">
      <form v-if="!status.declared" class="feed-form" @submit.prevent="declare">
        <label>Your number<input v-model="own" type="tel" autocomplete="tel" placeholder="0803 123 4567"></label>
        <label class="feed-row"><input v-model="consent" type="checkbox"> Let friends who have my number find me</label>
        <button type="submit" class="social-btn is-primary" :disabled="busy || !own.trim() || !consent">Add my number</button>
      </form>
      <template v-else>
        <div class="feed-row">
          <button v-if="picker" type="button" class="social-btn is-primary" :disabled="busy" @click="pick">Choose contacts</button>
          <label class="feed-pill">Contacts file (.vcf)<input type="file" accept=".vcf,text/vcard,text/x-vcard" hidden @change="fromFile"></label>
        </div>
        <label>Or paste numbers<textarea v-model="pasted" placeholder="0803 123 4567, 0805 000 1111" /></label>
        <button type="button" class="social-btn" :disabled="busy || !pasted.trim()" @click="send(numbersInText(pasted)); pasted = ''">Look for them</button>
        <p v-if="waiting !== null" class="feed-note">{{ matched.length ? `${matched.length} found.` : 'Nobody matched yet.' }} {{ waiting }} will match when those friends add you too.</p>
        <div v-for="p in matched" :key="p.id" class="feed-row"><button type="button" class="feed-name" @click="shell.open('person', { player: p.id, name: p.name })"><b>{{ p.name }}</b></button><button type="button" class="feed-pill" @click="add(p)">Add</button></div>
        <p v-if="status.found" class="feed-note">{{ status.found }} {{ status.found === 1 ? 'person' : 'people' }} from your contacts so far (they are in People you may know).</p>
        <button type="button" class="feed-pill" @click="forget">Forget my number and contacts</button>
      </template>
    </template>
  </div>
</template>
