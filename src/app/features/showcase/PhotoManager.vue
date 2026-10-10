<script setup lang="ts">
// The seller's photos: a styled button (the file input is hidden), a tile for each photo that is on its way (preparing, then
// uploading, or why it was refused), and the photos already on the shop with a cover mark, a short caption, move earlier or
// later, make cover, and remove. The first photo is the cover. Pictures are shrunk and stripped of camera details on the device.
import { computed, reactive, ref, watch } from 'vue'
import { useApp } from '../../state/app.ts'
import GameIcon from '../../ui/GameIcon.vue'
import type { ShowcasePhotoView } from '../../../types/showcase.ts'
import { SHOWCASE } from '../../../types/showcase.ts'
import { newClientId } from '../social/useSocial.ts'
import { CODE_WORDS, makeCover, movePhoto, photoBody, photoUrl, preparePhoto, wordsFor } from './showcaseModel.ts'

const props = defineProps<{ photos: readonly ShowcasePhotoView[]; uploadsLeft: number; busy: boolean; /** A refused caption: the message and the text that was refused, by photo id. */ errors?: Record<string, { message: string; text: string }> }>()
const emit = defineEmits<{ arrange: [change: { order: string[]; captions?: Record<string, string> }]; remove: [photo: string]; changed: [] }>()
const { game } = useApp()
interface Pending { key: number; name: string; state: 'preparing' | 'uploading' | 'failed'; reason: string }
const pending = ref<Pending[]>([])
const input = ref<HTMLInputElement | null>(null)
const captions = reactive<Record<string, string>>({})
const working = ref(false)
let counter = 0
watch(() => props.photos, (list) => { for (const photo of list) captions[photo.id] = photo.caption ?? '' }, { immediate: true, deep: true })
const order = computed(() => props.photos.map((photo) => photo.id))
const room = computed(() => SHOWCASE.photosMax - props.photos.length - pending.value.filter((item) => item.state !== 'failed').length)
const codeOf = (error: unknown): string | undefined => (error instanceof Error ? (error as { code?: string }).code : undefined)
const set = (item: Pending, state: Pending['state'], reason = ''): void => { item.state = state; item.reason = reason }

async function add(event: Event): Promise<void> {
  const field = event.target as HTMLInputElement
  const files = [...(field.files ?? [])]
  field.value = ''
  const batch = files.map((file): [File, Pending] => [file, reactive({ key: ++counter, name: file.name || 'Photo', state: 'preparing', reason: '' })])
  pending.value = [...pending.value, ...batch.map(([, item]) => item)]
  if (working.value) return
  working.value = true
  try {
    for (const [file, item] of batch) {
      if (props.photos.length >= SHOWCASE.photosMax) { set(item, 'failed', CODE_WORDS.photo_limit ?? ''); continue }
      const prepared = await preparePhoto(file)
      if (!prepared.ok) { set(item, 'failed', prepared.reason); continue }
      set(item, 'uploading')
      try {
        const answer = await game.fetchJson<{ ok: boolean; code: string; reason?: string }>('/api/showcase/mine/photos', { method: 'POST', body: await photoBody(prepared.ready, newClientId()) })
        if (answer.ok) { pending.value = pending.value.filter((one) => one !== item); emit('changed') } else set(item, 'failed', answer.reason ?? wordsFor(answer.code, 'That photo was not accepted.'))
      } catch (error) { set(item, 'failed', wordsFor(codeOf(error), error instanceof Error ? error.message : 'That photo did not upload. Try again.')) }
    }
  } finally { working.value = false }
}
const captionError = (id: string): string => { const found = props.errors?.[id]; return found && found.text === (captions[id] ?? '').trim() ? found.message : '' }
const dismiss = (item: Pending): void => { pending.value = pending.value.filter((one) => one !== item) }
const caption = (id: string): void => { emit('arrange', { order: order.value, captions: { [id]: (captions[id] ?? '').trim() } }) }
</script>

