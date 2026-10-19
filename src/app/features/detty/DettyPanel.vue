<script setup lang="ts">
// Detty December at the top of the Events app (docs/DETTY-DECEMBER.md): the season's line, today's drop as a chip, the Returnee badge (or how to
// earn it) and, from 24 December, the season card to share. Opening it checks in: the server records the season city the character is in, a
// night it is at and a party it is inside, and gives the Returnee badge when the rule holds. Loaded with the Events app, never at startup.
import { computed, onMounted, ref } from 'vue'
import { useApp } from '../../state/app.ts'
import BaseButton from '../../ui/BaseButton.vue'
import BaseChip from '../../ui/BaseChip.vue'
import { useGrowth } from '../growth/useGrowth.ts'
import { cleanFacts } from '../../../game/share-model.ts'
import { channelLinks } from '../../../ui/share-links.ts'
import { checkin, mySeason } from '../../../festivals/detty-client.ts'
import type { DettyFeed, DettyMine } from '../../../festivals/detty-client.ts'
import { cardWords } from '../../../festivals/detty.ts'
import { RETURNEE_HOW, cardLink, cardText, dropToday, noticeOf, seasonHere } from './dettyEvents.ts'
import { cardPicture } from './dettyCard.ts'

const props = defineProps<{ feed: DettyFeed }>()
const { game, shell } = useApp()
const growth = useGrowth()
const view = game.view
const mine = ref<DettyMine | null>(null), making = ref(false)
const here = computed(() => seasonHere(props.feed, view.value.now, view.value.cityId))
const notice = computed(() => noticeOf(props.feed, view.value.now, view.value.cityId))
const drop = computed(() => dropToday(props.feed, view.value.now))
// The card is offered from 24 December (or in a preview) to someone who has something on it.
const card = computed(() => { const facts = mine.value?.facts; return props.feed.card && facts && (facts.nights || facts.parties || facts.cities.length) ? cardWords(facts) : null })

onMounted(async () => {
  const fetchJson = game.fetchJson as Parameters<typeof checkin>[0]
  const answer = here.value ? await checkin(fetchJson) : await mySeason(fetchJson)
  if (!answer) return
  mine.value = answer
  if (answer.added?.returnee) game.toast(`New badge on your profile: ${answer.added.returnee}`, 'info')
  else if (answer.added?.event) game.toast(`Counted on your season card: ${answer.added.event}`, 'info')
})

async function share(): Promise<void> {
  if (!mine.value || making.value) return
  making.value = true
  try {
    const link = cardLink(globalThis.location?.origin ?? ''), text = cardText(mine.value.facts, link), file = await cardPicture(mine.value.facts)
    const url = file ? URL.createObjectURL(file) : null, links = channelLinks(text, link)
    growth.state.sharing = { facts: cleanFacts({ kind: 'gist' }), prepared: { text, link, file, url, whatsapp: links.whatsapp, x: links.x }, surface: 'phone' }
    shell.open('share-sheet')
  } finally { making.value = false }
}
</script>

<template>
  <section v-if="notice || card" class="dd" data-detty="panel">
    <p v-if="notice" class="dd-line"><strong>{{ notice }}</strong> Beach by day, parties by night, owambe on Saturdays.</p>
    <p v-if="drop" class="dd-drop" data-detty="drop"><BaseChip tone="warn">Today’s drop</BaseChip> {{ drop }}</p>
    <p v-if="mine?.returnee" class="dd-badge" data-detty="returnee">✈️ {{ mine.returnee }}</p>
    <p v-else-if="here" class="dd-note">{{ RETURNEE_HOW }}</p>
    <div v-if="card" class="dd-card" data-detty="card">
      <strong>{{ card.title }}</strong>
      <span>{{ card.line }}</span>
      <BaseButton small variant="primary" :disabled="making" @click="share">Share my season card</BaseButton>
    </div>
  </section>
</template>

<style scoped>
.dd { margin: var(--s-2) 0; padding: var(--s-2) var(--s-3); border: 2px solid #e0a43a; border-radius: var(--r-sm); background: linear-gradient(90deg, #e0a43a33, #7b3fa033); font-size: 13px; line-height: 1.45; color: var(--c-ink); }
.dd p { margin: 4px 0; }
.dd-drop { display: flex; gap: 6px; align-items: baseline; }
.dd-badge { font-weight: 700; }
.dd-note { color: var(--c-muted); font-size: 12px; }
.dd-card { display: grid; gap: 4px; margin-top: 6px; padding: 8px 10px; border-radius: var(--r-sm); background: #2a1240; color: #fff; }
.dd-card span { color: #fff3d6; }
</style>
