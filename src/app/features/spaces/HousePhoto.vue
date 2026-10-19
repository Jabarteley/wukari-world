<script setup lang="ts">
// The picture at the top of Houses: the player's own house as Walk in 3D builds it (housePhoto.ts). The slot (the drawing) shows
// until the picture exists, and stays when the 3D world is switched off, the player is offline, or drawing fails.
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useApp } from '../../state/app.ts'
import { worldRead } from './spacesClient.ts'
import { photographHouse } from './housePhoto.ts'

const { game } = useApp()
const src = ref<string | null>(null)
let gone = false

onMounted(async () => {
  if (!game.view.value.connected || typeof document === 'undefined') return
  try {
    const answer = await worldRead(game, { target: 'home' })
    if (gone || !answer.ok) return
    // A described copy of the player's real house is photographed as it is built; a model house keeps the drawing (its file is large).
    if (answer.world.house?.kind === 'model') return
    const url = await photographHouse({ grid: answer.world.grid, owned: answer.world.owned, style: answer.world.style as Record<string, number> | null, items: answer.world.items, house: answer.world.house?.kind === 'spec' ? { kind: 'spec', spec: answer.world.house.spec } : null })
    if (!gone) src.value = url
  } catch {
    // The drawing stays.
  }
})
onBeforeUnmount(() => { gone = true })
</script>

<template>
  <img v-if="src" :src="src" class="house-photo" alt="Your house, as it stands in 3D" data-house-photo>
  <slot v-else />
</template>

<style scoped>
.house-photo { display: block; width: 100%; aspect-ratio: 9 / 5; object-fit: cover; }
</style>
