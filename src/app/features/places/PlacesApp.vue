<script setup lang="ts">
// The doors of the places: the Square (how many are in it) and the rooms of the caller's group chats. Stepping in is free and
// instant from any city, and the life stays where it is (placesStore.ts; the rules are server/social/places.ts).
import '../../../ui/controls.css'
import '../../../ui/panels/social.css'
import { computed, onMounted } from 'vue'
import { useApp } from '../../state/app.ts'
import GameIcon from '../../ui/GameIcon.vue'
import { placeNow } from './placeState.ts'
import { enterRoom, enterSquare, loadPlaces, places, stepOut } from './placesStore.ts'

const { game, shell } = useApp()
const offline = computed(() => !game.view.value.connected)
const guest = computed(() => game.view.value.onboarding?.required === true)
onMounted(() => { void loadPlaces() })
const inSquare = computed(() => placeNow.value?.kind === 'square')
const inRoom = (id: string): boolean => placeNow.value?.kind === 'room' && placeNow.value.id === id
const squareLine = computed(() => (places.squareHere > 0 ? `${places.squareHere} ${places.squareHere === 1 ? 'person is' : 'people are'} there now` : 'Be the first one there'))
</script>

<template>
  <section class="places-app" aria-label="Places" data-place="app">
    <p v-if="offline" class="ui-note" role="status">Reconnect to step into a place.</p>
    <div v-if="places.error" class="places-load-error" role="alert">
      <p class="ui-error">{{ places.error }}</p>
      <button type="button" class="ui-button" data-place="retry-load" :disabled="places.loading" @click="loadPlaces()">{{ places.loading ? 'Trying again…' : 'Try again' }}</button>
    </div>
    <p v-else-if="places.loading && !places.listed" class="social-note" role="status">Loading your places…</p>

    <h3 class="ui-section">The Square</h3>
    <div class="ui-card places-card">
      <strong><GameIcon inline name="globe" /> One square for the whole world</strong>
      <p>Everybody online can stand here, whichever city they live in. Walk up to people, chat, and talk by voice. It costs nothing and your life stays where it is.</p>
      <p class="social-note" role="status">{{ squareLine }}</p>
      <button v-if="!inSquare" type="button" class="ui-button is-primary is-block" data-place="go-square" :disabled="offline || guest || Boolean(places.busy)" @click="enterSquare()">{{ places.busy === 'square' ? 'Opening the Square…' : 'Go to the Square' }}</button>
      <button v-else type="button" class="ui-button is-block" data-place="leave-square" @click="stepOut()">Step out of the Square</button>
    </div>

    <h3 class="ui-section">Your group rooms</h3>
    <p class="social-note">Every group chat has a room. Its members furnish it together, and its link lets anyone you choose come in and talk.</p>
    <div v-if="places.rooms.length" class="social-list" data-place="rooms">
      <div v-for="room in places.rooms" :key="room.id" class="social-row" :data-room="room.id">
        <span class="social-avatar" aria-hidden="true"><GameIcon name="home" inline /></span>
        <div><strong>{{ room.name }}</strong><small>{{ room.members }} {{ room.members === 1 ? 'member' : 'members' }} · {{ room.here ? `${room.here} inside now` : 'empty now' }}{{ room.link ? ' · link on' : '' }}</small></div>
        <span class="social-actions">
          <button v-if="!inRoom(room.id)" type="button" class="social-btn is-primary" :disabled="offline || Boolean(places.busy)" @click="enterRoom(room.id)">Go in</button>
          <button v-else type="button" class="social-btn" @click="stepOut()">Step out</button>
        </span>
      </div>
    </div>
    <template v-else-if="places.listed">
      <p class="social-note">You are not in a group yet. Make one in Messages: it can be just you to start with, and you can send its room link to anyone.</p>
      <button type="button" class="ui-button is-block" data-place="to-messages" @click="shell.open('messages')">Open Messages</button>
    </template>
  </section>
</template>

<style scoped>
.places-app { display: grid; gap: 8px; min-width: 0; overflow-wrap: anywhere; }
.places-load-error { display: grid; justify-items: start; gap: 6px; }
.places-load-error p { margin: 0; }
.places-card { display: grid; gap: 6px; }
.places-card p { margin: 0; font-size: 14px; }
.places-app .social-row { flex-wrap: wrap; }
.places-app .social-row > div { flex: 1 1 150px; min-width: 0; }
</style>
