// The wording of a failed civic request. Apart from ./civicBasics.ts, which the first download carries for the Governor badge.

const MESSAGES: Readonly<Record<string, string>> = {
  civic_rate_limited: 'You are doing that too quickly. Wait a minute and try again.',
  rate_limited: 'Too many requests from this network. Wait a minute and try again.',
  not_found: 'That item is not available. Go back and choose another option, or try again.',
  device_session_required: 'Your device session is missing or expired. Reconnect first.',
  invalid_city: 'That city is not available.',
  body_too_large: 'That is too much text.',
}
/** The sentence for a failed request: the server's own reason, else ours by code, else the error's message. */
export function explain(error: unknown): string {
  const item = (typeof error === 'object' && error !== null ? error : {}) as { reason?: unknown; code?: unknown; message?: unknown }
  const code = typeof item.code === 'string' ? item.code : ''
  return (typeof item.reason === 'string' && item.reason) || MESSAGES[code] || (typeof item.message === 'string' && item.message) || 'The server could not be reached. Try again.'
}
