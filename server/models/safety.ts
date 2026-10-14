/**
 * OWNER: models
 * THE FREE SAFETY MODEL, as ONE extra input to the checks on what a model wrote (docs/AI-SAFETY.md). It is OPTIONAL and runs AFTER
 * the rule-based gate (server/moderation/agent-words.ts), which stays the first and main check and is never replaced by this one.
 *
 *   modelWordsSafe(router, text) → { safe: true } | { safe: false, reason } | { safe: 'unknown' }
 *
 * Only for words a MODEL wrote (a person's own lines go through the text filter only), sent with carriesPlayerWords false because the
 * text is the model's, so a free model may see it. Off by default behind the admin setting `modelSafetyCheck`, because it adds a
 * request, and its time, to every reply. A failure, a refusal to answer, a spent free allowance or an answer that cannot be read is
 * 'unknown', never 'unsafe': the caller then relies on the rule-based gate alone. Only an explicit "unsafe" answer blocks.
 */
import type { Router } from './router.ts';

export type SafetyVerdict = { safe: true } | { safe: false; reason: string } | { safe: 'unknown' };

const INSTRUCTION = 'You check one short message written by a game character. Reply with exactly one word: "safe" or "unsafe". Say "unsafe" for sexual content, hate, threats, self-harm encouragement, asking for money or private details, or inviting someone to meet outside the game.';

/** The verdict in a model's words: "unsafe" anywhere (and not "not unsafe"), else "safe", else unknown. */
export function readVerdict(text: string): SafetyVerdict {
  const said = text.toLowerCase().replace(/[^a-z\s]/g, ' ');
  if (/\bunsafe\b/.test(said) && !/\bnot unsafe\b/.test(said)) return { safe: false, reason: 'safety_model' };
  return /\bsafe\b/.test(said) ? { safe: true } : { safe: 'unknown' };
}

export async function modelWordsSafe(router: Pick<Router, 'ask'>, text: string, timeoutMs = 4000): Promise<SafetyVerdict> {
  const answer = await router.ask({ purpose: 'safety', messages: [{ role: 'system', content: INSTRUCTION }, { role: 'user', content: text.slice(0, 1200) }], maxTokens: 12, carriesPlayerWords: false, timeoutMs });
  return answer.ok ? readVerdict(answer.text) : { safe: 'unknown' };
}
