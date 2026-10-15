<script setup lang="ts">
// "Spray": a packet of game money split at random among the friends in a group chat, for Eid, Christmas or a win. Same limits as a gift
// (the server refuses with its own reason); never real money. Fetched only when someone opens it from the "+" sheet of a group.
import { computed, ref } from 'vue'
import BaseButton from '../../ui/BaseButton.vue'
import { cityId, newClientId, perform } from '../social/useSocial.ts'
import { SPRAY_CHOICES, sprayLine, sprayWhy } from './sprayModel.ts'

const props = defineProps<{ conv: string; friends: number; offline: boolean }>()
const emit = defineEmits<{ done: [] }>()
const amount = ref(1000), busy = ref(false)
// One client id per packet form: pressing Spray again after a lost answer repeats the same request, so the packet is made once.
let clientId = newClientId()
const why = computed(() => (props.offline ? 'Reconnect to spray.' : sprayWhy(amount.value, props.friends)))
async function spray(): Promise<void> {
  if (busy.value || why.value) return
  busy.value = true
  const result = await perform('/api/social/spray', { conv: props.conv, amount: amount.value, cityId: cityId(), clientId }, 'Packet sprayed')
  busy.value = false
  if (result.ok) { clientId = newClientId(); emit('done') }
}
</script>

<template>
  <form class="messages-sheet-body spray" data-chat="spray" @submit.prevent="spray">
    <h3>Spray a packet</h3>
    <p class="messages-note">{{ sprayLine(amount, friends) || 'Share some game money with the group.' }}</p>
    <span class="spray-choices"><BaseButton v-for="choice in SPRAY_CHOICES" :key="choice" small :variant="choice === amount ? 'primary' : 'default'" @click="amount = choice">{{ choice.toLocaleString('en-NG') }}</BaseButton></span>
    <label for="spray-amount">Amount (₦)</label>
    <input id="spray-amount" v-model.number="amount" class="messages-field" name="amount" inputmode="numeric" autocomplete="off" aria-describedby="spray-why">
    <p id="spray-why" class="messages-note" :class="{ 'is-warn': why }" :role="why ? 'alert' : undefined">{{ why }}</p>
    <span class="bubble-actions is-start">
      <BaseButton small variant="primary" type="submit" :disabled="busy || Boolean(why)">{{ busy ? 'Spraying…' : 'Spray' }}</BaseButton>
      <BaseButton small @click="emit('done')">Cancel</BaseButton>
    </span>
  </form>
</template>

<style scoped>
.spray-choices { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
</style>
