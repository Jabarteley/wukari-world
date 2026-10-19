<script setup lang="ts">
import '../../../ui/controls.css'
import { computed, onMounted, watch } from 'vue'
import { useApp } from '../../state/app.ts'
import GameIcon from '../../ui/GameIcon.vue'
import { captureAccess, captureSession, discardCapture, startSceneRecording, stopSceneRecording, takeScenePhoto } from './captureSession.ts'
import { cancelPrepare, captureShare, prepareShare, shapeChanged, shareCapture, videoMarkable, warmIdentity } from './captureShare.ts'
import { UNMARKED_CLIP_NOTE, videoExtension, videoLabel } from './captureShareModel.ts'

const { game, scene, api } = useApp()
const access = computed(() => captureAccess())
const session = captureSession
const recording = computed(() => session.recording)
const ready = computed(() => Boolean(scene.venue.value) && access.value.allowed)
const locationName = computed(() => game.state.value.location === 'neighbourhood' ? 'Your neighbourhood' : 'Your home')

function takePhoto(): void { void takeScenePhoto() }
async function startVideo(): Promise<void> {
  if (await startSceneRecording()) api.close()
}
function stopVideo(): void { stopSceneRecording() }

const markable = computed(() => videoMarkable())
const videoName = computed(() => `allworld-scene.${videoExtension(session.videoType)}`)
const videoKind = computed(() => videoLabel(session.videoType))
const videoSeconds = computed(() => session.videoMs ? ` · ${Math.max(1, Math.round(session.videoMs / 1000))} s` : ' · up to 30 seconds')
const preparing = (kind: 'photo' | 'video'): boolean => captureShare.phase === 'preparing' && captureShare.kind === kind
const isReady = (kind: 'photo' | 'video'): boolean => captureShare.phase === 'ready' && captureShare.kind === kind
function shareLabel(kind: 'photo' | 'video'): string {
  if (preparing(kind)) return kind === 'video' && captureShare.secondsLeft ? `Adding the mark… ${captureShare.secondsLeft}s` : 'Adding the mark…'
  const noun = kind === 'photo' ? 'photo' : 'clip'
  return isReady(kind) ? `Share ${noun} now` : `Share ${noun}`
}
function share(kind: 'photo' | 'video'): void { void shareCapture(kind) }
function toggleStory(): void { captureShare.story = !captureShare.story; shapeChanged() }
// A clip made with "Clip 6 s" opens here already marked, ready for one tap on Share.
function autoShare(): void { if (session.autoShare && session.videoUrl) { session.autoShare = false; void prepareShare('video') } }
watch(() => session.autoShare && session.videoUrl, autoShare)
onMounted(() => { warmIdentity(); autoShare() })
</script>

<template>
  <section class="capture-app" aria-labelledby="capture-title" data-capture-app>
    <header class="capture-head">
      <div>
        <h2 id="capture-title">Scene capture</h2>
        <p>{{ locationName }} · 3D scene only</p>
      </div>
      <GameIcon name="camera" :size="24" />
    </header>

    <p class="capture-truth">Capture the 3D scene without menus or HUD. Files stay on this device until you tap Share and pick where they go. Download a photo or clip to keep it.</p>

    <p v-if="!access.allowed" class="capture-gate" role="status">{{ access.reason }}</p>
    <p v-else-if="!scene.venue.value" class="capture-gate" role="status">The scene is loading. Capture will be ready when it appears.</p>

    <div class="capture-actions">
      <button class="ui-button capture-action" type="button" :disabled="!ready || session.busy || recording" @click="takePhoto">
        <GameIcon name="camera" :size="19" /><span>{{ session.busy ? 'Saving photo…' : 'Take photo' }}</span>
      </button>
      <button v-if="!recording" class="ui-button capture-action" type="button" :disabled="!ready || session.busy" @click="startVideo">
        <GameIcon name="camera" :size="19" /><span>Record video</span>
      </button>
      <button v-else class="ui-button capture-action is-recording" type="button" @click="stopVideo">
        <span class="capture-record-dot" aria-hidden="true"></span><span>Stop recording · {{ session.secondsLeft }}s</span>
      </button>
    </div>
    <p v-if="recording" class="capture-status" role="status" aria-live="polite">Recording the scene. No microphone or system audio is used. The phone will close so you can keep playing.</p>
    <p v-if="session.note" class="capture-note" role="status" aria-live="polite">{{ session.note }}</p>
    <p v-if="session.error" class="capture-error" role="alert">{{ session.error }}</p>

    <figure v-if="session.photoUrl" class="capture-preview">
      <img :src="session.photoUrl" alt="Captured image of the current 3D scene">
      <figcaption>
        <span>PNG photo</span>
        <span class="capture-buttons">
          <a class="ui-button capture-download" :href="session.photoUrl" download="allworld-scene.png">Download photo</a>
          <button class="ui-button is-primary capture-download" type="button" :disabled="preparing('photo') || preparing('video')" data-capture-share="photo" @click="share('photo')">{{ shareLabel('photo') }}</button>
        </span>
      </figcaption>
    </figure>
    <figure v-if="session.videoUrl" class="capture-preview">
      <video :src="session.videoUrl" controls playsinline preload="metadata" aria-label="Preview of your scene recording"></video>
      <figcaption>
        <span>{{ videoKind }} video{{ videoSeconds }}</span>
        <span class="capture-buttons">
          <a class="ui-button capture-download" :href="session.videoUrl" :download="videoName">Download video</a>
          <button class="ui-button is-primary capture-download" type="button" :disabled="preparing('photo') || preparing('video')" data-capture-share="video" @click="share('video')">{{ shareLabel('video') }}</button>
        </span>
      </figcaption>
    </figure>
    <section v-if="session.photoUrl || session.videoUrl" class="capture-share" aria-label="Share settings">
      <label class="capture-story"><input type="checkbox" :checked="captureShare.story" :disabled="captureShare.phase === 'preparing'" @change="toggleStory"> Crop to 9:16 for phone stories</label>
      <p class="capture-mark">Shared files carry the corner mark <b>{{ captureShare.mark }}</b>, drawn on this device. Nothing is uploaded; you choose where it goes.</p>
      <p v-if="session.videoUrl && !markable" class="capture-note" role="status">{{ UNMARKED_CLIP_NOTE }}</p>
      <p v-if="session.videoUrl" class="capture-note">Adding the mark to a clip takes about as long as the clip. Keep Allworld open until it is ready.</p>
      <button v-if="captureShare.phase === 'preparing'" class="capture-cancel" type="button" @click="cancelPrepare">Cancel</button>
      <p v-if="captureShare.note" class="capture-note" role="status" aria-live="polite">{{ captureShare.note }}</p>
      <p v-if="captureShare.error" class="capture-error" role="alert">{{ captureShare.error }}</p>
    </section>
    <button v-if="session.photoUrl || session.videoUrl" class="ui-button capture-discard" type="button" @click="discardCapture">Discard capture</button>
  </section>
