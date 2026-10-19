<script setup lang="ts">
import { computed, ref } from 'vue'
import type { StoryMode } from '../../../types/story.ts'
import { useApp } from '../../state/app.ts'
import { contentFor } from '../../../game/cities/runtime.ts'
import BaseButton from '../../ui/BaseButton.vue'
import GameIcon from '../../ui/GameIcon.vue'
import SectionTitle from '../../ui/SectionTitle.vue'
import CoopCard from './CoopCard.vue'
import StoryTalkCard from './StoryTalkCard.vue'
import SignatureGame from './SignatureGame.vue'
import { setStoryHelpFocus, signaturePanelId, unlockedCityCount } from './storyUi.ts'

const { game, shell } = useApp()
const props = defineProps<{ storyHelp?: unknown }>()
if (props.storyHelp !== undefined) setStoryHelpFocus(props.storyHelp)
const story = computed(() => { const value = game.view.value.story; return value.enabled ? value : null })
const changing = ref<StoryMode | null>(null)
const announcement = ref('')
const signatureOpen = ref(false)
const connected = computed(() => game.view.value.connected)
const unlocked = computed(() => story.value ? unlockedCityCount(story.value) : 0)
const signatureDestination = computed(() => {
  const venue = story.value?.signature.venue
  return venue ? game.view.value.travel.destinations.find((row) => row.id === venue) ?? null : null
})
const signaturePanel = computed(() => {
  const current = story.value
  if (!current) return null
  const panel = shell.byId.get(signaturePanelId(current.signature.kind))
  return panel && shell.gateOf(panel) === null ? panel : null
})
const atSignatureVenue = computed(() => Boolean(signatureDestination.value && game.state.value.location === signatureDestination.value.id))
const signatureAction = computed(() => {
  const destination = signatureDestination.value
  if (destination && !atSignatureVenue.value) return `Go to ${destination.label}`
  if (story.value?.signature.kind === 'haggle' && destination) return signatureOpen.value ? 'Hide market bargain' : 'Start market bargain'
  return signaturePanel.value ? `Open ${signaturePanel.value.title}` : destination ? `Open ${destination.label}` : null
})

function modeReason(mode: StoryMode): string | null {
  if (!connected.value) return 'Reconnect to change how you play.'
  if (changing.value) return 'Another Story setting is being saved.'
  if (story.value?.mode === mode) return `You are already playing in ${mode === 'story' ? 'Story Path' : 'Free Roam'}.`
  return null
}

async function chooseMode(mode: StoryMode): Promise<void> {
  if (!story.value || modeReason(mode)) return
  changing.value = mode
  announcement.value = `Switching to ${mode === 'story' ? 'Story Path' : 'Free Roam'}…`
  try {
    const result = await game.command('story.mode', { mode })
    announcement.value = result.ok
      ? `${mode === 'story' ? 'Story Path' : 'Free Roam'} is on.`
      : result.reason ?? 'That setting could not be changed.'
  } finally { changing.value = null }
}

function openSignature(): void {
  const destination = signatureDestination.value
  if (destination && !atSignatureVenue.value) { shell.open('map', { destination: destination.id }); return }
  if (story.value?.signature.kind === 'haggle' && destination) { signatureOpen.value = !signatureOpen.value; return }
  if (signaturePanel.value) {
    const kind = story.value?.signature.kind
    const table = kind === 'tables' ? contentFor(game.cityId.value).tablePlaces.find(row => row.venueId === destination?.id) : null
    shell.open(signaturePanel.value.id, table ? { table: table.id } : kind?.startsWith('arena-') ? { game: kind.slice(6) } : {})
    return
  }
  if (destination) shell.open('map', { destination: destination.id })
}
</script>

<template>
  <section v-if="story?.enabled === true" class="story-mode" aria-labelledby="story-mode-title">
    <SectionTitle>Story Mode</SectionTitle>
    <div class="story-mode-card">
      <div class="story-mode-heading">
        <span aria-hidden="true"><GameIcon name="book" :size="22" /></span>
        <div><h4 id="story-mode-title">Choose how you explore</h4><p>Your chapter progress stays with you in either mode.</p></div>
      </div>
      <div class="story-mode-options" role="group" aria-label="How you play">
        <button type="button" :aria-pressed="story.mode === 'free'" :disabled="Boolean(modeReason('free'))" :title="modeReason('free') ?? undefined" @click="chooseMode('free')">
          <b>Free Roam</b><small>Explore without chapter locks.</small>
        </button>
        <button type="button" :aria-pressed="story.mode === 'story'" :disabled="Boolean(modeReason('story'))" :title="modeReason('story') ?? undefined" @click="chooseMode('story')">
          <b>Story Path</b><small>Follow the chapter journey.</small>
        </button>
      </div>
      <p class="story-live" role="status" aria-live="polite">{{ announcement }}</p>
    </div>

    <section class="story-chapter" aria-labelledby="story-chapter-title">
      <div class="story-chapter-top"><span>Chapter {{ story.chapter }} of 4</span><strong>{{ story.mode === 'story' ? 'Story Path' : 'Free Roam' }}</strong></div>
      <h4 id="story-chapter-title">{{ story.chapterLabel }}</h4>
      <p class="story-next"><b>Next step</b><span>{{ story.nextStep }}</span></p>
      <div class="story-progress" aria-label="Current city story progress">
        <span><b>{{ story.progress.missions }}</b> mission{{ story.progress.missions === 1 ? '' : 's' }}</span>
        <span><b>{{ story.progress.venues }}</b> venue{{ story.progress.venues === 1 ? '' : 's' }}</span>
        <span><b>{{ unlocked }}</b> of {{ story.cities.length }} cities</span>
      </div>
    </section>

    <section class="story-signature" aria-labelledby="story-signature-title">
      <span class="story-signature-icon" aria-hidden="true"><GameIcon name="star" :size="20" /></span>
      <div><small>City signature challenge</small><h4 id="story-signature-title">{{ story.signature.label }}</h4><p>{{ story.signature.description }}</p></div>
      <BaseButton v-if="signatureAction" small @click="openSignature">{{ signatureAction }}</BaseButton>
    </section>
    <SignatureGame v-if="story.signature.kind === 'haggle' && atSignatureVenue && signatureOpen" />

    <details class="story-cities">
      <summary>City chapters · {{ unlocked }} of {{ story.cities.length }} open</summary>
      <ul>
        <li v-for="city in story.cities" :key="city.id" :class="{ 'is-locked': !city.unlocked }">
          <span><b>{{ city.label }}</b><small>Chapter {{ city.chapter }}</small></span><strong>{{ city.unlocked ? 'Open' : 'Locked' }}</strong>
        </li>
      </ul>
    </details>

    <details v-if="story.helped.length" class="story-cities">
      <summary>Help keepsakes · {{ story.helped.length }}</summary>
      <ul><li v-for="receipt in story.helped" :key="receipt.id"><span><b>{{ receipt.label }} Roots keepsake</b><small>You helped a friend complete a challenge.</small></span><strong>{{ new Date(receipt.completedAt).toLocaleDateString() }}</strong></li></ul>
    </details>

    <StoryTalkCard />
    <CoopCard />
  </section>
