<script setup lang="ts">
import '../../../ui/controls.css'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { ApiError } from '../../types/client.ts'
import type { PublicCharacterProfile, PublicHistoryEntry } from '../../../types/public-profile.ts'
import type { ExecutionOrigin } from '../../../types/progression.ts'
import { useApp } from '../../state/app.ts'
import GameIcon from '../../ui/GameIcon.vue'

const props = withDefaults(defineProps<{
  id: string
  name?: string
  mode?: 'profile' | 'no-records'
  own?: boolean
  actorLabel?: 'AI resident' | 'AI house character' | 'NPC'
}>(), { name: '', mode: 'profile', own: false, actorLabel: 'NPC' })

const { game, shell } = useApp()
const profile = ref<PublicCharacterProfile | null>(null)
const history = ref<PublicHistoryEntry[]>([])
const loading = ref(false)
const loadingMore = ref(false)
type ShareState =
  | { kind: 'closed' }
  | { kind: 'checking' }
  | { kind: 'ready'; url: string; copy: 'idle' | 'copying' | 'copied' | 'failed' }
const shareState = ref<ShareState>({ kind: 'closed' })
const error = ref<'unavailable' | 'network' | null>(null)
let generation = 0, shareOperation = 0

const label = computed(() => profile.value?.kind === 'agent' ? 'Agent character' : 'Human character')
const shareUrl = computed(() => `${globalThis.location?.origin ?? ''}/p/${encodeURIComponent(props.id)}`)
const recordlessText = computed(() => `${props.actorLabel} — no earned accomplishment records are available.`)
const date = new Intl.DateTimeFormat('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric' })
const kindLabel: Record<PublicHistoryEntry['kind'], string> = {
  achievement: 'Achievement', story: 'Story', project: 'Project', collection: 'Collection',
}
const originLabel: Record<ExecutionOrigin, string> = {
  human: 'Human play',
  'delegated-agent': 'Delegated assistance',
  'agent-character': 'Agent play',
  system: 'Game system',
  unknown: 'Origin not recorded',
}
const originsText = (origins: readonly ExecutionOrigin[]): string => origins.length ? origins.map(origin => originLabel[origin]).join(', ') : 'Origin not recorded'

function errorKind(value: unknown): 'unavailable' | 'network' {
  const problem = value as ApiError
  return problem?.status === 404 || problem?.code === 'profile_unavailable' ? 'unavailable' : 'network'
}

async function read(after: string | null, expected: number, quiet = false): Promise<PublicCharacterProfile | null> {
  if (!quiet) error.value = null
  const query = after ? `?after=${encodeURIComponent(after)}` : ''
  try {
    const answer = await game.fetchJson<{ profile: PublicCharacterProfile }>(`/api/profiles/${encodeURIComponent(props.id)}${query}`)
    if (expected !== generation || props.mode !== 'profile') return null
    return answer.profile
  } catch (cause) {
    if (expected === generation && !quiet) error.value = errorKind(cause)
    return null
  }
}

async function load(): Promise<void> {
  const expected = ++generation
  shareOperation += 1
  profile.value = null
  history.value = []
  error.value = null
  loadingMore.value = false
  shareState.value = { kind: 'closed' }
  if (props.mode !== 'profile') return
  loading.value = true
  const next = await read(null, expected)
  if (expected === generation) {
    profile.value = next
    history.value = next?.history ?? []
    loading.value = false
  }
}

async function loadMore(): Promise<void> {
  const current = profile.value
  if (!current?.next || loadingMore.value) return
  const expected = generation
  loadingMore.value = true
  const next = await read(current.next, expected)
  if (expected === generation && next) {
    const seen = new Set(history.value.map(item => `${item.kind}\u0000${item.id}\u0000${item.earnedAt}`))
    history.value = [...history.value, ...next.history.filter(item => !seen.has(`${item.kind}\u0000${item.id}\u0000${item.earnedAt}`))]
    profile.value = { ...current, next: next.next }
  }
  if (expected === generation) loadingMore.value = false
}

function bounded<T>(work: Promise<T>, ms: number): Promise<{ kind: 'value'; value: T } | { kind: 'timeout' } | { kind: 'failed' }> {
  return new Promise((resolve) => {
    let done = false
    const timer = globalThis.setTimeout(() => { if (!done) { done = true; resolve({ kind: 'timeout' }) } }, ms)
    void work.then((value) => {
      if (done) return
      done = true
      globalThis.clearTimeout(timer)
      resolve({ kind: 'value', value })
    }, () => {
      if (done) return
      done = true
      globalThis.clearTimeout(timer)
      resolve({ kind: 'failed' })
    })
  })
}

