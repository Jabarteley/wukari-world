<script setup lang="ts">
// Crews (docs/FEED.md): small groups of up to 20 with a name, a colour, a wall only members read, and one link that brings a friend straight
// in. The unit people join, before any global graph. A crew link (/c/<code>) previews in WhatsApp and lands a stranger in the crew.
import '../../../ui/controls.css'
import '../../../ui/panels/social.css'
import './feed.css'
import { computed, onMounted, ref } from 'vue'
import { useApp } from '../../state/app.ts'
import PlayerAvatar from '../social/PlayerAvatar.vue'
import PostCard from './PostCard.vue'
import { feedApi } from './feedApi.ts'
import { shareLink, whatsappUrl } from './feedShare.ts'
import { COLOURS, FEED, cleanCode } from '../../../feed/model.ts'
import type { CrewView, PostView } from '../../../types/feed.ts'

const props = defineProps<{ params?: { code?: string; crew?: string } | null }>()
const { game, shell } = useApp()
const api = feedApi((path, options) => game.fetchJson(path, options))
const crews = ref<CrewView[]>([]), current = ref<CrewView | null>(null), wall = ref<PostView[]>([]), preview = ref<CrewView | null>(null)
const name = ref(''), about = ref(''), colour = ref(COLOURS[0]?.id ?? 'gold'), code = ref(props.params?.code ?? ''), text = ref(''), busy = ref(false), now = ref(Date.now())
const toast = (t: string, tone?: 'error'): void => game.toast(t, tone === 'error' ? 'error' : 'info')
const hex = (id: string): string => COLOURS.find((c) => c.id === id)?.hex ?? '#d4a017'
async function load(): Promise<void> {
  const r = await api.me()
  if (r.ok) crews.value = r.crews
  if (props.params?.crew) { const c = crews.value.find((x) => x.id === props.params?.crew); if (c) await openCrew(c) }
  if (props.params?.code) await look()
}
onMounted(load)
async function look(): Promise<void> {
  const c = cleanCode(code.value); if (!c) { toast('A crew code is six letters.', 'error'); return }
  const r = await api.code(c)
  if (r.ok && r.kind === 'crew' && r.crew) preview.value = r.crew; else toast(r.ok ? 'That code is not a crew.' : r.reason, 'error')
}
async function join(): Promise<void> {
  const c = cleanCode(code.value); if (!c) return
  busy.value = true; const r = await api.joinCrew(c); busy.value = false
  if (!r.ok) { toast(r.reason, 'error'); return }
  preview.value = null; code.value = ''; toast(`You joined ${r.crew.name}.`); await load(); await openCrew(r.crew)
}
async function create(): Promise<void> {
  busy.value = true; const r = await api.createCrew({ name: name.value, colour: colour.value, about: about.value }); busy.value = false
  if (!r.ok) { toast(r.reason, 'error'); return }
  name.value = ''; about.value = ''; await load(); await openCrew(r.crew); toast('Your crew is ready. Share the link.')
}
async function openCrew(c: CrewView): Promise<void> {
  current.value = c
  const r = await api.crewWall(c.id); if (r.ok) wall.value = r.posts
}
async function post(): Promise<void> {
  if (!current.value || !text.value.trim()) return
  busy.value = true; const r = await api.post({ body: text.value, vis: 'crew', crew: current.value.id }); busy.value = false
  if (!r.ok) { toast(r.reason, 'error'); return }
  text.value = ''; wall.value = [r.post, ...wall.value]
}
async function leave(member?: string): Promise<void> {
  if (!current.value) return
  if (!confirm(member ? 'Ask them to leave the crew? They cannot rejoin for a week.' : 'Leave this crew?')) return
  const r = await api.leaveCrew(current.value.id, member)
  if (!r.ok) { toast(r.reason, 'error'); return }
  if (!member) { current.value = null; await load() } else { const again = await api.crew(current.value.id); if (again.ok) current.value = again.crew }
}
const link = computed(() => (current.value?.code ? `/c/${current.value.code}` : ''))
async function share(): Promise<void> { if (current.value && (await shareLink(link.value, `Join ${current.value.name}, my crew on Allworld`)) === 'copied') toast('Link copied.') }
const hangOut = (): void => { shell.open('places') }
</script>

