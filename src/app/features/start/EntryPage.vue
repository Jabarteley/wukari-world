<script setup lang="ts">
// THE ENTRY PAGE — what a first-time visitor sees before the character creator: the world behind, and one compact card (a bottom
// sheet on a phone). "Play now" is the one-tap guest start (a random look, a suggested name: entryPlay.ts); "Sign up free" and
// "Log in" are the existing sheets; "Make my character first" opens the creator, unchanged. The backdrop is a pre-rendered picture
// of the game's own scenes, asked for after the first paint (nothing 3D is loaded here); the live count is the public
// GET /api/world/pulse/online. Returning players never reach this: the quick-start gate only opens for a device with no life.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { CITY_CATALOGUE } from '../../../game/cities/catalogue.ts'
import { loadCityContent } from '../../../game/cities/registry.ts'
import { qs } from './quickStartState.ts'
import { useApp } from '../../state/app.ts'
import GameIcon from '../../ui/GameIcon.vue'
import BonusLine from '../bonus/BonusLine.vue'
import { invitedWords, inviterName } from '../growth/inviterLookup.ts'
import { useAccountEntry } from './accountEntry.ts'
import AgentSheet from './AgentSheet.vue'
import { ENTRY_LEAD, ENTRY_TILES, SOURCE_URL, entryPitch, liveLine, worldFigures } from './entryModel.ts'
import { invitedNow, playFromEntry } from './entryPlay.ts'
import { firstLanding, pendingRef, track } from './startBoundary.ts'
import type { CityFind } from './findCity.ts'

const emit = defineEmits<{ creator: [] }>()
const { game, shell } = useApp()
const view = game.view
const account = useAccountEntry('entry')
const figures = worldFigures(CITY_CATALOGUE)
const online = ref<number | null>(null)
const line = computed(() => liveLine(online.value, figures))
const pitch = entryPitch(figures.cities)
const invited = invitedNow()
const inviter = ref<string | null>(null)
const invitedNote = computed(() => invitedWords(inviter.value))
const sending = ref(false)
const agentOpen = ref(false)
const art = ref('')
const finding = ref(false)
const found = ref<CityFind | null>(null)
const root = ref<HTMLElement | null>(null)
let poll: ReturnType<typeof setInterval> | null = null

function play(city: string | null = null): void {
  if (sending.value) return
  sending.value = playFromEntry({ shell, viewName: view.value.name }, city)
}
async function startIn(city: string): Promise<void> {
  try { await loadCityContent(city); (await import('../paths/intent.ts')).markLanding() } catch { play(null); return }
  play(city)
}
async function find(): Promise<void> {
  finding.value = true
  try { found.value = await (await import('./findCity.ts')).findCity() } finally { finding.value = false }
}
/** The creator's code is asked for when the visitor shows interest in it, so it is ready by the time the link is pressed. */
function warmCreator(): void {
  void import('./CreatorApp.vue').catch(() => undefined)
  void import('./lookPreview.ts').then((module) => module.warmLookPreview()).catch(() => undefined)
}
function openCreator(): void { track('entry_creator'); emit('creator') }
function openAgent(): void { track('entry_agent'); agentOpen.value = true }

async function loadOnline(): Promise<void> {
  if (document.visibilityState === 'hidden') return
  try {
    const answer = await game.fetchJson<{ online?: unknown }>('/api/world/pulse/online')
    online.value = typeof answer.online === 'number' && answer.online > 0 ? Math.floor(answer.online) : null
  } catch { /* no number is shown: the pill still says what is open */ }
}
/** The backdrop: one of two pictures, asked for once the card is on screen, and faded in when it has arrived. */
function loadArt(): void {
  const wide = globalThis.matchMedia?.('(min-width: 700px)').matches !== false
  const image = new Image()
  image.onload = () => { art.value = image.src }
  image.src = wide ? '/icons/entry-wide.webp' : '/icons/entry-tall.webp'
}

onMounted(() => {
  // Once per device, as in the creator: a reload of the same landing is not another one.
  if (!qs.landed) { qs.landed = true; if (!(view.value.onboarding?.required && view.value.connected) && firstLanding()) track('landed', { join: invited }) }
  const code = pendingRef()
  if (code) void inviterName(game.fetchJson, code).then((name) => { inviter.value = name })
  void loadOnline()
  poll = setInterval(() => { void loadOnline() }, 30000)
  requestAnimationFrame(() => { setTimeout(loadArt, 0) })
  root.value?.querySelector<HTMLElement>('[data-entry-title]')?.focus({ preventScroll: true })
})
onBeforeUnmount(() => { if (poll !== null) clearInterval(poll) })
</script>

