<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useApp } from '../state/app.ts'
import { onViewPreferencesChange, readViewPreferences, setViewPreferences } from '../../scene/first-person/preferences.ts'

const FirstPersonJourney = defineAsyncComponent(() => import('./FirstPersonJourney.vue'))

const props = defineProps<{ hostRevision: number }>()
const { scene, shell, game } = useApp()
const first = ref(readViewPreferences().mode === 'first')
const loading = ref(false), error = ref(''), failed = ref(false), suspended = ref(false)
const active = computed(() => first.value && !loading.value && !failed.value && !suspended.value)
const buttonLabel = computed(() => {
  if (loading.value) return 'Loading first person view'
  if (suspended.value) return 'Third person view active on campus. Turn off first person preference'
  if (failed.value && first.value) return 'First person view failed to load. Retry'
  return first.value ? 'First person view active. Switch to third person view' : 'Third person view active. Switch to first person view'
})
const buttonTitle = computed(() => suspended.value ? 'Turn off first person preference' : failed.value && first.value ? 'Retry first person view' : first.value ? 'Switch to third person view' : 'Switch to first person view')
let revision = 0, gone = false
async function apply(): Promise<void> {
  const mine = ++revision, host = scene.venue.value
  first.value = readViewPreferences().mode === 'first'
  error.value = ''; failed.value = false; suspended.value = false
  if (!host) { loading.value = false; return }
  if (!first.value || game.mode.value !== 'venue') { loading.value = false; host.setView(null); return }
  loading.value = true
  try {
    const { createFirstPerson } = await import('../../scene/first-person/controller.ts')
    if (gone || mine !== revision || host !== scene.venue.value) return
    const supported = host.setView(context => createFirstPerson(context, () => !shell.sheet.value && game.mode.value === 'venue'))
    if (!supported && host.host) { suspended.value = true; error.value = 'Campus uses third person. First person will resume when you leave.' }
  } catch {
    if (!gone && mine === revision) { host.setView(null); failed.value = true; error.value = 'First person could not load. Tap to retry.' }
  } finally { if (!gone && mine === revision) loading.value = false }
}
const stop = onViewPreferencesChange(() => {
  if (first.value !== (readViewPreferences().mode === 'first')) void apply()
})
function toggle(): void {
  if (failed.value && first.value) { void apply(); return }
  if (!setViewPreferences({ mode: first.value ? 'third' : 'first' })) error.value = 'This view is kept for this visit; device storage is unavailable.'
}
watch(scene.venue, () => { void apply() })
watch(() => props.hostRevision, () => { void apply() })
watch(game.mode, () => { void apply() })
watch(shell.sheet, () => { scene.venue.value?.update() })
onMounted(() => { void apply() })
onBeforeUnmount(() => { gone = true; revision++; stop(); scene.venue.value?.setView(null) })
</script>

<template>
  <FirstPersonJourney v-if="first && game.mode.value === 'map' && game.state.value.activeAction" />
  <div v-show="game.mode.value === 'venue'" class="scene-view-choice">
    <button type="button" :class="{ 'is-loading': loading, 'is-failed': failed }" :aria-label="buttonLabel" :aria-pressed="active" :aria-busy="loading" :disabled="loading" :title="buttonTitle" @click="toggle">
      <svg v-if="loading" class="scene-view-spinner" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /></svg>
      <svg v-else-if="failed" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 7v5h-5M18.2 12a6.5 6.5 0 1 1-1.9-4.6L19 10" /></svg>
      <svg v-else-if="first" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3" /><path d="M6.5 20c.4-4 2.2-6 5.5-6s5.1 2 5.5 6" /></svg>
      <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.5 5.5-9.5 5.5S2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.5" /></svg>
      <span>{{ loading ? 'Loading' : failed ? 'Retry' : suspended ? 'First person paused' : first ? 'Third person' : 'First person' }}</span>
    </button>
    <span v-if="loading" class="scene-view-live" role="status">Loading first person view</span>
    <small v-if="error" role="status">{{ error }}</small>
  </div>
</template>

<style scoped>
.scene-view-choice{position:absolute;inset-inline-end:max(12px,env(safe-area-inset-right));top:max(72px,calc(env(safe-area-inset-top) + 64px));z-index:4;display:grid;justify-items:end;gap:6px;max-width:min(220px,calc(100% - 24px));pointer-events:none}
button{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:6px;min-width:44px;min-height:44px;padding:0 12px 0 10px;border:1px solid #ffffffb8;border-radius:24px;background:#132c2ee8;color:#fff;font:700 12px/1 system-ui,sans-serif;box-shadow:0 2px 10px #0003;backdrop-filter:blur(6px);pointer-events:auto;cursor:pointer;-webkit-tap-highlight-color:transparent}
button svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;flex:none}
button:focus-visible{outline:3px solid #ffd34d;outline-offset:3px}button:disabled{opacity:.72;cursor:wait}
.scene-view-spinner{animation:scene-view-spin .8s linear infinite}.scene-view-spinner circle{stroke-dasharray:34 16}
.scene-view-live{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
small{max-width:100%;background:#132c2eee;color:#fff;border-radius:8px;padding:8px;font:500 12px/1.4 system-ui,sans-serif;text-align:right;overflow-wrap:anywhere}
@keyframes scene-view-spin{to{transform:rotate(360deg)}}
@media(max-width:720px){.scene-view-choice{inset-inline-end:max(8px,env(safe-area-inset-right));top:max(110px,calc(env(safe-area-inset-top) + 104px));max-width:min(200px,calc(100% - 16px))}}
@media(prefers-reduced-motion:reduce){.scene-view-spinner{animation:none}}
</style>