<template>
  <section class="feed" aria-label="Crews" data-feed="crews">
    <template v-if="current">
      <button type="button" class="feed-pill" @click="current = null">← All crews</button>
      <div class="feed-card">
        <div class="feed-head"><span class="feed-crew-chip"><i :style="{ background: hex(current.colour) }" />{{ current.name }}</span><span class="feed-note">{{ current.size }} / {{ FEED.crew.size }}</span></div>
        <p v-if="current.about" class="feed-body">{{ current.about }}</p>
        <div class="feed-strip" style="margin-top:8px">
          <button v-for="m in current.members" :key="m.id" type="button" class="feed-person" @click="shell.open('person', { player: m.id, name: m.name })">
            <PlayerAvatar :name="m.name" :seed="m.id" /><b>{{ m.name }}</b><small v-if="m.id === current.owner.id">Founder</small><small v-if="m.ai">AI-played</small>
            <span v-if="current.owned && m.id !== current.owner.id" class="feed-pill" role="button" @click.stop="leave(m.id)">Remove</span>
          </button>
        </div>
        <div class="feed-row" style="margin-top:8px">
          <button type="button" class="social-btn is-primary" @click="share">Invite with the link</button>
          <a class="feed-pill" :href="whatsappUrl(link, `Join ${current.name}, my crew on Allworld`)" target="_blank" rel="noopener">WhatsApp</a>
          <button type="button" class="feed-pill" @click="hangOut">Hang out in a room</button>
          <button type="button" class="feed-pill" @click="leave()">Leave</button>
        </div>
      </div>
      <form class="feed-card feed-compose" @submit.prevent="post">
        <textarea v-model="text" :maxlength="FEED.body" placeholder="Say something to the crew" aria-label="Post to the crew" />
        <button type="submit" class="social-btn is-primary" :disabled="busy || !text.trim()">Post to the crew</button>
      </form>
      <p v-if="!wall.length" class="feed-note">The wall is empty. Only members see it.</p>
      <PostCard v-for="p in wall" :key="p.id" :post="p" :api="api" :now="now" @changed="(x) => (wall = wall.map((q) => (q.id === x.id ? x : q)))" @removed="(id) => (wall = wall.filter((q) => q.id !== id))" @person="(id, n) => shell.open('person', { player: id, name: n })" @toast="toast" />
    </template>

    <template v-else>
      <p class="social-note">A crew is your people: up to {{ FEED.crew.size }}, one link to join, a wall only you see.</p>
      <ul v-if="crews.length" class="social-list">
        <li v-for="c in crews" :key="c.id" class="social-row">
          <span class="feed-crew-chip"><i :style="{ background: hex(c.colour) }" />{{ c.name }}</span>
          <div><small>{{ c.size }} member{{ c.size === 1 ? '' : 's' }}</small></div>
          <span class="social-actions"><button type="button" class="social-btn" @click="openCrew(c)">Open</button></span>
        </li>
      </ul>
      <form class="feed-card feed-form" @submit.prevent="preview ? join() : look()">
        <b>Join a crew</b>
        <label>Code<input v-model="code" maxlength="8" placeholder="ABCDEF" autocapitalize="characters"></label>
        <div v-if="preview" class="feed-embed"><b>{{ preview.name }}</b><small>{{ preview.size }} members · founded by {{ preview.owner.name }}</small><small v-if="preview.about">{{ preview.about }}</small></div>
        <button type="submit" class="social-btn is-primary" :disabled="busy || !code.trim()">{{ preview ? `Join ${preview.name}` : 'Look it up' }}</button>
      </form>
      <form class="feed-card feed-form" @submit.prevent="create">
        <b>Start a crew</b>
        <label>Name<input v-model="name" :maxlength="FEED.crew.nameMax" placeholder="Yaba Ballers"></label>
        <label>About<input v-model="about" :maxlength="FEED.crew.about" placeholder="Football on Saturdays"></label>
        <label>Colour<select v-model="colour"><option v-for="c in COLOURS" :key="c.id" :value="c.id">{{ c.label }}</option></select></label>
        <button type="submit" class="social-btn" :disabled="busy || name.trim().length < FEED.crew.nameMin">Start the crew</button>
      </form>
    </template>
  </section>
</template>
