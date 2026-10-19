<script setup lang="ts">
// The gist board of a community or a campus (docs/SOCIAL-GLUE.md "Gist board"). Posts show without names; the moderators (and the AI
// reviewer) know who wrote each one, and the page says so before anyone posts. No names of people and no @mentions; every post is read
// by the reviewer before it shows; Report, and "This is about me" (off the board at once). A moderator sees who wrote what, the posts
// held for them, and removes or restores. Nothing here shows an author to anyone else: the server never sends it.
import { onMounted, ref, watch } from 'vue'
import { useApp } from '../../state/app.ts'
import { GLUE } from '../../../glue/model.ts'
import type { GistBoardView, GistPostView } from '../../../types/glue.ts'
import { glueCall } from './glueStore.ts'

const props = defineProps<{ board: string }>()
const { game } = useApp()
const view = ref<GistBoardView | null>(null), text = ref(''), busy = ref(false), problem = ref<string | null>(null)
async function load(): Promise<void> {
  const r = await glueCall<GistBoardView>(`/api/glue/board?key=${encodeURIComponent(props.board)}`)
  if (r.ok) { view.value = r; problem.value = null } else { view.value = null; problem.value = r.reason }
}
onMounted(load)
watch(() => props.board, load)
async function send(path: string, body: Record<string, unknown>, done?: string): Promise<boolean> {
  busy.value = true
  const r = await glueCall(path, body)
  busy.value = false
  if (!r.ok) { game.toast(r.reason, 'error'); return false }
  if (done) game.toast(done)
  await load()
  return true
}
async function post(): Promise<void> { if (await send('/api/glue/board/posts', { board: props.board, body: text.value }, 'Sent. It shows once the reviewer has read it.')) text.value = '' }
const ago = (p: GistPostView): string => { const m = Math.max(1, Math.round((game.serverNow() - p.at) / 60000)); return m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d` }
const statusWord = { review: 'Being read by the reviewer', refused: 'Not posted', held: 'Taken off for a moderator to look at' } as const
</script>

<template>
  <section class="glue-board" data-glue="board" :aria-label="view?.name ?? 'Gist board'">
    <p v-if="problem" class="feed-note" role="status">{{ problem }}</p>
    <template v-if="view">
      <h3 class="ui-section">{{ view.name }}</h3>
      <p class="feed-note">Readers do not see who wrote a post. The moderators and the AI reviewer do, and every post is read before it shows. No names of people and no @mentions: talk about things, not people.</p>
      <form v-if="view.canPost" class="feed-card feed-compose" @submit.prevent="post">
        <textarea v-model="text" :maxlength="GLUE.board.max" placeholder="What is the gist?" aria-label="Post to the gist board" />
        <button type="submit" class="social-btn is-primary" :disabled="busy || text.trim().length < GLUE.board.min">Post</button>
      </form>
      <p v-else class="feed-note">{{ view.why }}</p>
      <div v-for="p in view.mine" :key="`m${p.id}`" class="feed-card" data-glue="my-gist">
        <small class="feed-note">Yours · {{ p.status ? statusWord[p.status] : '' }}</small>
        <p class="feed-body">{{ p.body }}</p>
        <p v-if="p.reason" class="feed-note">{{ p.reason }}</p>
      </div>
      <p v-if="!view.posts.length" class="feed-note">Nothing on the board yet.</p>
      <article v-for="p in view.posts" :key="p.id" class="feed-card" data-glue="gist">
        <small class="feed-note">{{ ago(p) }} ago<template v-if="p.mine"> · yours</template><template v-if="p.by"> · by {{ p.by.name }} (only moderators see this)</template><template v-if="p.reports"> · {{ p.reports }} reports</template></small>
        <p class="feed-body">{{ p.body }}</p>
        <div class="feed-row">
          <button type="button" class="feed-pill" :aria-pressed="p.sameMine" :disabled="busy" @click="send('/api/glue/board/same', { id: p.id, on: !p.sameMine })">Same{{ p.same ? ` · ${p.same}` : '' }}</button>
          <template v-if="!p.mine">
            <button type="button" class="feed-pill" :disabled="busy" @click="send('/api/glue/board/report', { id: p.id }, 'Reported. Thank you.')">Report</button>
            <button type="button" class="feed-pill" data-glue="about-me" :disabled="busy" @click="send('/api/glue/board/report', { id: p.id, aboutMe: true }, 'Taken off. A moderator will look at it.')">This is about me</button>
          </template>
          <button v-if="p.mine || view.moderator" type="button" class="feed-pill" :disabled="busy" @click="send('/api/glue/board/moderate', { id: p.id, action: 'remove' }, 'Removed.')">Remove</button>
        </div>
      </article>
      <template v-if="view.moderator && view.held?.length">
        <h3 class="ui-section">Held for moderators</h3>
        <article v-for="p in view.held" :key="`h${p.id}`" class="feed-card" data-glue="held">
          <small class="feed-note">by {{ p.by?.name }} · {{ p.aboutMe ? `${p.aboutMe} said it is about them` : '' }}{{ p.reports ? ` · ${p.reports} reports` : '' }}</small>
          <p class="feed-body">{{ p.body }}</p>
          <div class="feed-row">
            <button type="button" class="social-btn" :disabled="busy" @click="send('/api/glue/board/moderate', { id: p.id, action: 'restore' }, 'Back on the board.')">Put back</button>
            <button type="button" class="social-btn is-primary" :disabled="busy" @click="send('/api/glue/board/moderate', { id: p.id, action: 'remove' }, 'Removed.')">Remove</button>
          </div>
        </article>
      </template>
    </template>
  </section>
</template>
