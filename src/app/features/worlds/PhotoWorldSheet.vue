<script setup lang="ts">
// A world from a photo (docs/WORLDS.md, phase 8): the player picks a photo, their own device works out how far away everything in it
// is and builds a place from it (src/spaces/photo/), and a link-only world is made around it; they walk in where the photo was taken.
// The photo is never sent anywhere but as the picture on the player's own model, like any model they upload.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useApp } from '../../state/app.ts'
import { track } from '../world/worldModel.ts'
import { modelUpload, modelsMine, worldCreate, worldSave, type WorldCard } from '../spaces/spacesClient.ts'
import { WORLD_SIZES } from '../../../spaces/worlds.ts'
import type { PhotoPlace, PhotoStep } from '../../../spaces/photo/depth.ts'

const emit = defineEmits<{ made: [world: WorldCard]; close: [] }>()
const { game } = useApp()
type State = 'pick' | 'working' | 'ready' | 'saving'
const state = ref<State>('pick')
const step = ref<PhotoStep | null>(null)
const picture = ref<string | null>(null)
const place = ref<PhotoPlace | null>(null)
const name = ref('My photo')
const error = ref('')
let started = 0
/** The world made for this photo, kept so a retry after a failed save does not make a second one. */
let madeWorld: WorldCard | null = null

const progress = computed(() => {
  const s = step.value
  if (!s) return 'Opening the photo…'
  if (s.step === 'download') return `Getting the depth helper (once): ${Math.round(s.done / 1e6)} of ${Math.round(s.total / 1e6)} MB`
  return s.step === 'depth' ? 'Working out how far away everything is…' : 'Building the place…'
})
const WHY: Record<string, string> = {
  off: 'Worlds from a photo are not switched on here yet.',
  picture: 'That file could not be opened as a photo. Try a JPEG or PNG.',
  memory: 'This device ran out of memory. Close other apps or tabs and try again, or use a smaller photo.',
  download: 'The depth helper did not download. Check your connection and try again.',
}

/** Why this player cannot keep a model (a guest, uploads paused), asked first so nobody does the work for nothing. */
const blocked = ref<string | null>(null)
onMounted(async () => {
  const mine = await modelsMine(game)
  if (mine.ok && !mine.canUpload) blocked.value = mine.why ?? 'You cannot upload models right now.'
})

function forget(): void { if (picture.value) URL.revokeObjectURL(picture.value); picture.value = null }
onBeforeUnmount(forget)

async function pick(event: Event): Promise<void> {
  const file = (event.target as HTMLInputElement).files?.[0]
  ;(event.target as HTMLInputElement).value = ''
  if (!file) return
  forget()
  error.value = ''; place.value = null; step.value = null; madeWorld = null
  picture.value = URL.createObjectURL(file)
  state.value = 'working'; started = performance.now()
  try {
    const { photoPlace } = await import('../../../spaces/photo/depth.ts')
    place.value = await photoPlace(file, (s) => { step.value = s })
    state.value = 'ready'
  } catch (caught) {
    const code = (caught as { code?: string }).code ?? 'download'
    error.value = WHY[code] ?? WHY['download']!
    state.value = 'pick'
    track('photo_world', { step: code, ground: 'none', seconds: Math.round((performance.now() - started) / 1000) })
  }
}

async function make(): Promise<void> {
  const ready = place.value
  if (!ready || state.value === 'saving') return
  state.value = 'saving'; error.value = ''
  const title = name.value.trim().slice(0, 40) || 'My photo'
  const fail = (reason: string): void => { error.value = reason; state.value = 'ready' }
  const sent = await modelUpload(new Blob([ready.glb as Uint8Array<ArrayBuffer>], { type: 'model/gltf-binary' }), title)
  if (!sent.ok) return fail(sent.reason)
  // A park-sized world with the photo in its middle (the 3D view centres a model on itself), so the whole scene stands inside it.
  if (!madeWorld) {
    const made = await worldCreate(game, { name: title, blurb: '', size: 'huge', ground: 'grass', open: 'link', sky: 'day', template: 'empty' })
    if (!made.ok) return fail(made.reason)
    madeWorld = made.world
  }
  const side = WORLD_SIZES.huge.metres
  const placed = await worldSave(game, { target: 'world', id: madeWorld.id }, [{ k: 'photo', m: sent.model.id, by: sent.model.by, hash: sent.model.hash, x: side / 2, y: 0, z: side / 2, ry: 0, s: 1, floor: 0 }])
  if (!placed.ok) return fail(placed.reason)
  track('photo_world', { step: 'made', ground: ready.mesh.ground, seconds: Math.round((performance.now() - started) / 1000) })
  emit('made', madeWorld)
}
</script>

<template>
  <section class="ui-card worlds-form worlds-photo" data-worlds="photo-sheet" aria-label="A world from a photo">
    <h3>Walk into a photo</h3>
    <template v-if="state === 'pick'">
      <p class="ui-muted">Pick a photo of a room, a street or a view. Your device works out how far away everything is and builds a place you can walk into, standing where the photo was taken. The first time, it fetches a 41 MB helper.</p>
      <p class="ui-muted">Works best with a level photo that shows the floor or the ground. Things hidden behind others stay hidden.</p>
      <p v-if="blocked" class="ui-why" data-worlds="photo-blocked">{{ blocked }}</p>
      <label v-else class="ui-button is-primary is-block worlds-photo-pick" data-worlds="photo-pick">
        Choose a photo
        <input type="file" accept="image/*" class="worlds-photo-input" @change="pick">
      </label>
    </template>
    <img v-if="picture && state !== 'pick'" :src="picture" alt="Your photo" class="worlds-photo-thumb">
    <p v-if="state === 'working'" class="worlds-photo-step" role="status" data-worlds="photo-step">{{ progress }}</p>
    <template v-if="state === 'ready' || state === 'saving'">
      <p class="ui-muted" data-worlds="photo-ready">{{ place?.mesh.ground === 'fitted' ? 'Ready: the ground was found.' : 'Ready. No clear floor in this photo, so the ground is a guess.' }} Only people you send the link can come in; you can change that later.</p>
      <label class="worlds-label" for="worlds-photo-name">Name</label>
      <input id="worlds-photo-name" v-model="name" class="ui-field" type="text" maxlength="40" autocomplete="off" data-worlds="photo-name" />
    </template>
    <p v-if="error" class="ui-why" role="alert" data-worlds="photo-error">{{ error }}</p>
    <div class="worlds-row">
      <button type="button" class="ui-button" :disabled="state === 'saving'" @click="emit('close')">Cancel</button>
      <button v-if="state === 'ready' || state === 'saving'" type="button" class="ui-button is-primary" data-worlds="photo-make" :disabled="state === 'saving' || name.trim().length < 2" @click="make">{{ state === 'saving' ? '…' : 'Make it and walk in' }}</button>
    </div>
  </section>
</template>

<style scoped>
.worlds-photo-pick { position: relative; overflow: hidden; }
.worlds-photo-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.worlds-photo-thumb { display: block; width: 100%; max-height: 220px; object-fit: cover; border-radius: 10px; margin: 0 0 10px; }
.worlds-photo-step { margin: 0 0 10px; font-weight: 600; }
</style>
