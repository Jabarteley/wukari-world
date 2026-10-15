import { computed, shallowReactive, watch } from 'vue'
import type { RetentionHttpRoutes, RetentionView } from '../../../types/cadence.ts'
import type { TimedId } from '../../../types/protocol.ts'
import type { ApiError } from '../../types/client.ts'
import { useApp } from '../../state/app.ts'

type RhythmResponse = RetentionHttpRoutes['POST /api/retention/rhythm']['response']

interface RetentionState {
  view: RetentionView | null
  loading: boolean
  loadError: string
  saving: boolean | null
  saveError: string
  retryOptIn: boolean | null
}

interface HeldSetting { scope: string; optedIn: boolean; actionId: TimedId }

function problem(error: unknown, ambiguous: string): string {
  const failure = error as ApiError
  const known: Readonly<Record<string, string>> = {
    human_required: 'Only a human player can change rhythm tracking.',
    rhythm_unavailable: 'Rhythm tracking is not available right now.',
    invalid_setting: 'Choose whether rhythm tracking should be on or off.',
    invalid_city: 'Your current city could not be confirmed.',
  }
  return known[failure.code ?? ''] || failure.reason || (failure.status ? 'This setting was not saved. Try again.' : ambiguous)
}

export function useRetention() {
  const { game } = useApp()
  const state = shallowReactive<RetentionState>({ view: null, loading: false, loadError: '', saving: null, saveError: '', retryOptIn: null })
  let loadedScope = ''
  let scopeEpoch = 0
  let loadGeneration = 0
  let inFlightLoad: { epoch: number; generation: number; promise: Promise<void> } | null = null
  let held: HeldSetting | null = null
  const scope = () => `${game.session.value?.id ?? 'guest'}:${game.view.value.cityId}`
  const isCurrent = (requestScope: string, requestEpoch: number) => scope() === requestScope && loadedScope === requestScope && scopeEpoch === requestEpoch

  function reset(nextScope: string): void {
    if (loadedScope === nextScope) return
    loadedScope = nextScope
    scopeEpoch += 1
    loadGeneration += 1
    inFlightLoad = null
    state.view = null
    state.loading = false
    state.loadError = ''
    state.saving = null
    state.saveError = ''
    state.retryOptIn = null
    held = null
  }

  async function load(force = false): Promise<void> {
    const requestScope = scope()
    reset(requestScope)
    const requestEpoch = scopeEpoch
    if (!game.connected.value || (!force && state.view)) return
    if (!force && inFlightLoad?.epoch === requestEpoch) {
      await inFlightLoad.promise
      return
    }
    const generation = ++loadGeneration
    state.loading = true
    state.loadError = ''
    const promise = game.fetchJson<RetentionView>('/api/retention').then((answer) => {
      if (isCurrent(requestScope, requestEpoch) && loadGeneration === generation) state.view = answer
    }).catch((error) => {
      if (isCurrent(requestScope, requestEpoch) && loadGeneration === generation) state.loadError = problem(error, 'Rhythm details could not be loaded. Reconnect and try again.')
    }).finally(() => {
      if (isCurrent(requestScope, requestEpoch) && loadGeneration === generation) {
        state.loading = false
        inFlightLoad = null
      }
    })
    inFlightLoad = { epoch: requestEpoch, generation, promise }
    await promise
  }

  async function save(optedIn: boolean): Promise<boolean> {
    const requestScope = scope()
    reset(requestScope)
    const requestEpoch = scopeEpoch
    if (!game.connected.value || state.saving !== null) return false
    if (state.view?.rhythm.optedIn === optedIn) return true
    const request = held?.scope === requestScope && held.optedIn === optedIn
      ? held
      : { scope: requestScope, optedIn, actionId: game.newId() as TimedId }
    held = request
    state.saving = optedIn
    state.saveError = ''
    state.retryOptIn = null
    let posted = false
    try {
      await game.fetchJson<RhythmResponse>('/api/retention/rhythm', { method: 'POST', body: { cityId: game.view.value.cityId, actionId: request.actionId, optedIn } })
      posted = true
      if (!isCurrent(requestScope, requestEpoch)) return false
      await load(true)
      if (!isCurrent(requestScope, requestEpoch)) return false
      if (state.view?.rhythm.optedIn !== optedIn) {
        state.saveError = 'The setting may be saved, but it could not be confirmed. Retry to check it.'
        state.retryOptIn = optedIn
        return false
      }
      held = null
      game.toast(optedIn ? 'Rhythm tracking is on.' : 'Rhythm tracking is off.', 'good')
      return true
    } catch (error) {
      if (!isCurrent(requestScope, requestEpoch)) return false
      state.saveError = posted
        ? 'The setting may be saved, but it could not be confirmed. Retry to check it.'
        : problem(error, 'The answer did not arrive. Retry to confirm this setting.')
      state.retryOptIn = optedIn
      return false
    } finally {
      if (isCurrent(requestScope, requestEpoch)) state.saving = null
    }
  }

  const visible = computed(() => {
    const row = state.view
    return Boolean(row && (row.flags.rhythm || row.rhythm.optedIn || row.rhythm.lifetime > 0 || row.rhythm.recognition.length > 0))
  })

  const earnedRewards = computed(() => JSON.stringify([
    (game.view.value.episodes?.mementos ?? []).map(row => [row.id, row.grantedAt]),
    (game.view.value.projects?.mementos ?? []).map(row => [row.id, row.occurrence, row.earnedAt]),
  ]))

  watch([() => game.session.value?.id, () => game.view.value.cityId, () => game.connected.value, earnedRewards], ([, , connected]) => {
    reset(scope())
    if (connected) void load(true)
  })

  return { state, visible, load, save }
}
