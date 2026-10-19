<script setup lang="ts">
// "What did you get": the start card, opened from the end of character creation (the creator's "All set" screen and the first-minute
// strip of a new life). The facts are the player's own, read from the game's view on this device: job, home, start cash, the birth
// lottery and the dream (./startCardModel.ts). Drawn here and shared only when the person taps Share.
import { useApp } from '../../state/app.ts'
import { DREAMS } from '../../../game/content/traits.ts'
import LoopCardSheet from './LoopCardSheet.vue'
import { loopFile, loopLink, loopMark, profileOf } from './loopsModel.ts'
import { startCard, startText } from './startCardModel.ts'
import { canvasPng, drawStoryCard } from './loopPaint.ts'
import { whoAmI } from './loopShare.ts'
import type { LoopShare } from './loopShare.ts'

const emit = defineEmits<{ close: [] }>()
const { game } = useApp()

async function make(): Promise<LoopShare | null> {
  const view = game.view.value, who = await whoAmI(), o = view.onboarding
  const card = startCard({
    name: view.name ?? '', city: view.estate?.cityName ?? '', area: view.estate?.lga?.name ?? '',
    lottery: o?.lottery?.id ?? null, lotteryLabel: o?.lottery?.label ?? '',
    cash: o?.own?.startCash ?? (typeof view.wallet?.cash === 'number' ? view.wallet.cash : null),
    job: view.career?.label ?? null, dream: o?.dream ? DREAMS[o.dream]?.label ?? '' : '',
  })
  const canvas = drawStoryCard({ theme: 'sunset', kicker: card.kicker, title: card.title, name: card.name, rows: card.rows, foot: card.foot, mark: loopMark(who.handle) })
  const blob = canvas ? await canvasPng(canvas) : null
  if (!blob) return null
  const link = loopLink(globalThis.location?.origin ?? '', 'start', profileOf(who.handle, who.id))
  return { loop: 'start', file: new File([blob], loopFile('start'), { type: 'image/png' }), text: startText(card, link), link }
}
</script>

<template>
  <LoopCardSheet title="What did you get?" alt="Your start in Allworld: job, home, money and a title" :make="make" @close="emit('close')" />
</template>
