<script setup lang="ts">
// Match nights (docs/ALLWORLD-HOUSE.md "Match predictions"): the fixtures an admin listed, a pick before kick-off (a winner and, if you
// like, the score), the result an admin enters, the badge and the season's board. Never a stream, a score feed or money: watch where you
// usually watch, and talk it through in the viewing centre's voice room.
import { computed, onMounted, ref, watch as follow } from 'vue'
import { useApp } from '../../state/app.ts'
import { loadBoard, loadMatches, predict, watch } from './watchStore.ts'
import { shareCalledIt } from './watchCards.ts'
import { BADGE_WORDS, pickWords, scoreLine } from '../../../watch/predictions.ts'
import type { Outcome } from '../../../watch/predictions.ts'
import { venuesFor } from '../../../game/cities/runtime.ts'
import { shareGist } from '../growth/shareMoment.ts'
import type { MatchView } from '../../../types/watch.ts'

const { game, shell, goTo } = useApp()
const city = computed(() => game.cityId.value)
onMounted(() => { void loadMatches(city.value, true); void loadBoard(true) })
const now = computed(() => game.serverNow())
const viewing = computed(() => { try { return venuesFor(city.value).find((venue) => venue.scene.kind === 'viewing') ?? null } catch { return null } })
const scores = ref<Record<string, [string, string]>>({})
/** The two score boxes of each match (kept while the app is open). */
follow(() => watch.matches, (now) => { for (const item of now?.matches ?? []) scores.value[item.id] ??= ['', ''] }, { immediate: true })
const slot = (id: string): [string, string] => scores.value[id] ?? ['', '']
const problem = ref<string | null>(null)
const when = (at: number): string => new Date(at).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const sideName = (match: MatchView, w: Outcome): string => (w === 'draw' ? 'Draw' : match.teams ? match.teams[w === 'home' ? 0 : 1] : w)
async function pick(match: MatchView, w: Outcome): Promise<void> {
  const typed = scores.value[match.id], home = Number(typed?.[0]), away = Number(typed?.[1])
  const score: [number, number] | null = typed && typed[0] !== '' && typed[1] !== '' && Number.isInteger(home) && Number.isInteger(away) ? [home, away] : null
  problem.value = await predict(city.value, match.id, w, score)
  if (!problem.value) game.toast(`Your pick: ${pickWords(match.title, { w, ...(score ? { s: score } : {}), at: 0 })}`, 'good')
}
function goWatch(): void { if (viewing.value) { shell.close(); void goTo(viewing.value.id) } }
const fail = (): void => game.toast('That could not be shared. Try again.', 'error')
async function shareMine(match: MatchView): Promise<void> {
  if (!match.result || !match.badge || !match.season) return
  const points = watch.board?.me?.points ?? match.points ?? 0
  if (!(await shareCalledIt(match.title, match.result, match.badge, match.season, points))) fail()
}
</script>

