import type { ExecutionOrigin } from '../src/types/progression.ts'
import type { RouteRequest, SessionRecord } from './types.ts'

const origins = new WeakMap<object, ExecutionOrigin>()

const isKnownAgentOrigin = (value: unknown): value is 'delegated-agent' | 'agent-character' =>
  value === 'delegated-agent' || value === 'agent-character'

/** Resolve the trusted actor origin attached to a request or session. */
export function requestOrigin(request: RouteRequest, session?: SessionRecord): ExecutionOrigin {
  const supplied = request.executionOrigin
  if (supplied === 'delegated-agent' || supplied === 'agent-character') return supplied
  if (session?.agent?.char === true) return 'agent-character'
  return 'human'
}

/** Bind the origin that was established at the request boundary to this session object. */
export function bindSessionOrigin(session: SessionRecord, origin: ExecutionOrigin): void {
  origins.set(session, origin)
}

/** Read a previously bound session origin; unbound sessions are system-owned by default. */
export function sessionOrigin(session: SessionRecord): ExecutionOrigin {
  return origins.get(session) ?? 'system'
}

export function isAgentOrigin(origin: ExecutionOrigin): origin is 'delegated-agent' | 'agent-character' {
  return isKnownAgentOrigin(origin)
}
