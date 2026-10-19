/**
 * OWNER: minigames (docs/MINI-GAMES.md)
 * SKIT STUDIO, the server half: only the words. The skit itself is posed, drawn and recorded on the device (src/app/features/minigames/SkitApp.vue) with no
 * microphone and no upload; the one thing the server does is check the title and the caption lines, because they are text other people will read in the
 * video the person shares. They pass the same filter as any text strangers read (screenText with contact details refused) and are refused, never altered.
 * A day allows SKIT_CHECKS_PER_DAY checks, so the route cannot be used as a free filter.
 */
import { screenText } from '../moderation/text.ts';
import type { SkitCheck } from '../../src/types/minigames.ts';
import type { Db, RouteContext, SessionRecord } from '../types.ts';
import { dayOf, no } from './common.ts';
import type { Refused } from './common.ts';
import { minigamesOf } from './store.ts';

export const SKIT_TITLE_MAX = 40, SKIT_CAPTION_MAX = 80, SKIT_CAPTIONS_MAX = 6, SKIT_CHECKS_PER_DAY = 60;

/** One line tidied: control characters out, spaces collapsed, cut to `max`. */
export function tidy(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

export function skitService(ctx: RouteContext) {
  const open = (): boolean => ctx.checks?.setting?.('skitOpen') !== false;
  return {
    /** Checks the title and the caption lines of a skit; answers with them tidied, or the reason one is refused. */
    check(db: Db, session: SessionRecord, body: Record<string, unknown>, now: number): ({ ok: true } & SkitCheck) | Refused {
      if (!open()) return no('skit_closed', 'The skit studio is closed for now. Try again later.');
      const list = Array.isArray(body.captions) ? body.captions : [];
      if (list.length > SKIT_CAPTIONS_MAX) return no('too_many_captions', `A skit has at most ${SKIT_CAPTIONS_MAX} caption lines.`);
      const c = minigamesOf(ctx, db), day = dayOf(now), mine = c.skits[session.publicId];
      const row = mine && mine.day === day ? mine : (c.skits[session.publicId] = { day, checks: 0 });
      if (row.checks >= SKIT_CHECKS_PER_DAY) return no('rate_limited', 'That is plenty of checks for today. Try again tomorrow.');
      row.checks += 1;
      const title = tidy(body.title, SKIT_TITLE_MAX), captions = list.map((line) => tidy(line, SKIT_CAPTION_MAX));
      for (const [what, text] of [['The title', title], ...captions.map((line, at) => [`Caption ${at + 1}`, line] as const)] as const) {
        if (!text) continue;
        const verdict = screenText(text, { contact: true, what });
        if (verdict) return no(verdict.code, verdict.reason);
      }
      return { ok: true, title, captions };
    },
  };
}
export type SkitService = ReturnType<typeof skitService>;
