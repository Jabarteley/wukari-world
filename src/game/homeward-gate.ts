/** Load the route planner and frozen ticket reader before rebuilding a life that may use them. */
import type { HomewardLinksFrom, HomewardIsOpen, HomewardQuote } from './cities/homewardRoute.ts'
import type { SavedActiveAction } from '../types/registry.ts'
import type { HomewardTicket, LifeContext, LifeState } from '../types/life.ts'
import { dataField, plainRecord as record, ownValue as own } from './snapshot-fields.ts'

interface HomewardRules {
  planHomewardRoute(from: string, to: string, links: HomewardLinksFrom, open: HomewardIsOpen): HomewardQuote | null
  readHomewardTicket(value: SavedActiveAction, state: LifeState, ctx: LifeContext): HomewardTicket | null
}
let rules: HomewardRules | null = null
let loading: Promise<void> | null = null
export const HOMEWARD_V1_MAX_FARE = 1_000_000

export function installHomewardRules(next: HomewardRules): void {
  if (typeof next.planHomewardRoute !== 'function' || typeof next.readHomewardTicket !== 'function') {
    throw new TypeError('Invalid homeward rules.')
  }
  rules = { planHomewardRoute: next.planHomewardRoute, readHomewardTicket: next.readHomewardTicket }
}

function homewardRules(): HomewardRules {
  if (!rules) throw new TypeError('Homeward rules have not loaded.')
  return rules
}

export function planHomeward(...args: Parameters<HomewardRules['planHomewardRoute']>): HomewardQuote | null {
  return homewardRules().planHomewardRoute(...args)
}

export function readHomewardTicket(...args: Parameters<HomewardRules['readHomewardTicket']>): HomewardTicket | null {
  return homewardRules().readHomewardTicket(...args)
}

/** Conservative loading hints only; the installed rules still validate every field and decide eligibility. */
function homewardMarker(raw: Record<string, unknown>): boolean {
  const active = own(raw, 'activeAction')
  return record(active) && own(active, 'kind') === 'homeward'
}

export function hasHomewardMarker(raw: unknown): boolean {
  try { return record(raw) && homewardMarker(raw) } catch { return false }
}

/** A present malformed liability is never evidence that an issued loan was repaid. */
export function assertHomewardLiability(raw: unknown): void {
  if (!record(raw) || !homewardMarker(raw)) return
  const travel = own(raw, 'travel')
  const debt = record(travel) ? dataField(travel, 'rideDebt') : null
  if (debt === null || (debt && (!Number.isSafeInteger(debt.value)
    || (debt.value as number) < 0 || (debt.value as number) > HOMEWARD_V1_MAX_FARE))) {
    throw new TypeError('Invalid trusted homeward ticket ride debt.')
  }
}

function needsHomewardRules(raw: unknown): boolean {
  try {
    if (!record(raw)) return false
    if (homewardMarker(raw)) return true
    const onboarding = own(raw, 'onboarding')
    if (record(onboarding) && own(onboarding, 'done') !== true
      && (own(onboarding, 'required') === true || own(onboarding, 'stage') === 'guest')) return false
    const travel = own(raw, 'travel')
    const debt = record(travel) ? own(travel, 'rideDebt') : undefined
    if (Number.isSafeInteger(debt) && (debt as number) > 0) return false
    const estate = own(raw, 'estate')
    if (!record(estate)) return false
    const home = own(estate, 'home')
    if (typeof home === 'string' && home !== own(estate, 'city')) return true
    // Legacy saves may infer the main home from an away residence during estate sanitization.
    const away = own(estate, 'away')
    return record(away) && Object.keys(away).some(key => {
      const residence = own(away, key)
      return record(residence) && typeof own(residence, 'lga') === 'string'
    })
  } catch { return false }
}

export function homewardFor(raw: unknown): Promise<void> | null {
  if (rules || !needsHomewardRules(raw)) return null
  loading ??= import('./homeward-rules.ts').then(installHomewardRules).catch(error => {
    loading = null
    throw error
  })
  return loading
}
