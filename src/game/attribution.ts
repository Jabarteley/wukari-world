/**
 * OWNER: growth
 * Where a visit came from, as far as the owner needs it to compare ad sets: the four `utm_` words of the landing address,
 * cleaned. Pure; the browser (src/app/features/growth/attribution.ts) and the server (server/growth/metrics.ts) both
 * run the same cleaning, so what a hostile client sends is cleaned again where it is counted.
 * Nothing here names a person: the words are the owner's own campaign labels.
 */
export const SOURCE_EVENTS = ['landed', 'play', 'game', 'stayed'] as const;
export type SourceEvent = typeof SOURCE_EVENTS[number];
/** The four words, cleaned. */
export interface SourceWords { source: string; medium: string; campaign: string; content: string }

const WORD = /^[a-z0-9_-]{1,40}$/;
/** One word: lower-case, only `a-z 0-9 _ -`, at most 40 characters; anything else (or nothing) is `fallback`. */
export const cleanSourceWord = (value: unknown, fallback = 'direct'): string => {
  const word = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return WORD.test(word) ? word : fallback;
};
/** The four words of one visit. An unknown or missing source, medium or campaign is `direct`; a missing content word is `none`. */
export const cleanSource = (words: unknown): SourceWords => {
  const from = (words !== null && typeof words === 'object' ? words : {}) as Record<string, unknown>;
  return { source: cleanSourceWord(from.source), medium: cleanSourceWord(from.medium), campaign: cleanSourceWord(from.campaign), content: cleanSourceWord(from.content, 'none') };
};
