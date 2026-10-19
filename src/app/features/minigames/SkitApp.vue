<script setup lang="ts">
// Skit studio (docs/MINI-GAMES.md): compose a short skit with up to three friends, preview it, record it and hand it to Capture, which adds the @handle mark
// and opens the share sheet. A skit is poses (the game's own), a title card and caption lines; it is drawn on a canvas on this device, so it can be recorded
// anywhere. NO SOUND: nothing here asks for the microphone, and the studio says so. The words are checked by the server before they go in a video.
import '../../../ui/controls.css'
import '../../../ui/panels/social.css'
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useApp } from '../../state/app.ts'
import { social } from '../social/useSocial.ts'
import SectionTitle from '../../ui/SectionTitle.vue'
import { BACKDROPS, LENGTHS, MAX_ACTORS, POSES, POSE_LABELS, TITLE_MAX, CAPTION_MAX, addActor, addBeat, beatMs, isPose, maxBeats, newSkit, recordMs, removeActor, removeBeat, setCaption, setLength, setPose, setTitle, wordsOf } from '../../../minigames/skit.ts'
import type { Skit, SkitLength } from '../../../minigames/skit.ts'
import { minigamesApi } from './minigamesApi.ts'
import { drawSkit } from './skitDraw.ts'
import { H, W, recordDrawing } from './cardKit.ts'
import { track } from '../world/worldModel.ts'

const { game, shell } = useApp()
const api = minigamesApi(game.fetchJson)
const me = { id: game.session.value?.id ?? 'you', name: game.state.value.name || game.client.identity.name || 'Me' }
const skit = reactive<Skit>(newSkit(me))
const set = (next: Skit): void => { Object.assign(skit, next) }
const friends = computed(() => (social.me?.friends ?? []).filter((friend) => (friend as { agent?: boolean }).agent !== true && !skit.actors.some((actor) => actor.id === friend.id)))
const canAddBeat = computed(() => skit.beats.length < maxBeats(skit.lengthMs))
const seconds = computed(() => Math.round(beatMs(skit) / 100) / 10)

const preview = ref<HTMLCanvasElement | null>(null)
const busy = ref(false)
const note = ref('')
const progress = ref(0)
let raf = 0, started = 0, stop = false, cancel = false

function paint(): void {
  const canvas = preview.value, ctx = canvas?.getContext('2d')
  if (canvas && ctx && !busy.value) {
    if (canvas.width !== W) { canvas.width = W; canvas.height = H }
    const total = skit.lengthMs
    drawSkit(ctx, skit as Skit, (performance.now() - started) % total)
  }
  if (!stop) raf = requestAnimationFrame(paint)
}

async function record(): Promise<void> {
  if (busy.value) return
  busy.value = true; cancel = false; note.value = 'Checking your words…'; progress.value = 0
  try {
    // The title and captions are text other people will read, so the server's filter sees them first. They are refused, never altered.
    const checked = await api.checkSkit(wordsOf(skit as Skit))
    if (!checked.ok) { note.value = checked.reason; return }
    set(setTitle(skit as Skit, checked.title))
    checked.captions.forEach((caption, at) => set(setCaption(skit as Skit, at, caption)))
    note.value = 'Recording… no sound is recorded.'
    const frozen = JSON.parse(JSON.stringify(skit)) as Skit
    const made = await recordDrawing((ctx, ms) => { drawSkit(ctx, frozen, ms) }, recordMs(frozen), { onProgress: (ms) => { progress.value = ms / recordMs(frozen) }, cancelled: () => cancel })
    const { adoptCapture } = await import('../capture/captureSession.ts')
    if (!adoptCapture({ video: made.blob, videoMs: made.ms })) { note.value = 'Capture is busy. Try again in a moment.'; return }
    track('skit_made', { action: 'record', actors: skit.actors.length })
    track('skit_made', { action: 'share', actors: skit.actors.length })
    note.value = ''
    shell.open('capture')
  } catch (error) {
    note.value = (error as Error).message === 'cancelled' ? 'Recording stopped.' : 'This browser cannot record a video of the skit. You can still preview it here.'
  } finally { busy.value = false; progress.value = 0 }
}
const stopRecording = (): void => { cancel = true }

onMounted(() => { started = performance.now(); raf = requestAnimationFrame(paint) })
onBeforeUnmount(() => { stop = true; cancel = true; cancelAnimationFrame(raf) })
</script>