async function share(): Promise<void> {
  if (shareState.value.kind === 'checking') return
  if (shareState.value.kind === 'ready') { shareOperation += 1; shareState.value = { kind: 'closed' }; return }
  const operation = ++shareOperation
  shareState.value = { kind: 'checking' }
  const expected = generation
  const checked = await bounded(read(null, expected, true), 8000)
  if (expected !== generation || operation !== shareOperation || props.mode !== 'profile') return
  if (checked.kind !== 'value') {
    shareState.value = { kind: 'closed' }
    game.toast(checked.kind === 'timeout' ? 'The public profile check took too long. Try again.' : 'The public profile could not be checked. Try again.', 'error')
    return
  }
  const current = checked.value
  if (!current) {
    shareState.value = { kind: 'closed' }
    game.toast(props.own ? 'Your public profile is hidden or unavailable. Check Neighbours to change directory visibility.' : 'That public profile is unavailable.', 'error')
    return
  }
  profile.value = current
  history.value = current.history
  shareState.value = { kind: 'ready', url: shareUrl.value, copy: 'idle' }
}

async function copyLink(): Promise<void> {
  const state = shareState.value
  if (state.kind !== 'ready' || state.copy === 'copying') return
  const expected = generation, operation = shareOperation, url = state.url
  shareState.value = { ...state, copy: 'copying' }
  const copied = await bounded(import('../../../ui/share.ts').then(({ copyText }) => copyText(url)), 4000)
  if (expected !== generation || operation !== shareOperation || shareState.value.kind !== 'ready' || shareState.value.url !== url) return
  const success = copied.kind === 'value' && copied.value === true
  shareState.value = { kind: 'ready', url, copy: success ? 'copied' : 'failed' }
  game.toast(success ? 'Public profile link copied.' : 'Copy failed. Select the link and copy it manually.', success ? 'good' : 'error')
}

function selectLink(event: FocusEvent): void { if (event.currentTarget instanceof HTMLInputElement) event.currentTarget.select() }

function openVisibility(): void { shell.open('neighbours') }

watch(() => [props.id, props.mode] as const, () => { void load() }, { immediate: true })
onBeforeUnmount(() => { generation += 1; shareOperation += 1 })
</script>

<template>
  <section class="public-profile" :aria-label="`${name || 'Character'} accomplishment record`">
    <template v-if="mode === 'no-records'">
      <div class="profile-kicker"><GameIcon name="passport" :size="18" /><b>Accomplishment record</b></div>
      <p class="profile-empty">{{ recordlessText }}</p>
    </template>
    <template v-else>
      <div class="profile-head">
        <div><span>Accomplishment record</span><b v-if="profile">{{ label }}</b></div>
        <button v-if="profile" type="button" class="profile-share" :disabled="shareState.kind === 'checking'" :aria-expanded="shareState.kind === 'ready'" @click="share">{{ shareState.kind === 'checking' ? 'Checking…' : shareState.kind === 'ready' ? 'Hide link' : 'Share' }}</button>
      </div>

      <p v-if="loading" class="profile-status" role="status">Reading earned accomplishments…</p>
      <div v-else-if="error === 'unavailable'" class="profile-status is-warn" role="status">
        <p>{{ own ? 'Your public accomplishment profile is hidden or unavailable.' : 'This public accomplishment profile is unavailable.' }}</p>
        <button v-if="own" type="button" class="social-btn" @click="openVisibility">Open Neighbours privacy</button>
      </div>
      <div v-else-if="error === 'network'" class="profile-status is-warn" role="status">
        <p>The accomplishment record could not be read.</p>
        <button type="button" class="social-btn" @click="load">Retry</button>
      </div>
      <template v-else-if="profile">
        <div v-if="shareState.kind === 'ready'" class="profile-share-panel" role="group" aria-label="Public profile link">
          <label><span>Public profile link</span><input type="url" :value="shareState.url" readonly spellcheck="false" @focus="selectLink" @click="selectLink"></label>
          <button type="button" class="profile-copy" :disabled="shareState.copy === 'copying'" @click="copyLink">{{ shareState.copy === 'copying' ? 'Copying…' : shareState.copy === 'copied' ? 'Copy again' : shareState.copy === 'failed' ? 'Try copy again' : 'Copy link' }}</button>
          <p v-if="shareState.copy === 'failed'" role="status">Copy failed. Select the link and copy it manually.</p>
          <p v-else-if="shareState.copy === 'copied'" role="status">Link copied.</p>
        </div>
        <p v-if="own" class="profile-privacy">Your public profile shows earned achievements and completed stories. Hide it through Neighbours.</p>
        <dl class="profile-counts">
          <div><dt>Badges</dt><dd>{{ profile.counts.achievements }}</dd></div>
          <div><dt>Stories</dt><dd>{{ profile.counts.stories }}</dd></div>
          <div><dt>Projects</dt><dd>{{ profile.counts.projects }}</dd></div>
          <div><dt>Collections</dt><dd>{{ profile.counts.collections }}</dd></div>
        </dl>
        <ul v-if="profile.achievements.length" class="profile-badges" aria-label="Earned badges">
          <li v-for="badge in profile.achievements" :key="badge.id"><GameIcon :name="badge.icon" :size="17" /><span><b>{{ badge.title }}</b><small>{{ date.format(new Date(badge.earnedAt)) }} · {{ originsText(badge.origins) }}<template v-if="badge.pinned"> · pinned</template></small></span></li>
        </ul>
        <ul v-if="history.length" class="profile-history" aria-label="Accomplishment history">
          <li v-for="item in history" :key="`${item.kind}:${item.id}:${item.earnedAt}`">
            <span class="profile-kind">{{ kindLabel[item.kind] }}</span>
            <span><b>{{ item.title }}</b><small>{{ date.format(new Date(item.earnedAt)) }} · {{ originsText(item.origins) }}</small><small v-if="item.memento">{{ item.memento.icon }} {{ item.memento.title }} — {{ item.memento.description }}</small></span>
          </li>
        </ul>
        <p v-else class="profile-empty">No earned accomplishment records yet.</p>
        <button v-if="profile.next" type="button" class="profile-more" :disabled="loadingMore" @click="loadMore">{{ loadingMore ? 'Reading…' : 'Older accomplishments' }}</button>
      </template>
    </template>
  </section>
