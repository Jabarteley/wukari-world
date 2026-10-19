<script setup lang="ts">
// "Find my old street" (docs/SHARE-LOOPS.md): pick a city and a local government or district by name (or ask the on-device finder), then
// the dive from space down to that street plays full screen and is recorded on this device, captioned ("Where I grew up · Surulere,
// Lagos") with the @handle mark, ready for the phone's share sheet. Nothing about the place is stored or sent unless the person shares the
// video; the link it carries is the street's own entry page, which plays the same dive for whoever opens it.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { useApp } from '../../state/app.ts'
import GameIcon from '../../ui/GameIcon.vue'
import { cityCatalogue, loadCityIndex, loadCityNetwork, loadCityRules } from '../../../game/cities/registry.ts'
import { deviceHints } from '../../../map3d/dive-host.ts'
import { diveTier, entryBackdrop } from '../../../map3d/dive.ts'
import type { EntryDive } from '../../../map3d/entry-dive.ts'
import LoopCardSheet from './LoopCardSheet.vue'
import { loopFile, loopLink, loopMark } from './loopsModel.ts'
import { whoAmI } from './loopShare.ts'
import type { LoopShare } from './loopShare.ts'
import { CAPTIONS, captionOf, matchPlaces, placesOf, recordingMs, streetPath, streetText } from './streetVideoModel.ts'
import type { StreetChoice } from './streetVideoModel.ts'
import { StreetVideoError, canRecordStreet, recordStreet } from './streetRecorder.ts'
import type { StreetRecording } from './streetRecorder.ts'

const emit = defineEmits<{ close: [] }>()
const { game } = useApp()
const cities = shallowRef<{ id: string; name: string }[]>([])
const places = shallowRef<{ id: string; name: string }[]>([])
const cityTyped = ref(''), placeTyped = ref(''), caption = ref<string>(CAPTIONS[0])
const city = ref<{ id: string; name: string } | null>(null), place = ref<{ id: string; name: string } | null>(null)
const phase = ref<'pick' | 'recording' | 'ready'>('pick')
const note = ref(''), finding = ref(false), secondsLeft = ref(0)
const stage = ref<HTMLElement | null>(null)
const cityMatches = computed(() => (city.value ? [] : matchPlaces(cities.value, cityTyped.value, 6)))
const placeMatches = computed(() => (place.value ? [] : matchPlaces(places.value, placeTyped.value, 8)))
const choice = computed<StreetChoice | null>(() => (city.value ? { city: city.value.id, cityName: city.value.name, place: place.value } : null))
const captionLine = computed(() => (choice.value ? captionOf(caption.value, choice.value) : ''))
const hints = (): ReturnType<typeof deviceHints> & { reduced: boolean } => ({ ...deviceHints(), reduced: Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) })
const canVideo = canRecordStreet() !== null && entryBackdrop(hints()) !== 'still'
let dive: EntryDive | null = null, recording: StreetRecording | null = null, ticker = 0
const made = shallowRef<LoopShare | null>(null)

onMounted(async () => {
  try {
    await Promise.all([loadCityIndex(), loadCityNetwork()])
    cities.value = cityCatalogue().filter((entry) => entry.open && !entry.id.startsWith('test-')).map((entry) => ({ id: entry.id, name: entry.name }))
  } catch { note.value = 'The list of cities could not load. Check your connection and try again.' }
})
async function pickCity(next: { id: string; name: string }): Promise<void> {
  city.value = next; cityTyped.value = next.name; place.value = null; placeTyped.value = ''; places.value = []
  try { places.value = placesOf(await loadCityRules(next.id)) } catch { note.value = 'That city\'s places could not load. You can still use the city alone.' }
}
function changeCity(): void { city.value = null; place.value = null; places.value = []; placeTyped.value = '' }
function pickPlace(next: { id: string; name: string }): void { place.value = next; placeTyped.value = next.name }
/** The on-device finder of the entry page: a city and a local unit, as ids and names. Nothing is kept. */
async function findMine(): Promise<void> {
  if (finding.value) return
  finding.value = true; note.value = ''
  try {
    const { findStreet } = await import('../start/streetEntry.ts')
    const answer = await findStreet()
    if (!answer.target) { note.value = answer.found.line; return }
    await pickCity({ id: answer.target.city, name: answer.target.cityName })
    if (answer.target.place) pickPlace(answer.target.place)
  } catch { note.value = 'This device could not work out where it is. Choose the place yourself.' } finally { finding.value = false }
}

