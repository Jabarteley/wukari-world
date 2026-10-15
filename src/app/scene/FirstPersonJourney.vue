<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useApp } from '../state/app.ts'

const { game } = useApp()
const visible = ref(!document.hidden)
const visibility = () => { visible.value = !document.hidden }
document.addEventListener('visibilitychange', visibility)
onBeforeUnmount(() => document.removeEventListener('visibilitychange', visibility))
const action = computed(() => game.state.value.activeAction)
const ride = computed(() => {
  const trip = action.value
  if (trip?.kind === 'travel' && trip.mode === 'danfo') return 'bus'
  if (trip?.kind === 'intercity' && trip.mode !== 'air') return trip.mode === 'rail' ? 'rail' : 'bus'
  return null
})
const map = ref(false)
const boarding = computed(() => Boolean(action.value && action.value.duration - action.value.remaining < 1))
const weak = typeof navigator !== 'undefined' && navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4
watch(() => `${action.value?.kind}|${action.value?.id}`, () => { map.value = false })
</script>

<template>
  <Teleport to="body">
    <section v-if="visible && ride && game.mode.value === 'map'" class="first-person-journey" :class="{ 'show-map': map, 'is-rail': ride === 'rail', 'is-boarding': boarding, 'is-still': weak }" :aria-label="ride === 'rail' ? 'Seated rail journey' : 'Seated bus journey'">
      <div v-if="!map" class="carriage" aria-hidden="true">
        <div class="carriage-roof" />
        <div class="carriage-window"><div class="window-scenery"><i v-for="n in 12" :key="n" :style="{ height: `${20 + (n * 37) % 45}%`, width: `${24 + (n * 11) % 48}px` }" /></div><div class="window-divider" /></div>
        <div class="carriage-panel" /><div class="carriage-seat seat-left" /><div class="carriage-seat seat-right" /><div class="carriage-pole" />
      </div>
      <div class="journey-view-tools"><span v-if="!map">{{ boarding ? 'Boarding' : 'On board' }} · {{ ride === 'rail' ? 'Rail' : 'Bus' }}</span><button type="button" @click="map = !map">{{ map ? 'Return to seat' : 'View map' }}</button></div>
    </section>
  </Teleport>
</template>

<style scoped>
.first-person-journey{position:fixed;inset:0;z-index:5;pointer-events:none;color:#fff;font:600 13px/1.4 system-ui,sans-serif}
.carriage{position:absolute;inset:0;overflow:hidden;background:linear-gradient(#a9aea7 0 17%,#e5e0c8 17% 58%,#505c53 58% 76%,#24302e 76%)}
.carriage-roof{position:absolute;top:0;left:0;right:0;height:19%;background:repeating-linear-gradient(90deg,#969e97 0 19%,#c9cbbd 19% 20%);box-shadow:0 8px 25px #0006;border-bottom:8px solid #3a4541}
.carriage-window{position:absolute;top:20%;left:12%;right:8%;height:42%;overflow:hidden;border:14px solid #243532;border-radius:30px;background:linear-gradient(#a3c6cf 0 68%,#b2a886 68% 78%,#717870 78%);box-shadow:0 3px 0 #fff9,inset 0 0 45px #233d492e}
.window-scenery{position:absolute;inset:0 -80% 22% 0;display:flex;align-items:end;gap:4%;animation:passing-street 12s linear infinite}
.window-scenery i{flex:none;background:#697e75;box-shadow:inset 0 12px #8fa398}
.window-divider{position:absolute;left:48%;top:0;height:100%;width:12px;background:#263c38;box-shadow:3px 0 #adb7ad}
.carriage-panel{position:absolute;left:0;right:0;top:65%;height:12%;background:linear-gradient(#b8a67c,#847554);border-top:5px solid #d8c79a}
.carriage-seat{position:absolute;bottom:-8%;width:33%;height:38%;border:10px solid #1c302e;border-radius:35px 35px 0 0;background:repeating-linear-gradient(90deg,#374f49 0 8px,#405c53 8px 16px);box-shadow:0 -4px 2px #9dafa0,0 20px 55px #0008}
.seat-left{left:-12%;transform:rotate(7deg)}.seat-right{right:-6%;transform:rotate(-8deg)}
.carriage-pole{position:absolute;right:17%;top:8%;bottom:0;width:13px;border-radius:20px;background:linear-gradient(90deg,#5b604f,#f2d57d,#b5a15a);box-shadow:3px 0 5px #0004}
.is-rail .carriage-panel{background:linear-gradient(#b6c4c2,#809b98)}.is-rail .carriage-seat{background:repeating-linear-gradient(90deg,#275b68 0 9px,#306778 9px 18px)}
.journey-view-tools{position:absolute;top:30%;left:22px;display:grid;gap:8px;justify-items:start}.journey-view-tools span{padding:5px 10px;border-radius:12px;background:#102722dd}
button{min-height:44px;padding:10px 16px;border:1px solid #ffffff90;border-radius:24px;background:#132c2ee8;color:white;font:inherit;pointer-events:auto;cursor:pointer}button:focus-visible{outline:3px solid #ffd34d;outline-offset:3px}
.is-boarding .window-scenery,.is-still .window-scenery{animation:none}
@keyframes passing-street{to{transform:translateX(-42%)}}
@media(prefers-reduced-motion:reduce){.window-scenery{animation:none}}
</style>
