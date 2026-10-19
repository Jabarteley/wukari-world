<script setup lang="ts">
// Share a duet (docs/SHARE-LOOPS.md): the two clips side by side made into one video on this device (./duetComposite.ts), with both
// handles and the @handle mark, for the phone's share sheet. It takes as long as the longer clip; the sheet says so while it works.
import LoopCardSheet from './LoopCardSheet.vue'
import { composeDuet, duetTitle } from './duetComposite.ts'
import { loopFile, loopLink, loopMark, loopText, profileOf } from './loopsModel.ts'
import { whoAmI } from './loopShare.ts'
import type { LoopShare } from './loopShare.ts'
import { mediaUrl } from '../feed/feedApi.ts'
import type { PostView } from '../../../types/feed.ts'

const props = defineProps<{ post: PostView }>()
const emit = defineEmits<{ close: [] }>()

async function make(): Promise<LoopShare | null> {
  const first = props.post.duet, second = props.post.media
  if (!first || !second) return null
  const who = await whoAmI()
  const title = duetTitle({ name: first.by.name, handle: first.by.handle ?? null }, { name: props.post.by.name, handle: props.post.by.handle ?? null })
  const made = await composeDuet(mediaUrl(first.media.hash), mediaUrl(second.hash), title, loopMark(who.handle))
  const link = loopLink(globalThis.location?.origin ?? '', 'duet', profileOf(props.post.by.handle, props.post.by.id))
  return { loop: 'duet', file: new File([made.blob], loopFile('duet', made.choice.type), { type: made.choice.type }), text: loopText([`Duet · ${title} 🎬`, 'Answer it with yours on Allworld.'], link), link }
}
</script>

<template>
  <LoopCardSheet title="Share the duet" alt="The two clips side by side" :make="make" note="Made on your phone, as long as the longer clip. Nothing is sent until you share it." @close="emit('close')" />
</template>