</template>

<style scoped>
.story-mode { display: grid; gap: 10px; min-width: 0; margin-bottom: var(--s-3); }
.story-mode-card,.story-chapter,.story-signature,.story-cities { min-width: 0; border-radius: var(--r-md); background: #fff; box-shadow: var(--e-1),var(--ring); }
.story-mode-card,.story-chapter { padding: 14px; }
.story-mode-heading { display: grid; grid-template-columns: auto minmax(0,1fr); gap: 10px; align-items: center; }
.story-mode-heading > span { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 13px; background: #e8f0ff; color: #254f91; }
.story-mode h4,.story-mode p { margin: 0; }
.story-mode-heading h4,.story-chapter h4,.story-signature h4 { font-size: 15px; line-height: 1.3; overflow-wrap: anywhere; }
.story-mode-heading p,.story-signature p { margin-top: 3px; color: var(--c-muted); font-size: 12px; line-height: 1.4; }
.story-mode-options { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 7px; margin-top: 12px; }
.story-mode-options button { min-width: 0; min-height: var(--tap,44px); padding: 9px; border: 1px solid var(--c-line); border-radius: 12px; background: var(--c-fill); color: var(--c-ink); text-align: left; cursor: pointer; }
.story-mode-options button[aria-pressed="true"] { border-color: var(--c-green-dark); background: var(--c-green-soft); color: var(--c-green-dark); }
.story-mode-options button:disabled { cursor: default; opacity: 1; }
.story-mode-options b,.story-mode-options small { display: block; overflow-wrap: anywhere; }
.story-mode-options b { font-size: 13px; }.story-mode-options small { margin-top: 3px; color: var(--c-muted); font-size: 11px; line-height: 1.3; }
.story-mode-options button:focus-visible,.story-cities summary:focus-visible { outline: var(--focus); outline-offset: 2px; }
.story-live { min-height: 1.35em; margin-top: 7px!important; color: var(--c-green-dark); font-size: 12px; line-height: 1.35; }
.story-chapter { display: grid; gap: 9px; background: linear-gradient(145deg,#f4f7ff,#fff); }
.story-chapter-top { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 5px 12px; color: #315c9b; font-size: 11px; font-weight: 700; }
.story-next { display: grid; gap: 3px; color: var(--c-ink-2); font-size: 13px; line-height: 1.45; overflow-wrap: anywhere; }.story-next b { color: var(--c-muted); font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
.story-progress { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 6px; }
.story-progress span { min-width: 0; padding: 8px 5px; border-radius: 10px; background: #fff; color: var(--c-muted); font-size: 10px; line-height: 1.25; text-align: center; overflow-wrap: anywhere; }.story-progress b { display: block; color: var(--c-ink); font-size: 16px; }
.story-signature { display: grid; grid-template-columns: auto minmax(0,1fr); gap: 10px; align-items: start; padding: 13px; }.story-signature :deep(.base-button) { grid-column: 2; justify-self: start; }
.story-signature-icon { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 12px; background: var(--c-amber-soft); color: var(--c-amber-dark); }.story-signature small { display: block; margin-bottom: 2px; color: var(--c-muted); font-size: 10px; text-transform: capitalize; }
.story-cities { padding: 0 13px; }.story-cities summary { display: flex; align-items: center; min-height: var(--tap,44px); color: var(--c-green-dark); font-size: 12px; font-weight: 700; cursor: pointer; }.story-cities ul { display: grid; gap: 6px; margin: 0; padding: 0 0 12px; list-style: none; }.story-cities li { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-width: 0; padding: 8px 10px; border-radius: 10px; background: var(--c-green-soft); }.story-cities li.is-locked { background: var(--c-fill); color: var(--c-muted); }.story-cities li span { min-width: 0; }.story-cities li b,.story-cities li small { display: block; overflow-wrap: anywhere; }.story-cities li b { font-size: 12px; }.story-cities li small,.story-cities li strong { margin-top: 2px; font-size: 10px; }.story-cities li strong { flex: none; }
@container passport (max-width: 300px) { .story-mode-options,.story-progress { grid-template-columns: 1fr; }.story-progress span { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; text-align: left; }.story-progress b { display: inline; }.story-signature { grid-template-columns: 1fr; }.story-signature-icon { display: none; }.story-signature :deep(.base-button) { grid-column: 1; } }
</style>