<template>
  <div ref="root" class="en-root" data-entry>
    <div class="en-backdrop" aria-hidden="true"><div class="en-art" :class="{ 'is-on': art }" :style="art ? { backgroundImage: `url(${art})` } : undefined" /></div>
    <main class="en-card" aria-labelledby="en-title" :inert="agentOpen">
      <p class="en-brand"><i aria-hidden="true"><GameIcon name="globe" :size="22" /></i><b>Allworld</b></p>
      <p class="en-live" role="status" data-entry-live><i class="en-dot" :class="{ 'is-live': online !== null }" aria-hidden="true" /><span>{{ line }}</span></p>
      <h1 id="en-title" tabindex="-1" data-entry-title>{{ ENTRY_LEAD }}</h1>
      <p class="en-pitch">{{ pitch }}</p>
      <p v-if="invited" class="en-invite" role="status" data-entry-invite><strong>{{ invitedNote.title }}</strong> {{ inviter ? `Tap Play now and you land where ${inviter} is.` : 'Tap Play now and you land where they are.' }}</p>

      <div class="en-actions">
        <button type="button" class="en-btn is-primary" data-qs="play" data-key="play-now" data-entry-play :disabled="sending" @click="play()">{{ sending ? 'Starting…' : 'Play now' }}</button>
        <div v-if="account.available && !account.signedIn" class="en-pair">
          <button type="button" class="en-btn" data-key="sign-up" data-entry-signup @click="account.openSignUp()">Sign up free</button>
          <button type="button" class="en-btn" data-key="sign-in" data-entry-login @click="account.openSignIn()">Log in</button>
        </div>
      </div>
      <BonusLine v-if="account.available && !account.signedIn" />
      <p class="en-fine">No password, no e-mail to start.
        <button type="button" class="en-link" data-key="make-character" data-entry-creator @pointerenter="warmCreator" @focus="warmCreator" @touchstart.passive="warmCreator" @click="openCreator">Make my character first</button>
      </p>

      <ul class="en-tiles" aria-label="What you can do">
        <li v-for="tile in ENTRY_TILES" :key="tile.id"><i aria-hidden="true"><GameIcon :name="tile.icon" :size="20" /></i><span>{{ tile.label }}</span></li>
      </ul>

      <div class="en-find">
        <p v-if="found" class="en-found" role="status" data-entry-found>{{ found.line }}</p>
        <button v-if="found && found.kind !== 'none'" type="button" class="en-btn is-small" data-key="found-start" :disabled="sending" @click="startIn(found.city)">Start in {{ found.name }}</button>
        <button v-else type="button" class="en-link" data-key="find-city" :disabled="finding" @click="find">{{ finding ? 'Finding…' : 'Find my city' }}</button>
        <small v-if="!found">Worked out on this device. Your position is never sent or stored.</small>
      </div>

      <nav class="en-quiet" aria-label="More">
        <button type="button" class="en-link" data-key="agent" data-entry-agent @click="openAgent"><GameIcon name="link" :size="16" /> Connect an AI agent</button>
        <a class="en-link" :href="SOURCE_URL" target="_blank" rel="noopener noreferrer">Source code · AGPL</a>
      </nav>
    </main>
    <AgentSheet v-if="agentOpen" @close="agentOpen = false" />
  </div>
</template>