<template>
  <div class="pm">
    <ul v-if="photos.length || pending.length" class="pm-grid">
      <li v-for="(photo, at) in photos" :key="photo.id" class="pm-item" :data-photo="photo.id">
        <div class="pm-pic">
          <img :src="photoUrl(photo.id)" :alt="captions[photo.id] || `Your photo ${at + 1}`" width="120" height="120">
          <span v-if="at === 0" class="pm-cover">Cover</span>
        </div>
        <p v-if="photo.hidden" class="pm-state">Hidden after reports</p>
        <p v-else-if="!photo.approved" class="pm-state">Waiting for review</p>
        <label class="pm-cap" :for="`se-cap-${photo.id}`">Caption (optional)</label>
        <input :id="`se-cap-${photo.id}`" v-model="captions[photo.id]" class="pm-capin" :maxlength="SHOWCASE.caption" autocomplete="off" :disabled="busy" :aria-invalid="captionError(photo.id) ? 'true' : undefined" :aria-describedby="captionError(photo.id) ? `se-cap-e-${photo.id}` : undefined" @change="caption(photo.id)">
        <p v-if="captionError(photo.id)" :id="`se-cap-e-${photo.id}`" class="pm-error" role="alert">{{ captionError(photo.id) }}</p>
        <div class="pm-tools">
          <button v-if="at > 0" type="button" class="pm-tool is-text" :disabled="busy" :aria-label="`Make photo ${at + 1} the cover`" @click="emit('arrange', { order: makeCover(order, photo.id) })">Cover</button>
          <button type="button" class="pm-tool" :disabled="busy || at === 0" :aria-label="`Move photo ${at + 1} earlier`" title="Earlier" @click="emit('arrange', { order: movePhoto(order, photo.id, -1) })"><GameIcon name="back" :size="18" /></button>
          <button type="button" class="pm-tool" :disabled="busy || at === photos.length - 1" :aria-label="`Move photo ${at + 1} later`" title="Later" @click="emit('arrange', { order: movePhoto(order, photo.id, 1) })"><GameIcon name="chevron" :size="18" /></button>
          <button type="button" class="pm-tool" :disabled="busy" :aria-label="`Remove photo ${at + 1}`" title="Remove" @click="emit('remove', photo.id)"><GameIcon name="trash" :size="18" /></button>
        </div>
      </li>
      <li v-for="item in pending" :key="item.key" class="pm-item is-pending" :class="{ 'is-failed': item.state === 'failed' }">
        <div class="pm-pic is-empty" aria-hidden="true" />
        <p class="pm-name">{{ item.name }}</p>
        <template v-if="item.state === 'failed'">
          <p class="pm-error" role="alert">{{ item.reason }}</p>
          <button type="button" class="ui-button is-small" @click="dismiss(item)">Dismiss</button>
        </template>
        <template v-else>
          <progress class="pm-bar" :aria-label="`${item.state === 'preparing' ? 'Preparing' : 'Uploading'} ${item.name}`" />
          <p class="pm-state" role="status">{{ item.state === 'preparing' ? 'Getting it ready…' : 'Uploading…' }}</p>
        </template>
      </li>
    </ul>
    <button v-if="room > 0" type="button" class="ui-button is-block" :disabled="busy || uploadsLeft <= 0" @click="input?.click()">{{ photos.length ? 'Add more photos' : 'Add photos' }}</button>
    <input ref="input" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden @change="add">
    <p class="pm-hint">{{ uploadsLeft > 0 ? `You can add ${uploadsLeft} more today.` : CODE_WORDS.upload_limit }}</p>
  </div>
</template>

<style scoped>
.pm { display: grid; gap: var(--s-3); }
.pm-grid { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--s-3); grid-template-columns: repeat(auto-fill, minmax(min(100%, 150px), 1fr)); }
.pm-item { display: grid; gap: 6px; align-content: start; padding: var(--s-2); border: 1px solid var(--c-line); border-radius: var(--r-md); background: #fff; min-width: 0; }
.pm-pic { position: relative; border-radius: var(--r-sm); overflow: hidden; background: var(--c-fill); aspect-ratio: 1; }
.pm-pic img { width: 100%; height: 100%; object-fit: cover; display: block; }
.pm-pic.is-empty { background: var(--c-fill); }
.pm-cover { position: absolute; left: 6px; top: 6px; padding: 1px 8px; border-radius: var(--r-pill); background: var(--c-night); color: #fff; font-size: var(--t-small); font-weight: 600; }
.pm-state, .pm-name, .pm-hint { margin: 0; font-size: var(--t-small); color: var(--c-muted); overflow-wrap: anywhere; }
.pm-name { color: var(--c-ink); }
.pm-error { margin: 0; font-size: var(--t-small); color: var(--c-red-dark); overflow-wrap: anywhere; }
.pm-bar { width: 100%; height: 8px; }
.pm-cap { font-size: var(--t-small); color: var(--c-muted); }
.pm-capin { min-height: 40px; font: inherit; width: 100%; box-sizing: border-box; }
.pm-capin[aria-invalid='true'] { border-color: var(--c-red); }
.pm-tools { display: flex; gap: 4px; }
.pm-tool { display: inline-grid; place-items: center; min-width: 44px; min-height: 44px; padding: 0 8px; border: 1px solid var(--c-line); border-radius: var(--r-sm); background: #fff; color: var(--c-ink-2); font: 600 var(--t-small) var(--font); cursor: pointer; }
.pm-tool.is-text { padding: 0 10px; }
.pm-tool:disabled { opacity: .45; cursor: default; }
.pm-tool:focus-visible { outline: var(--focus); outline-offset: 2px; }
</style>
