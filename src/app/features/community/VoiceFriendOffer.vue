<script setup lang="ts">
// Friendship after shared play, in room voice: once two people have been in the same voice circle for five minutes, the same compact card as
// after a table game is offered, once per pair per day (src/app/features/social/friendOfferModel.ts). Mounted by CommunityHost only while the
// player is in voice, and a chunk of its own, so none of it is in the first download. The browser finds the people (it knows who is in the
// circle) and asks the server's profile card before showing anything: someone who is already a friend, already asked, blocked or yourself is
// left out. The friend request, the gift and the invitation are then validated by their own routes as ever.
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { FriendOffer } from '../../../types/growth.ts'
import FriendOfferCard from '../social/FriendOfferCard.vue'
import { FriendTimer, markNotNow, markVoiceShown, voiceDue } from '../social/friendOfferModel.ts'
import { offerMemory, saveOfferMemory } from '../social/friendOfferStore.ts'
import { useSocial } from '../social/useSocial.ts'
import type { CommunityStore } from './communityStore.ts'

const props = defineProps<{ store: CommunityStore }>()
const client = useSocial()
const timer = new FriendTimer()
const people = ref<FriendOffer[]>([])
/** People who reached five minutes while a card was already up: offered after it is closed. */
let waiting: string[] = []
let tick: ReturnType<typeof setInterval> | undefined
let working = false

async function offer(ids: string[]): Promise<void> {
  working = true
  try {
    const memory = offerMemory(), now = Date.now(), found: FriendOffer[] = []
    for (const id of ids.filter((one) => voiceDue(memory, one, now))) {
      await client.loadProfile(id)
      const card = client.state.profiles.get(id)
      if (!card || 'error' in card || card.self || card.friend || card.blocked || card.requested) continue
      found.push({ id, name: card.name, ...(card.agent ? { ai: true as const } : {}), ...(card.incoming ? { incoming: true as const } : {}) })
    }
    if (found.length) { markVoiceShown(memory, found.map((one) => one.id), now); saveOfferMemory(); people.value = found.slice(0, 5) }
  } finally { working = false }
}
function look(): void {
  const state = props.store.state.value
  const inVoice = state?.voice.on ? state.members.filter((member) => !member.you && member.voice !== 'off').map((member) => member.id) : []
  waiting = [...new Set([...waiting, ...timer.note(Date.now(), inVoice)])]
  if (waiting.length && !people.value.length && !working) { const ids = waiting; waiting = []; void offer(ids) }
}
function close(unasked: string[]): void { markNotNow(offerMemory(), unasked, Date.now()); saveOfferMemory(); people.value = [] }
onMounted(() => { tick = setInterval(look, 15000) })
onBeforeUnmount(() => clearInterval(tick))
</script>

<template>
  <FriendOfferCard v-if="people.length" :people="people" source="voice" floating @close="close" />
</template>
