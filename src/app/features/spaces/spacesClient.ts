// A small typed wrapper over /api/spaces/*: every answer is { ok: true, ... } or { ok: false, code, reason }, and a thrown
// transport error becomes a refusal in words.
import type { SpacePlanV1, SpaceProblem, SpaceTarget } from '../../../spaces/plan.ts'
import { packPlan } from '../../../spaces/plan.ts'

export interface Fetcher { fetchJson: <T = Record<string, unknown>>(path: string, options?: { method?: 'POST'; body?: unknown }) => Promise<T> }
export type Refusal = { ok: false; code: string; reason: string }
export interface Designed { ok: true; code: 'designed' | 'checked'; plan: SpacePlanV1; problems: SpaceProblem[]; cost: number; cash: number | null; space: { grid: number; owned: boolean } }
export interface Applied { ok: true; code: 'applied'; placed: number; spent: number; problems: SpaceProblem[] }
export interface Where { target: SpaceTarget; roomId?: string }

async function call<T>(api: Fetcher, path: string, body?: unknown): Promise<T | Refusal> {
  try {
    return await api.fetchJson<T | Refusal>(path, body === undefined ? undefined : { method: 'POST', body })
  } catch (caught) {
    const error = caught as { code?: string; reason?: string; status?: number }
    return { ok: false, code: error.code || 'network', reason: error.reason || (error.status ? 'The designer could not do that. Try again.' : 'No connection. Check your network and try again.') }
  }
}

export const aiStatus = async (api: Fetcher): Promise<boolean> => {
  const answer = await call<{ ok: true; ai: boolean }>(api, '/api/spaces/status')
  return answer.ok ? answer.ai : false
}
export const design = (api: Fetcher, where: Where, prompt: string, keep: boolean) =>
  call<Designed>(api, '/api/spaces/design', { ...where, prompt, ...(keep ? { keep: true } : {}) })
export const check = (api: Fetcher, where: Where, plan: SpacePlanV1) =>
  call<Designed>(api, '/api/spaces/check', { ...where, plan: packPlan(plan) })
export const apply = (api: Fetcher, where: Where, plan: SpacePlanV1, requestId: string) =>
  call<Applied>(api, '/api/spaces/apply', { ...where, plan: packPlan(plan), requestId })

export interface HostState { kind: 'butler' | 'dj' | 'quizmaster' | 'gateman' | null; persona: string; on: boolean; name: string | null; kinds: { id: string; label: string; name: string }[] }
export const hostRead = (api: Fetcher) => call<{ ok: true; ai: boolean; host: HostState }>(api, '/api/spaces/host')
export const hostWrite = (api: Fetcher, body: { kind: HostState['kind']; persona?: string; on: boolean }) =>
  call<{ ok: true; code: 'saved' | 'removed'; host: HostState }>(api, '/api/spaces/host', body)
