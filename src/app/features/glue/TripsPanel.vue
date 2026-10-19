<script setup lang="ts">
// Group trips of a crew or community (docs/SOCIAL-GLUE.md "Group trips"): book one danfo (from the place you stand to another place in
// the city) or one flight (to another city) for the people you pick, everyone answers, and the organiser presses Go when everyone going
// is online (and, for a danfo, standing at the meeting point). They leave together and arrive together; each pays their own fare by the
// usual rules, and if anyone cannot, nobody leaves. Then the trip card.
import { computed, onMounted, ref, watch } from 'vue'
import { useApp } from '../../state/app.ts'
import { cityCatalogue } from '../../../game/cities/registry.ts'
import { GLUE } from '../../../glue/model.ts'
import type { TripMode } from '../../../glue/model.ts'
import type { TripView, TripsView } from '../../../types/glue.ts'
import type { CrewView } from '../../../types/feed.ts'
import TripCard from './TripCard.vue'
import { glue, glueCall } from './glueStore.ts'

const props = defineProps<{ crew: CrewView }>()
const { game } = useApp()
const me = computed(() => game.view.value.session?.id ?? '')
const trips = ref<TripView[]>([]), busy = ref(false), making = ref(false), problem = ref<string | null>(null)
const form = ref({ mode: 'danfo' as TripMode, to: '', members: [] as string[] })
const others = computed(() => props.crew.members.filter((m) => m.id !== me.value && !m.ai))
const small = computed(() => props.crew.size <= GLUE.trip.members)
const places = computed(() => game.view.value.venues.filter((v) => v.id !== 'home' && v.id !== game.state.value.location))
const cities = computed(() => cityCatalogue().filter((c) => c.open && c.id !== game.view.value.cityId).slice(0, 80))
async function load(): Promise<void> { const r = await glueCall<TripsView>(`/api/glue/trips?crew=${encodeURIComponent(props.crew.id)}`); if (r.ok) trips.value = r.trips }
onMounted(load)
watch(() => glue.rev.trip, load)
async function send(path: string, body: Record<string, unknown>, done?: string): Promise<boolean> {
  busy.value = true; problem.value = null
  const r = await glueCall(path, { ...body, cityId: game.view.value.cityId })
  busy.value = false
  if (!r.ok) { problem.value = r.reason; return false }
  if (done) game.toast(done)
  await load()
  return true
}
async function create(): Promise<void> {
  const body: Record<string, unknown> = { crew: props.crew.id, mode: form.value.mode, to: form.value.to }
  if (!small.value || form.value.members.length) body.members = form.value.members
  if (await send('/api/glue/trips', body, 'Trip booked. Everyone you picked has been asked.')) making.value = false
}
const answerWord = { yes: 'going', no: 'not going', waiting: 'not answered' } as const
</script>

<template>
  <section class="feed-card feed-form" data-glue="trips" aria-label="Group trips">
    <b>Group trips</b>
    <p class="feed-note">Book one danfo or one flight for {{ crew.name }}: everyone says yes, and you leave and arrive together. Each pays their own fare.</p>
    <button v-if="!making" type="button" class="social-btn is-primary" @click="making = true">Plan a trip</button>
    <form v-else class="feed-form" data-glue="trip-form" @submit.prevent="create">
      <label class="feed-row">By <select v-model="form.mode" @change="form.to = ''"><option value="danfo">Danfo (in this city)</option><option value="flight">Flight (to another city)</option></select></label>
      <label class="feed-row">To
        <select v-model="form.to"><option value="">Choose</option>
          <template v-if="form.mode === 'danfo'"><option v-for="v in places" :key="v.id" :value="v.id">{{ v.label }}</option></template>
          <template v-else><option v-for="c in cities" :key="c.id" :value="c.id">{{ c.name }}</option></template>
        </select>
      </label>
      <p class="feed-note">{{ form.mode === 'danfo' ? 'The danfo leaves from where you are standing: everyone meets you there.' : 'The flight leaves from your city.' }}</p>
      <label class="feed-row">Who comes {{ small ? '(everyone, unless you pick)' : `(pick up to ${GLUE.trip.members - 1})` }}
        <select v-model="form.members" multiple :size="Math.min(6, Math.max(2, others.length))"><option v-for="m in others" :key="m.id" :value="m.id">{{ m.name }}</option></select>
      </label>
      <div class="feed-row"><button type="submit" class="social-btn is-primary" :disabled="busy || !form.to">Book it</button><button type="button" class="feed-pill" @click="making = false">Cancel</button></div>
    </form>
    <p v-if="problem" class="social-note" role="alert">{{ problem }}</p>
    <article v-for="t in trips" :key="t.id" class="feed-card" :data-trip-state="t.state">
      <TripCard v-if="t.state === 'gone'" :trip="t" />
      <template v-else>
        <small class="feed-note">{{ t.mode === 'flight' ? 'Flight' : 'Danfo' }} · {{ t.fromName }} → {{ t.toName }} · by {{ t.by.name }}{{ t.state === 'called-off' ? ' · called off' : '' }}</small>
        <p class="feed-note">{{ t.members.map((m) => `${m.name}: ${answerWord[m.answer]}`).join(' · ') }}</p>
        <div v-if="t.state === 'open'" class="feed-row">
          <template v-if="t.myAnswer && !t.mine">
            <button type="button" class="social-btn" :class="{ 'is-primary': t.myAnswer !== 'yes' }" :disabled="busy" @click="send('/api/glue/trips/answer', { id: t.id, yes: true }, 'You are going.')">I'm in</button>
            <button type="button" class="feed-pill" :disabled="busy" @click="send('/api/glue/trips/answer', { id: t.id, yes: false })">Not this time</button>
          </template>
          <template v-if="t.mine">
            <button type="button" class="social-btn is-primary" :disabled="busy || Boolean(t.ready)" :title="t.ready ?? undefined" @click="send('/api/glue/trips/go', { id: t.id }, 'You are on your way, together.')">Go</button>
            <button v-for="m in t.members.filter((x) => x.answer === 'waiting')" :key="m.id" type="button" class="feed-pill" :disabled="busy" @click="send('/api/glue/trips/manage', { id: t.id, action: 'drop', member: m.id })">Go without {{ m.name }}</button>
            <button type="button" class="feed-pill" :disabled="busy" @click="send('/api/glue/trips/manage', { id: t.id, action: 'cancel' })">Call off</button>
          </template>
        </div>
        <p v-if="t.ready && t.state === 'open'" class="feed-note">{{ t.ready }}</p>
      </template>
    </article>
  </section>
</template>