</template>

<style scoped>
.public-profile { display: grid; gap: 10px; min-width: 0; margin: 14px 0; padding: 14px; border: 1px solid color-mix(in srgb, var(--c-line) 76%, #2f7652); border-radius: 15px; background: linear-gradient(145deg, color-mix(in srgb, var(--c-fill) 90%, #e5f4ea), var(--c-surface, #fff)); }
.profile-kicker,.profile-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; color: #286246; }
.profile-kicker { justify-content: flex-start; }
.profile-head div { display: grid; gap: 1px; }
.profile-head span { color: var(--c-muted); font-size: 11px; font-weight: 700; letter-spacing: .04em; }
.profile-head b { color: var(--c-ink); font-size: 15px; }
.profile-share,.profile-copy,.profile-more { min-height: 44px; border: 1px solid color-mix(in srgb, var(--c-line) 72%, #286246); border-radius: 999px; background: var(--c-surface, #fff); color: #286246; font: 700 12px/1 var(--font); cursor: pointer; }
.profile-share { padding: 0 15px; }
.profile-copy { padding: 0 14px; }
.profile-more { width: 100%; }
.profile-share:disabled,.profile-copy:disabled,.profile-more:disabled { cursor: default; opacity: .58; }
.profile-share-panel { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 7px; min-width: 0; padding: 10px; border-radius: 12px; background: color-mix(in srgb, var(--c-fill) 84%, #d7edde); }
.profile-share-panel label { display: grid; gap: 4px; min-width: 0; color: var(--c-muted); font-size: 10px; font-weight: 700; }
.profile-share-panel input { width: 100%; min-width: 0; min-height: 44px; box-sizing: border-box; padding: 8px 10px; border: 1px solid var(--c-line); border-radius: 9px; background: var(--c-surface, #fff); color: var(--c-ink); font: 12px/1.3 var(--font); }
.profile-share-panel p { grid-column: 1 / -1; margin: 0; color: var(--c-muted); font-size: 10px; line-height: 1.4; }
.profile-status,.profile-empty,.profile-privacy { margin: 0; color: var(--c-muted); font-size: 12px; line-height: 1.45; }
.profile-status.is-warn { display: grid; gap: 8px; color: var(--c-ink); }
.profile-status p { margin: 0; }
.profile-counts { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 5px; margin: 0; }
.profile-counts div { display: grid; gap: 2px; min-width: 0; padding: 8px 4px; border-radius: 10px; background: color-mix(in srgb, var(--c-fill) 86%, #d7edde); text-align: center; }
.profile-counts dt { overflow: hidden; color: var(--c-muted); font-size: 9px; text-overflow: ellipsis; }
.profile-counts dd { margin: 0; color: var(--c-ink); font-size: 17px; font-weight: 800; }
.profile-badges,.profile-history { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
.profile-badges li,.profile-history li { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 8px; align-items: start; min-width: 0; padding: 8px 0; border-top: 1px solid var(--c-line); }
.profile-badges span,.profile-history li > span:last-child { display: grid; gap: 2px; min-width: 0; }
.profile-badges b,.profile-history b { overflow-wrap: anywhere; font-size: 12px; }
.profile-badges small,.profile-history small { color: var(--c-muted); font-size: 10px; line-height: 1.4; }
.profile-kind { min-width: 58px; padding: 4px 6px; border-radius: 999px; background: #e2f2e7; color: #286246; font-size: 9px; font-weight: 800; text-align: center; }
@container (max-width: 310px) { .profile-counts { grid-template-columns: repeat(2, 1fr); } }
@container (max-width: 340px) { .profile-share-panel { grid-template-columns: minmax(0, 1fr); } .profile-copy { width: 100%; } }
</style>