</template>

<style scoped>
.capture-app { display: grid; gap: 14px; color: var(--c-ink); }
.capture-head { display: flex; align-items: center; gap: 12px; padding: 2px 2px 12px; border-bottom: 1px solid var(--c-line); }
.capture-head > div { flex: 1; min-width: 0; }
.capture-head h2 { margin: 0; font-size: 19px; line-height: 1.2; }
.capture-head p { margin: 4px 0 0; color: var(--c-muted); font-size: 12px; }
.capture-truth, .capture-gate, .capture-status, .capture-note, .capture-error { margin: 0; font-size: 13px; line-height: 1.45; }
.capture-truth { padding: 10px 12px; border-radius: var(--r-sm); background: var(--c-fill); color: var(--c-ink-2); }
.capture-gate { padding: 12px; border: 1px solid var(--c-line); border-radius: var(--r-sm); background: var(--c-canvas); color: var(--c-ink-2); }
.capture-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.capture-action { display: flex; align-items: center; justify-content: center; gap: 8px; min-width: 0; min-height: var(--tap); padding: 9px 10px; white-space: normal; }
.capture-action:disabled { opacity: .5; cursor: not-allowed; }
.capture-action.is-recording { grid-column: 1 / -1; border-color: var(--c-red); color: var(--c-red-dark); }
.capture-record-dot { width: 9px; height: 9px; flex: none; border-radius: 50%; background: var(--c-red); box-shadow: 0 0 0 4px var(--c-red-soft); }
.capture-status, .capture-note { color: var(--c-ink-2); }
.capture-error { padding: 10px 12px; border-radius: var(--r-sm); background: var(--c-red-soft); color: var(--c-red-dark); }
.capture-preview { display: grid; gap: 8px; margin: 0; padding: 8px; border: 1px solid var(--c-line); border-radius: var(--r-md); background: var(--c-canvas); }
.capture-preview img, .capture-preview video { display: block; width: 100%; max-height: min(36vh, 360px); border-radius: var(--r-sm); background: #202823; object-fit: contain; }
.capture-preview figcaption { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12px; color: var(--c-ink-2); }
.capture-download { display: inline-flex; align-items: center; justify-content: center; min-height: 36px; padding: 6px 10px; text-decoration: none; white-space: nowrap; }
.capture-buttons { display: inline-flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
.capture-download:disabled { opacity: .55; cursor: not-allowed; }
.capture-share { display: grid; gap: 8px; }
.capture-share p { margin: 0; font-size: 13px; line-height: 1.45; }
.capture-mark { color: var(--c-ink-2); }
.capture-story { display: flex; align-items: center; gap: 8px; min-height: var(--tap); font-size: 13px; }
.capture-cancel { justify-self: start; min-height: 36px; padding: 5px 7px; border: 0; background: none; color: var(--c-red-dark); font: inherit; font-size: 12px; cursor: pointer; }
.capture-discard { justify-self: start; min-height: var(--tap); }
.capture-app button:focus-visible, .capture-download:focus-visible { outline: var(--focus); outline-offset: 2px; }
@media (max-width: 380px) {
  .capture-actions { grid-template-columns: 1fr; }
  .capture-preview figcaption { align-items: flex-start; flex-direction: column; }
}
</style>