<style scoped>
.en-root { position: relative; display: grid; height: 100%; width: 100%; min-height: 0; overflow: hidden; place-items: center; box-sizing: border-box; padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left)); color: var(--c-ink); font-family: var(--font); background: #123524; }
.en-root *, .en-root *::before, .en-root *::after { box-sizing: border-box; }
.en-backdrop { position: absolute; inset: 0; overflow: hidden; container-type: size; background: radial-gradient(80% 70% at 50% 40%, #2f7a58 0, #1b4d37 50%, #0e2219 100%); }
.en-backdrop::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, #0b1a1385 0%, #0b1a135c 45%, #0b1a13ad 100%); }
/* One tall picture (three scenes of the game) drifts upward very slowly: a compositor-only transform, no layout and no paint per frame. */
.en-art { --en-ratio: 1.5; position: absolute; left: 0; top: 0; width: 100%; height: max(calc(var(--en-ratio) * 100cqw), 130cqh); background: center top / cover no-repeat; opacity: 0; transition: opacity 1.2s ease; will-change: transform; animation: en-pan 120s ease-in-out infinite alternate; }
.en-art.is-on { opacity: 1; }
@keyframes en-pan { from { transform: translate3d(0, 0, 0); } to { transform: translate3d(0, calc(100cqh - 100%), 0); } }
@media (max-width: 699px) { .en-art { --en-ratio: 1.875; } }
@media (prefers-reduced-motion: reduce) { .en-art { animation: none; transition: none; } }

.en-card { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 12px; width: min(100%, 27.5rem); max-height: 100%; overflow-y: auto; overscroll-behavior: contain; padding: 22px 22px 18px; border-radius: 24px; background: #fffffff2; box-shadow: 0 24px 70px #000a, 0 0 0 1px #ffffff40 inset; font-size: 15px; line-height: 1.45; backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
.en-card > * { margin: 0; }
.en-brand { display: flex; align-items: center; gap: 10px; }
.en-brand i { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; background: var(--c-green-dark); color: #fff; }
.en-brand b { font-size: 20px; letter-spacing: -.3px; }
.en-live { display: flex; align-items: center; gap: 8px; align-self: flex-start; max-width: 100%; padding: 6px 12px; border-radius: var(--r-pill); background: var(--c-green-soft); color: var(--c-green-dark); font-size: 13px; font-weight: 700; line-height: 1.3; }
.en-dot { flex: none; width: 8px; height: 8px; border-radius: 50%; background: #8aa89a; }
.en-dot.is-live { background: var(--c-green); box-shadow: 0 0 0 3px #2fa86633; }
h1 { font-size: 27px; line-height: 1.15; letter-spacing: -.5px; text-wrap: balance; }
h1:focus { outline: none; }
.en-pitch { color: var(--c-ink-2); text-wrap: pretty; }
.en-invite { padding: 10px 12px; border-radius: 12px; background: var(--c-amber-soft); color: var(--c-amber-dark); font-size: 14px; }
.en-actions { display: grid; gap: 10px; }
.en-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.en-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; padding: 10px 16px; border: 1.5px solid var(--c-line); border-radius: var(--r-pill); background: #fff; color: var(--c-ink); font: inherit; font-weight: 700; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.en-btn:hover:enabled { background: var(--c-fill); }
.en-btn.is-primary { min-height: 54px; border-color: var(--c-green-dark); background: var(--c-green-dark); color: #fff; font-size: 17px; box-shadow: 0 6px 18px #1d6b4359; }
.en-btn.is-primary:hover:enabled { background: #175a38; }
.en-btn.is-small { min-height: var(--tap); align-self: flex-start; }
.en-btn:disabled { opacity: .65; cursor: default; }
.en-link { display: inline-flex; align-items: center; gap: 6px; min-height: var(--tap); padding: 0 4px; border: 0; background: none; color: var(--c-green-dark); font: inherit; font-weight: 700; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.en-link:disabled { opacity: .6; cursor: default; }
.en-btn:focus-visible, .en-link:focus-visible { outline: var(--focus); outline-offset: 2px; }
.en-fine { display: flex; flex-wrap: wrap; align-items: center; column-gap: 8px; color: var(--c-muted); font-size: 13px; }
.en-tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 0; list-style: none; }
.en-tiles li { display: flex; align-items: center; gap: 8px; min-height: 52px; padding: 8px 10px; border-radius: 14px; background: var(--c-canvas); border: 1px solid var(--c-line); font-size: 12.5px; font-weight: 600; line-height: 1.25; }
.en-tiles i { flex: none; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; background: var(--c-green-soft); color: var(--c-green-dark); }
.en-find { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }
.en-find small { color: var(--c-muted); font-size: 12px; }
.en-found { color: var(--c-ink-2); font-size: 14px; }
.en-quiet { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; column-gap: 12px; padding-top: 6px; border-top: 1px solid var(--c-line); }
.en-quiet .en-link { font-size: 13px; font-weight: 600; color: var(--c-ink-2); }

/* A phone: the card is a sheet on the bottom edge. */
@media (max-width: 600px) {
  .en-root { place-items: end center; padding: 0; }
  .en-card { width: 100%; max-height: 94%; padding: 20px 18px max(16px, env(safe-area-inset-bottom)); border-radius: 24px 24px 0 0; gap: 10px; }
  h1 { font-size: 24px; }
}
@media (max-height: 620px) { .en-tiles li { min-height: 44px; } .en-card { gap: 8px; } }
/* A very large screen: the same card, drawn larger so it is not lost in the picture. */
@media (min-width: 1800px) and (min-height: 1000px) { .en-card { width: 34rem; font-size: 18px; padding: 28px 28px 22px; } h1 { font-size: 34px; } .en-btn.is-primary { min-height: 60px; font-size: 20px; } .en-live { font-size: 15px; } .en-tiles li { font-size: 15px; } .en-fine, .en-find small { font-size: 15px; } .en-quiet .en-link { font-size: 15px; } }
</style>