function stop(): void {
  if (ticker) clearInterval(ticker)
  ticker = 0
  dive?.destroy(); dive = null
}
async function record(): Promise<void> {
  const picked = choice.value
  if (!picked || phase.value !== 'pick') return
  note.value = ''
  phase.value = 'recording'
  await nextTick()
  const box = stage.value
  if (!box) { phase.value = 'pick'; return }
  const who = await whoAmI()
  const backdrop = entryBackdrop(hints()), tier = diveTier({ ...hints(), reduced: false })
  try {
    const start = await (await import('../../../map3d/entry-dive.ts')).loadEntryDive()
    dive = start({ box, backdrop: backdrop === 'still' ? 'fade' : backdrop, tier, target: { city: picked.city, name: picked.place ? `${picked.place.name}, ${picked.cityName}` : picked.cityName } })
  } catch { phase.value = 'pick'; note.value = 'The map could not open on this device.'; return }
  const ms = backdrop === 'fade' ? 4000 : recordingMs(tier)
  const ends = Date.now() + ms
  secondsLeft.value = Math.ceil(ms / 1000)
  ticker = window.setInterval(() => { secondsLeft.value = Math.max(0, Math.ceil((ends - Date.now()) / 1000)) }, 250)
  recording = recordStreet(box, captionOf(caption.value, picked), loopMark(who.handle), ms)
  try {
    const { blob, choice: type } = await recording.done
    const link = loopLink(globalThis.location?.origin ?? '', 'street-video', streetPath(picked))
    made.value = { loop: 'street-video', file: new File([blob], loopFile('street-video', type.type), { type: type.type }), text: streetText(caption.value, picked, link), link }
    phase.value = 'ready'
  } catch (error) {
    phase.value = 'pick'
    if (!(error instanceof StreetVideoError && error.code === 'cancelled')) note.value = 'The video could not be recorded on this device. You can still share the street\'s link.'
  } finally { recording = null; stop() }
}
function cancel(): void { recording?.cancel(); stop(); phase.value = 'pick' }
async function shareLink(): Promise<void> {
  const picked = choice.value
  if (!picked) return
  const { shareAddress } = await import('../paths/share.ts')
  await shareAddress(`${streetPath(picked)}?utm_source=street-video&utm_medium=card&utm_campaign=street-video`, `${captionOf(caption.value, picked)}: come and see it on Allworld.`, (line, kind) => { game.toast(line, kind) })
}
onBeforeUnmount(() => { recording?.cancel(); stop() })
</script>

<template>
  <Teleport to="body">
    <div class="sv-back" role="dialog" aria-modal="true" aria-label="Find my old street" data-street-video>
      <div v-if="phase === 'pick'" class="sv-sheet">
        <header class="sv-head"><b>Find my old street</b><button type="button" class="sv-x" aria-label="Close" @click="emit('close')"><GameIcon name="close" :size="18" /></button></header>
        <p class="sv-note">From space down to the street you grew up on: a short video made on your phone, ready for your Status.</p>
        <label class="sv-field"><span>City</span>
          <input v-model="cityTyped" type="search" autocomplete="off" placeholder="Lagos, Accra, Nairobi…" :readonly="Boolean(city)" data-sv="city" @focus="city && changeCity()">
        </label>
        <ul v-if="cityMatches.length && cityTyped" class="sv-list"><li v-for="item in cityMatches" :key="item.id"><button type="button" @click="pickCity(item)">{{ item.name }}</button></li></ul>
        <label v-if="city" class="sv-field"><span>Local government or district (optional)</span>
          <input v-model="placeTyped" type="search" autocomplete="off" placeholder="Surulere, Yaba…" :readonly="Boolean(place)" data-sv="place" @focus="place = null">
        </label>
        <ul v-if="city && placeMatches.length && placeTyped" class="sv-list"><li v-for="item in placeMatches" :key="item.id"><button type="button" @click="pickPlace(item)">{{ item.name }}</button></li></ul>
        <button type="button" class="sv-link" :disabled="finding" data-sv="find" @click="findMine">{{ finding ? 'Looking on this device…' : 'Use where I am now' }}</button>
        <label class="sv-field"><span>Caption</span>
          <select v-model="caption" data-sv="caption"><option v-for="item in CAPTIONS" :key="item" :value="item">{{ item }}</option></select>
        </label>
        <p v-if="captionLine" class="sv-caption" data-sv="caption-line">{{ captionLine }}</p>
        <p v-if="note" class="sv-note is-warn" role="status">{{ note }}</p>
        <div class="sv-acts">
          <button v-if="canVideo" type="button" class="sv-btn is-primary" :disabled="!choice" data-sv="record" @click="record">Make my video</button>
          <button type="button" class="sv-btn" :disabled="!choice" data-sv="link" @click="shareLink">Share the link</button>
        </div>
        <p v-if="!canVideo" class="sv-note">This device keeps things light, so it shares the street's link instead of a video: the link plays the same dive.</p>
        <p class="sv-note">Where you pick is not saved. It goes only into the video and its link, and only if you share them.</p>
      </div>
      <div v-else-if="phase === 'recording'" class="sv-stage">
        <div ref="stage" class="sv-box" />
        <p class="sv-rec" role="status"><span class="sv-dot" aria-hidden="true" /> Recording · {{ secondsLeft }} s</p>
        <p class="sv-cap" aria-hidden="true">{{ captionLine }}</p>
        <button type="button" class="sv-btn sv-cancel" @click="cancel">Cancel</button>
      </div>
      <LoopCardSheet v-else-if="made" title="Where I grew up" :alt="captionLine" :make="async () => made" note="Recorded on your phone. Nothing is sent until you share it." @close="emit('close')" />
    </div>
  </Teleport>
