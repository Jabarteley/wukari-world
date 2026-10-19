<script setup lang="ts">
// Stage mode in a room (docs/WORLD-EVENTS.md "Stage mode"): who is on the stage (AI marked), raise your hand, the question queue, and the
// moderator's buttons. Reused by any place with a stage (the Square's debate and speeches, a group room's talk; Phase 7/8). Voice follows
// the stage: listeners stay muted (the server refuses their unmute) and hear only the people on it (src/community.ts stageVoice).
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useApp } from '../../state/app.ts'
import { leaveStage, loadStage, stageAct, stageState } from './eventStore.ts'

const props = defineProps<{ room: string }>()
const { game, community } = useApp()
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => { void loadStage(props.room); timer = setInterval(() => { void loadStage(props.room) }, 8000) })
onBeforeUnmount(() => { if (timer !== undefined) clearInterval(timer); leaveStage() })
watch(() => props.room, (room) => { void loadStage(room) })
const stage = computed(() => (stageState.room === props.room && stageState.stage && stageState.stage.endsAt > game.serverNow() ? stageState.stage : null))
const me = computed(() => game.view.value.session?.id ?? '')
const moderating = computed(() => stage.value?.you === 'moderator')
// A listener who was talking when the stage opened is muted (only unmuting is refused by the controller).
watch(stage, (now) => {
  const voice = community.state.value?.voice
  if (now && now.you === 'audience' && voice?.on && !voice.muted) community.controller()?.toggleMute()
})
const question = ref(''), title = ref(''), problem = ref<string | null>(null)
async function act(op: string, extra: Record<string, unknown> = {}): Promise<void> { problem.value = await stageAct(op, extra); if (!problem.value && op === 'ask') question.value = '' }
</script>

<template>
  <section v-if="stage" class="stage-panel" data-world-event="stage" :data-stage-kind="stage.kind" aria-label="The stage">
    <h3>{{ stage.title }}</h3>
    <p class="social-note">{{ stage.kind === 'debate' ? 'A debate: candidates on the stage, questions from the audience.' : stage.kind === 'speech' ? 'A victory speech.' : 'A talk.' }} {{ stage.moderator === null ? 'The game moves the questions along.' : '' }}</p>
    <p class="stage-people"><b>On stage:</b> <template v-if="!stage.speakers.length">nobody yet</template><span v-for="(person, at) in stage.speakers" :key="person.id">{{ at ? ', ' : '' }}{{ person.name }}<template v-if="person.ai"> (AI)</template><button v-if="moderating && person.id !== me" type="button" class="social-btn" @click="act('down', { target: person.id })">Down</button></span></p>
    <p v-if="stage.invitedPeople.length" class="social-note">Invited: <span v-for="(person, at) in stage.invitedPeople" :key="person.id">{{ at ? ', ' : '' }}{{ person.name }}<template v-if="person.ai"> (AI)</template></span></p>
    <p v-if="stage.current" class="stage-current" data-world-event="stage-current"><b>Now:</b> {{ stage.current.name }} asks “{{ stage.current.text }}”</p>
    <div class="social-actions">
      <button v-if="stage.invited && stage.you === 'audience'" type="button" class="ui-button is-primary" :disabled="stageState.busy" @click="act('seat')">Take your seat</button>
      <button v-else-if="stage.you === 'speaker'" type="button" class="social-btn" :disabled="stageState.busy" @click="act('down')">Leave the stage</button>
      <button v-else-if="stage.you === 'audience' && !stage.handUp" type="button" class="social-btn" data-world-event="hand" :disabled="stageState.busy" @click="act('hand')">Raise hand</button>
      <button v-else-if="stage.handUp" type="button" class="social-btn" :disabled="stageState.busy" @click="act('unhand')">Lower hand</button>
      <button v-if="moderating" type="button" class="social-btn" :disabled="stageState.busy" @click="act('end')">End the stage</button>
    </div>
    <div v-if="moderating && stage.hands.length" class="stage-hands">
      <b>Hands up:</b>
      <span v-for="person in stage.hands" :key="person.id">{{ person.name }} <button type="button" class="social-btn" @click="act('invite', { target: person.id })">Bring up</button></span>
    </div>
    <form class="stage-ask" @submit.prevent="act('ask', { text: question })">
      <input v-model="question" maxlength="200" placeholder="Ask a question" aria-label="Your question for the stage">
      <button type="submit" class="social-btn" :disabled="stageState.busy || question.trim().length < 3">Ask</button>
    </form>
    <ol v-if="stage.queue.length" class="stage-queue">
      <li v-for="item in stage.queue.slice(0, 8)" :key="item.id">
        <span>{{ item.name }}: {{ item.text }}</span>
        <button type="button" class="social-btn" :disabled="item.mine || item.voted || stageState.busy" :aria-label="`Vote for this question (${item.votes})`" @click="act('upvote', { question: item.id })">▲ {{ item.votes }}</button>
        <template v-if="moderating"><button type="button" class="social-btn" @click="act('pick', { question: item.id })">Take</button><button type="button" class="social-btn" @click="act('dismiss', { question: item.id })">Skip</button></template>
      </li>
    </ol>
    <p v-if="problem" class="ui-error" role="alert">{{ problem }}</p>
  </section>
  <form v-else-if="stageState.canOpen && stageState.room === room" class="stage-open" @submit.prevent="act('open', { title, minutes: 60 })">
    <input v-model="title" maxlength="80" placeholder="Open a stage: its title" aria-label="Title of a new stage">
    <button type="submit" class="social-btn" :disabled="stageState.busy || title.trim().length < 3">Open a stage</button>
    <p v-if="problem" class="ui-error" role="alert">{{ problem }}</p>
  </form>
</template>

<style scoped>
.stage-panel { display: grid; gap: 6px; padding: 8px; border: 2px solid #7b2ff7; border-radius: 10px; }
.stage-panel h3 { margin: 0; font-size: 15px; }
.stage-people .social-btn { margin-left: 4px; }
.stage-current { padding: 6px; border-radius: 8px; background: var(--c-fill, #f4f0ff); }
.stage-hands { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.stage-ask, .stage-open { display: flex; gap: 6px; flex-wrap: wrap; }
.stage-ask input, .stage-open input { flex: 1 1 160px; min-height: 44px; font: 400 16px var(--font, sans-serif); padding: 4px 8px; border: 1px solid var(--c-line, #ccc); border-radius: 8px; }
.stage-queue { display: grid; gap: 4px; margin: 0; padding-left: 18px; font-size: 13px; }
.stage-queue li span { margin-right: 6px; }
</style>