<template>
  <div class="watch-part" data-watch="matches">
    <p class="social-note">Pick the winner before kick-off. A right winner is a point and the “Called it” badge; the exact score is three points and “Spot on”. Bragging rights only: no money, ever.</p>
    <p class="social-note">We never show the match: watch where you usually watch, and come to the viewing centre to talk it through (the room has voice).</p>
    <button v-if="viewing" type="button" class="ui-button" data-watch="go-viewing" @click="goWatch">Go to {{ viewing.label }}</button>
    <p v-if="problem" class="ui-error" role="alert">{{ problem }}</p>
    <p v-if="!watch.matches" class="social-note">Loading…</p>
    <p v-else-if="!watch.matches.matches.length" class="social-note">No fixtures are listed for the next two weeks. The weekly match night is Saturday at 20:00.</p>
    <article v-for="match in watch.matches?.matches ?? []" :key="match.id" class="watch-card" :data-watch-match="match.id">
      <header><strong>{{ match.title }}</strong><small>{{ when(match.start) }}</small></header>
      <template v-if="match.result">
        <p class="watch-big" data-watch="result">Full time: {{ scoreLine(match.title, match.result) }}</p>
        <p class="social-note">{{ match.right ?? 0 }} of {{ match.picks ?? 0 }} called it.</p>
        <p v-if="match.mine" class="social-note">You said: {{ pickWords(match.title, { ...match.mine, at: 0 }) }}<template v-if="match.badge"> · 🏅 {{ BADGE_WORDS[match.badge] }} (+{{ match.points }})</template><template v-else> · not this time</template></p>
        <div class="watch-row">
          <button v-if="match.badge" type="button" class="ui-button is-primary" data-watch="share-called" @click="shareMine(match)">Share: I called it</button>
          <button v-if="match.line" type="button" class="ui-button" data-watch="share-result" @click="shareGist(match.line, fail)">Share the result</button>
        </div>
      </template>
      <template v-else-if="match.teams">
        <p class="social-note">{{ match.counts.home + match.counts.draw + match.counts.away }} picks · {{ sideName(match, 'home') }} {{ match.counts.home }} · draw {{ match.counts.draw }} · {{ sideName(match, 'away') }} {{ match.counts.away }}</p>
        <p v-if="match.mine" class="social-note" data-watch="mine">Your pick: {{ pickWords(match.title, { ...match.mine, at: 0 }) }}</p>
        <template v-if="match.open">
          <div class="watch-score" role="group" :aria-label="`Score for ${match.title} (optional)`">
            <input v-model="slot(match.id)[0]" inputmode="numeric" maxlength="2" :aria-label="`${sideName(match, 'home')} goals`" placeholder="–">
            <span>:</span>
            <input v-model="slot(match.id)[1]" inputmode="numeric" maxlength="2" :aria-label="`${sideName(match, 'away')} goals`" placeholder="–">
            <small>score (optional)</small>
          </div>
          <div class="watch-row">
            <button v-for="w in (['home', 'draw', 'away'] as const)" :key="w" type="button" class="social-btn" :class="{ 'is-on': match.mine?.w === w }" :data-watch-pick="w" :disabled="watch.busy" @click="pick(match, w)">{{ sideName(match, w) }}</button>
          </div>
        </template>
        <p v-else class="social-note">{{ match.start <= now ? 'Kicked off: picks are closed. The result comes in after the final whistle.' : 'Picks open two weeks before kick-off.' }}</p>
      </template>
      <p v-else class="social-note">A match night at the viewing centre: nothing to pick.</p>
    </article>

    <section v-if="watch.board" class="watch-card" data-watch="board" aria-label="Season board">
      <header><strong>Season {{ watch.board.season }}</strong><small>{{ watch.board.players }} {{ watch.board.players === 1 ? 'fan' : 'fans' }} on the board</small></header>
      <p v-if="!watch.board.rows.length" class="social-note">No results yet this season.</p>
      <ol class="watch-board">
        <li v-for="row in watch.board.rows" :key="row.rank" :class="{ 'is-you': row.you }"><span>{{ row.rank }}. {{ row.name }}</span><b>{{ row.points }}</b></li>
      </ol>
      <p v-if="watch.board.me && !watch.board.rows.some((row) => row.you)" class="social-note">You: {{ watch.board.me.rank }}th with {{ watch.board.me.points }} points.</p>
    </section>
    <section v-if="watch.matches?.badges.length" class="watch-card" aria-label="Your badges">
      <header><strong>Your badges</strong></header>
      <p v-for="badge in watch.matches.badges.slice(0, 8)" :key="`${badge.fixture}${badge.kind}`" class="social-note">🏅 {{ BADGE_WORDS[badge.kind] }} · {{ badge.title }}</p>
    </section>
  </div>
</template>

<style scoped>
.watch-part { display: grid; gap: 10px; }
.watch-card { display: grid; gap: 6px; padding: 10px 12px; border: 1px solid var(--c-line, #ddd); border-radius: var(--r-sm, 10px); background: var(--c-fill, #f7f7f7); }
.watch-card header { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; }
.watch-card header small { color: var(--c-ink-2, #666); font-size: 12px; }
.watch-big { margin: 0; font-weight: 800; font-size: 17px; }
.watch-row { display: flex; flex-wrap: wrap; gap: 6px; }
.watch-row .is-on { background: var(--c-ink, #222); color: var(--c-bg, #fff); }
.watch-score { display: flex; align-items: center; gap: 6px; }
.watch-score input { width: 48px; min-height: 44px; text-align: center; font: 600 16px var(--font, sans-serif); border: 1px solid var(--c-line, #ccc); border-radius: 8px; }
.watch-score small { color: var(--c-ink-2, #666); }
.watch-board { margin: 0; padding: 0; list-style: none; display: grid; gap: 2px; }
.watch-board li { display: flex; justify-content: space-between; font-size: 14px; }
.watch-board .is-you { font-weight: 800; }
</style>