</template>

<style scoped>
.sv-back { position: fixed; inset: 0; z-index: 88; display: grid; place-items: center; padding: 12px; background: #000b; }
.sv-sheet { width: min(100%, 380px); max-height: 100%; overflow: auto; padding: 14px; border-radius: 18px; background: var(--c-surface, #fff); color: var(--c-ink, #111); display: grid; gap: 8px; }
.sv-head { display: flex; align-items: center; gap: 8px; }
.sv-head b { flex: 1; }
.sv-x { display: grid; place-items: center; width: 36px; height: 36px; border: 0; border-radius: 50%; background: none; color: inherit; cursor: pointer; }
.sv-field { display: grid; gap: 4px; font-size: 13px; font-weight: 650; }
.sv-field input, .sv-field select { min-height: 42px; padding: 0 12px; border: 1px solid var(--c-line, #e5e1d6); border-radius: 12px; font: inherit; font-weight: 400; background: var(--c-surface, #fff); color: inherit; }
.sv-list { margin: 0; padding: 0; list-style: none; display: grid; gap: 2px; }
.sv-list button { width: 100%; min-height: 40px; padding: 0 12px; border: 0; border-radius: 10px; background: var(--c-green-soft, #e8f5ec); color: inherit; font: inherit; text-align: left; cursor: pointer; }
.sv-link { justify-self: start; min-height: 40px; padding: 0; border: 0; background: none; color: var(--c-green-dark, #1d6b43); font: inherit; font-weight: 650; text-decoration: underline; cursor: pointer; }
.sv-caption { margin: 0; padding: 8px 12px; border-radius: 12px; background: #10323d; color: #fff; font-weight: 700; }
.sv-note { margin: 0; color: var(--c-muted, #6b7280); font-size: 13px; }
.sv-note.is-warn { color: #b23a2e; }
.sv-acts { display: flex; flex-wrap: wrap; gap: 8px; }
.sv-btn { min-height: 44px; padding: 0 18px; border: 1px solid var(--c-line, #e5e1d6); border-radius: 999px; background: none; color: inherit; font: inherit; font-weight: 700; cursor: pointer; }
.sv-btn.is-primary { border-color: transparent; background: var(--c-green-dark, #1d6b43); color: #fff; }
.sv-btn:disabled { opacity: .5; cursor: default; }
.sv-stage { position: fixed; inset: 0; background: #0b1530; }
.sv-box { position: absolute; inset: 0; }
.sv-box :deep(.en-dive) { position: absolute; inset: 0; opacity: 0; }
.sv-box :deep(.en-dive.is-on) { opacity: 1; }
/* As on the entry page: only the globe and its names show, and the dive's own Skip and veil stay inside the box, untouchable. */
.sv-box { contain: strict; pointer-events: none; }
.sv-box :deep(.atlas > :not(.atlas-canvas):not(.atlas-labels)) { display: none; }
.sv-box :deep(.dv-veil) { position: absolute; }
.sv-box :deep(.dv-skip) { display: none; }
.sv-rec { position: absolute; top: 12px; left: 12px; margin: 0; padding: 6px 12px; border-radius: 999px; background: #000a; color: #fff; font-weight: 700; display: flex; align-items: center; gap: 6px; }
.sv-dot { width: 10px; height: 10px; border-radius: 50%; background: #e5484d; }
.sv-cap { position: absolute; top: 56px; left: 0; right: 0; margin: 0; text-align: center; color: #fff; font-weight: 800; font-size: 20px; text-shadow: 0 2px 8px #000a; pointer-events: none; }
.sv-cancel { position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); background: #000a; color: #fff; border-color: #fff5; }
</style>
