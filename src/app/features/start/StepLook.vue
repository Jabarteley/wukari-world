<script setup lang="ts">
// Step 2, "Make it yours": the whole look editor, inline, with large swatches, and the tools that go
// with it: undo, reset to where the step began, and a shuffle. The editor says what was chosen; the
// creator decides what to do with it.
//
// "Start from a photo": a selfie (taken, or chosen from the gallery) sets the skin tone and hair colour to the
// nearest the character has; the figure updates and the person adjusts from there. The photo is read on this
// phone (photoLook.ts, fetched when the button is pressed), never sent, kept or logged, and the file input is
// emptied as soon as it has been read.
import { ref } from 'vue'
import type { Look } from '../../../types/life.ts'
import GameIcon from '../../ui/GameIcon.vue'
import LookEditor from './LookEditor.vue'
import type { Owned } from './lookModel.ts'

const props = defineProps<{ look: Look; owned: Owned; canUndo: boolean; canReset: boolean }>()
const emit = defineEmits<{ replace: [look: Look]; undo: []; reset: []; shuffle: []; tab: [id: string] }>()
function onTap(event: MouseEvent): void {
  const tab = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-look-tab]') : null
  if (tab?.dataset.lookTab) emit('tab', tab.dataset.lookTab)
}

type PhotoModules = readonly [typeof import('./photoLook.ts'), typeof import('./fromPhoto.ts')]
let modules: Promise<PhotoModules> | null = null
const loadPhoto = (): Promise<PhotoModules> => (modules ??= Promise.all([import('./photoLook.ts'), import('./fromPhoto.ts')]).catch((error: unknown) => { modules = null; throw error }))
const camera = ref<HTMLInputElement | null>(null)
const gallery = ref<HTMLInputElement | null>(null)
const photoBusy = ref(false)
const photoNote = ref('')
/** Open the camera (or the gallery); the code that reads the picture starts downloading with the tap. */
function choosePhoto(input: HTMLInputElement | null): void {
  if (photoBusy.value) return
  void loadPhoto().catch(() => undefined)
  input?.click()
}
async function onPhoto(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  input.value = ''
  if (!file) return
  photoBusy.value = true
  photoNote.value = ''
  try {
    const [{ readPhotoRecipe }, { applyPhotoRecipe, photoChangedSomething }] = await loadPhoto()
    const recipe = await readPhotoRecipe(file)
    if (recipe && photoChangedSomething(recipe)) {
      emit('replace', applyPhotoRecipe(props.look, recipe))
      const parts = [recipe.colors.skin ? 'skin tone' : '', recipe.colors.hair ? 'hair colour' : ''].filter(Boolean)
      photoNote.value = `Set your ${parts.join(' and ')} from the photo. Change anything below.`
    } else photoNote.value = 'We could not read a skin tone from that photo. Try one with your face in the middle and good light, or choose colours below.'
  } catch { photoNote.value = 'The photo could not be read here. You can choose colours below.' } finally { photoBusy.value = false }
}
</script>

<template>
  <div class="cr-look">
    <div class="cr-photo" data-cr-photo>
      <div class="cr-photo-row" role="group" aria-label="Start from a photo">
        <button type="button" class="cr-btn is-small" data-key="photo" :disabled="photoBusy" @click="choosePhoto(camera)"><GameIcon name="person" inline /> {{ photoBusy ? 'Reading the photo…' : 'Start from a photo' }}</button>
        <button type="button" class="cr-link" data-key="photo-gallery" :disabled="photoBusy" @click="choosePhoto(gallery)">or choose one from your photos</button>
      </div>
      <input ref="camera" class="cr-sr" type="file" accept="image/*" capture="user" tabindex="-1" aria-hidden="true" data-photo-input="camera" @change="onPhoto">
      <input ref="gallery" class="cr-sr" type="file" accept="image/*" tabindex="-1" aria-hidden="true" data-photo-input="gallery" @change="onPhoto">
      <p class="cr-note" data-cr-photo-note>The photo stays on your phone: it is only used to pick colours, then dropped.</p>
      <p v-if="photoNote" class="cr-note" role="status" data-cr-photo-result>{{ photoNote }}</p>
    </div>
    <div class="cr-tools" role="group" aria-label="Look tools">
      <button type="button" class="cr-btn is-small" data-key="undo" :disabled="!canUndo" @click="emit('undo')"><GameIcon name="back" inline /> Undo</button>
      <button type="button" class="cr-btn is-small" data-key="reset" :disabled="!canReset" @click="emit('reset')"><GameIcon name="refresh" inline /> Reset</button>
      <button type="button" class="cr-btn is-small" data-key="shuffle" @click="emit('shuffle')"><GameIcon name="game" inline /> Surprise me</button>
    </div>
    <div class="cr-editor" @click="onTap"><LookEditor :look="look" :owned="owned" @replace="emit('replace', $event)" /></div>
  </div>
</template>

<style scoped>
.cr-photo{margin-bottom:10px}
.cr-photo-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.cr-photo .cr-note{margin:6px 0 0}
</style>
