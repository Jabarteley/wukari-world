<script setup lang="ts">
import '../../../ui/controls.css'
import { computed, ref, watch } from 'vue'
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
const sharing = ref(false)
const error = ref<'unavailable' | 'network' | null>(null)
let generation = 0

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
  profile.value = null
  history.value = []
  error.value = null
  loadingMore.value = false
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

async function share(): Promise<void> {
  if (sharing.value) return
  sharing.value = true
  const expected = generation
  const current = await read(null, expected, true)
  if (!current) {
    sharing.value = false
    game.toast(props.own ? 'Your public profile is hidden or unavailable. Check Neighbours to change directory visibility.' : 'That public profile is unavailable.', 'error')
    return
  }
  profile.value = current
  history.value = current.history
  const url = shareUrl.value
  try {
    if (typeof globalThis.navigator?.share === 'function') {
      try {
        await globalThis.navigator.share({ title: `${current.name} on Allworld`, text: `${current.name}’s earned accomplishments on Allworld`, url })
        return
      } catch (cause) {
        if ((cause as { name?: string })?.name === 'AbortError') return
      }
    }
    const { copyText } = await import('../../../ui/share.ts')
    const copied = await copyText(url)
    game.toast(copied ? 'Public profile link copied.' : 'Could not copy the public profile link.', copied ? 'good' : 'error')
  } catch {
    game.toast('Could not share that profile.', 'error')
  } finally { sharing.value = false }
}

function openVisibility(): void { shell.open('neighbours') }

watch(() => [props.id, props.mode] as const, () => { void load() }, { immediate: true })
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
        <button v-if="profile" type="button" class="profile-share" :disabled="sharing" @click="share">{{ sharing ? 'Checking…' : 'Share' }}</button>
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
.profile-share,.profile-more { min-height: 40px; border: 1px solid color-mix(in srgb, var(--c-line) 72%, #286246); border-radius: 999px; background: var(--c-surface, #fff); color: #286246; font: 700 12px/1 var(--font); cursor: pointer; }
.profile-share { padding: 0 15px; }
.profile-more { width: 100%; }
.profile-share:disabled,.profile-more:disabled { cursor: default; opacity: .58; }
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
</style>