<template>
  <section class="sk-app" aria-labelledby="sk-title" data-skit="app">
    <header class="sk-head">
      <span class="sk-badge" aria-hidden="true">🎬</span>
      <div>
        <h2 id="sk-title">Skit studio</h2>
        <p>Pose yourself and up to three friends, add captions, record, share.</p>
      </div>
    </header>
    <p class="sk-silent" data-skit="silent"><strong>No sound.</strong> The studio never asks for your microphone. A skit is poses and captions only, so write what is said in the captions.</p>

    <div class="sk-preview"><canvas ref="preview" :width="W" :height="H" aria-label="Preview of your skit" data-skit="preview" /></div>

    <SectionTitle>The skit</SectionTitle>
    <label class="sk-field">Title card
      <input :value="skit.title" :maxlength="TITLE_MAX" placeholder="A skit about…" class="sk-input" data-skit="title" @input="set(setTitle(skit as Skit, ($event.target as HTMLInputElement).value))">
    </label>
    <div class="sk-chips" role="group" aria-label="Where it happens">
      <button v-for="place in BACKDROPS" :key="place.id" type="button" class="social-btn" :class="{ 'is-on': skit.backdrop === place.id }" :aria-pressed="skit.backdrop === place.id" @click="skit.backdrop = place.id">{{ place.label }}</button>
    </div>
    <div class="sk-chips" role="group" aria-label="How long">
      <button v-for="length in LENGTHS" :key="length" type="button" class="social-btn" :class="{ 'is-on': skit.lengthMs === length }" :aria-pressed="skit.lengthMs === length" @click="set(setLength(skit as Skit, length as SkitLength))">{{ length / 1000 }} seconds</button>
    </div>

    <SectionTitle>Who is in it</SectionTitle>
    <ul class="sk-cast" data-skit="cast">
      <li v-for="actor in skit.actors" :key="actor.id"><span>{{ actor.name }}{{ actor.you ? ' (you)' : '' }}</span><button v-if="!actor.you" type="button" class="social-btn" @click="set(removeActor(skit as Skit, actor.id))">Remove</button></li>
    </ul>
    <p v-if="skit.actors.length < MAX_ACTORS && !friends.length" class="sk-hint">Add friends to the phone's People to cast them.</p>
    <div v-if="skit.actors.length < MAX_ACTORS && friends.length" class="sk-chips" role="group" aria-label="Add a friend">
      <button v-for="friend in friends.slice(0, 12)" :key="friend.id" type="button" class="social-btn" @click="set(addActor(skit as Skit, friend))">+ {{ friend.name }}</button>
    </div>
    <p class="sk-hint">Friends appear as figures with their names. They are not recorded, and nothing is sent to them.</p>

    <SectionTitle>Beats ({{ skit.beats.length }} of {{ maxBeats(skit.lengthMs) }}, about {{ seconds }} seconds each)</SectionTitle>
    <ol class="sk-beats">
      <li v-for="(beat, at) in skit.beats" :key="at" class="sk-beat" :data-beat="at">
        <div class="sk-beat-head"><strong>Beat {{ at + 1 }}</strong><button v-if="skit.beats.length > 1" type="button" class="social-btn" @click="set(removeBeat(skit as Skit, at))">Remove</button></div>
        <label v-for="(actor, who) in skit.actors" :key="actor.id" class="sk-pose">{{ actor.name }}
          <select :value="beat.poses[who]" @change="(event) => { const pose = (event.target as HTMLSelectElement).value; if (isPose(pose)) set(setPose(skit as Skit, at, who, pose)) }">
            <option v-for="pose in POSES" :key="pose" :value="pose">{{ POSE_LABELS[pose] }}</option>
          </select>
        </label>
        <label class="sk-field">Caption (optional)
          <input :value="beat.caption" :maxlength="CAPTION_MAX" class="sk-input" placeholder="What is said here" @input="set(setCaption(skit as Skit, at, ($event.target as HTMLInputElement).value))">
        </label>
      </li>
    </ol>
    <button v-if="canAddBeat" type="button" class="social-btn" data-skit="add-beat" @click="set(addBeat(skit as Skit))">Add a beat</button>

    <p v-if="note" class="ui-note" role="status" data-skit="note">{{ note }}</p>
    <div v-if="busy" class="sk-bar" role="progressbar" :aria-valuenow="Math.round(progress * 100)" aria-valuemin="0" aria-valuemax="100"><span :style="{ width: `${Math.round(progress * 100)}%` }" /></div>
    <div class="sk-actions">
      <button v-if="!busy" type="button" class="ui-button is-primary" data-skit="record" @click="record">Record {{ skit.lengthMs / 1000 }} seconds</button>
      <button v-else type="button" class="ui-button" @click="stopRecording">Stop</button>
    </div>
    <p class="sk-hint">The clip opens in Capture, which puts your @handle on it before you share it. Skits are made on this device: nothing is uploaded until you share.</p>
  </section>
</template>

<style scoped>
.sk-app { display: flex; flex-direction: column; gap: 10px; }
.sk-head { display: flex; gap: 12px; align-items: center; }
.sk-head h2 { margin: 0; font-size: 20px; }
.sk-head p { margin: 2px 0 0; font-size: 13px; opacity: .75; }
.sk-badge { font-size: 30px; width: 48px; height: 48px; display: grid; place-items: center; border-radius: 14px; background: #9c36b5; }
.sk-silent { margin: 0; padding: 8px 12px; border-radius: 12px; font-size: 13px; background: rgba(156, 54, 181, .14); border: 1px solid rgba(156, 54, 181, .45); }
.sk-preview { align-self: center; width: min(100%, 300px); border-radius: 16px; overflow: hidden; background: #000; }
.sk-preview canvas { display: block; width: 100%; height: auto; aspect-ratio: 9 / 16; }
.sk-field { display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
.sk-input { padding: 8px 10px; border-radius: 10px; border: 1px solid rgba(127,127,127,.5); font-size: 16px; }
.sk-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.sk-chips .is-on { outline: 2px solid #9c36b5; }
.sk-cast { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.sk-cast li { display: flex; justify-content: space-between; align-items: center; font-size: 14px; }
.sk-beats { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.sk-beat { border-radius: 14px; padding: 10px; background: rgba(127,127,127,.12); display: flex; flex-direction: column; gap: 8px; }
.sk-beat-head { display: flex; justify-content: space-between; align-items: center; }
.sk-pose { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 14px; }
.sk-pose select { padding: 6px 8px; border-radius: 8px; font-size: 14px; }
.sk-hint { font-size: 12px; opacity: .7; margin: 0; }
.sk-bar { height: 8px; border-radius: 4px; background: rgba(127,127,127,.3); overflow: hidden; }
.sk-bar span { display: block; height: 100%; background: #9c36b5; }
.sk-actions { display: flex; gap: 8px; }
</style>
