/**
 * OWNER: agents (AI residents, docs/AI-RESIDENTS.md "Never taken away quietly")
 * THE CONTINUITY REGISTRY: the only way an AI character of the game's own cast may leave or change. Pure data and two pure helpers, no imports, so the feed,
 * the memory routes and the cast can all read it without a cycle.
 *
 * THE RULE (Phase 0 of docs/WOW-PLAN.md, built in Phase 3): a character people follow or have as a partner is never changed or removed quietly. A change is an
 * entry here, released at least NOTICE_DAYS before it takes effect. From its `notice` day the runtime (continuity.ts) tells every follower and partner in their
 * inbox, keeps the character exactly as it is, and on the last day posts its goodbye; the person's memory export of it stays downloadable after it has gone.
 *
 * HOW IT IS ENFORCED (continuity.test.ts):
 *   - CAST_PRINTS below is a fingerprint of every authored house-agent spec (name, role, voice and card; read through one city of each cast, continuity.ts CAST_GROUP_CITIES) and every authored resident (name and city), and one
 *     digest of all generated residents. The test fails when a fingerprint no longer matches the code and no entry here covers it with an `effective` day that
 *     has come, or when an entry gives fewer than NOTICE_DAYS of notice. A new character is added to CAST_PRINTS (adding is always allowed).
 *   - The owner's `residentFarewell` setting goes through continuity.ts too: a followed or partnered resident leaves only after its notice has run.
 * To retire or change someone: add an entry with `notice` no earlier than the release day and `effective` at least 7 days later; change the cast only in a
 * release on or after `effective`, and then update CAST_PRINTS.
 */

export const NOTICE_DAYS = 7;
const DAY_MS = 86400000, LAGOS_OFFSET_MS = 3600000;

export interface Change {
  /** A full id (`house.lagos.tolani`, `resident.lagos.remi`), a whole fallback cast key (`house.*.nkechi`: every city's), or `resident.*` (every generated resident). */
  id: string
  /** The name people know it by, kept for its card after it has gone. */
  name: string
  /** `leave`: it goes for good. `change`: its name, voice or character changes. */
  what: 'leave' | 'change'
  /** Lagos dates, YYYY-MM-DD. Notice goes out from `notice`; the change happens on `effective`, at least NOTICE_DAYS later. */
  notice: string
  effective: string
  /** One plain sentence for the inbox ("Mama Tolani is retiring from the market."). */
  reason: string
}

/** Every planned change. Empty: nobody is leaving or changing. */
export const CHANGES: readonly Change[] = Object.freeze([]);

/** Server ms at the start of a Lagos date (YYYY-MM-DD); NaN when it is not one. */
export function lagosDate(date: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) - LAGOS_OFFSET_MS : Number.NaN;
}
/** Whole days of notice an entry gives. */
export const noticeDays = (change: Pick<Change, 'notice' | 'effective'>): number => Math.round((lagosDate(change.effective) - lagosDate(change.notice)) / DAY_MS);
/** Does a change entry cover this id (a full id, `house.*.<key>`, or `resident.*` for a generated one)? */
export function covers(change: Pick<Change, 'id'>, id: string): boolean {
  if (change.id === id) return true;
  const [kind, city, key] = id.split('.');
  if (change.id === `${kind}.*.${key}`) return city !== undefined;
  return change.id === 'resident.*' && kind === 'resident' && /^g\d-/.test(key ?? '');
}

/** FNV-1a, base 36: the fingerprint of a few words. */
export function print(text: string): string {
  let h = 2166136261;
  for (const char of text) { h ^= char.charCodeAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

/**
 * The cast as released on 19 October 2026. `house:<group>:<key>` (group `lagos` or a country's fallback cast), `resident:<id>` for an authored resident, and
 * `generated` for the digest of every generated resident of every catalogue city. continuity.ts `currentPrints()` makes them; continuity.test.ts prints the
 * expected value of any entry that is missing or stale.
 */
export const CAST_PRINTS: Readonly<Record<string, string>> = Object.freeze({
  'house:lagos:tolani': 'ma4yo0',
  'house:lagos:tunji': '1n4ycle',
  'house:lagos:kofo': '17qtkmy',
  'house:lagos:dayo': 'qv0fwx',
  'house:lagos:chinwe': '1knqzf3',
  'house:lagos:ade': '18fgzfr',
  'house:ng:nkechi': '1s25460',
  'house:ng:chike': '1xzr7jd',
  'house:gh:efua': 'tr8f33',
  'house:gh:kojo': 'znlvrz',
  'house:ke:wanjiru': 'uqhbg0',
  'house:ke:otieno': '1v1xp62',
  'house:za:thandi': '1npbqbg',
  'house:za:sipho': '1nsvehd',
  'house:world:rosa': 'upmpvo',
  'house:world:maya': 's8pyko',
  'resident:resident.lagos.remi': 'xygt64',
  'resident:resident.lagos.adaeze': 'ocfgg1',
  'resident:resident.lagos.ibrahim': '1wsnott',
  'resident:resident.lagos.bisi': '4dn9uy',
  'resident:resident.lagos.kelechi': 'r9ghxa',
  'resident:resident.lagos.sade': 'vuzcge',
  'resident:resident.lagos.hauwa': 'qqysuz',
  'resident:resident.lagos.chidi': '1jsudsw',
  'resident:resident.lagos.mariam': '184x32m',
  'resident:resident.lagos.kunle': 'exx8ly',
  'resident:resident.abuja.yakubu': 'j7kfq1',
  'resident:resident.abuja.ngozi': '154m2o9',
  'resident:resident.abuja.zainab': '7q7yoz',
  'resident:resident.abuja.joseph': '1alrunp',
  'resident:resident.ibadan.taiwo': '1kx4f4q',
  'resident:resident.ibadan.olumide': 'oehdu1',
  'resident:resident.ibadan.abike': 'jy3qto',
  'resident:resident.accra.kwabena': '1ativim',
  'resident:resident.accra.ama': 'ier1ri',
  'resident:resident.accra.naa': 'wk9ul6',
  'resident:resident.nairobi.wambui': 'wo8ade',
  'resident:resident.nairobi.omar': 'x53yfs',
  'resident:resident.nairobi.anita': '18sx454',
  'resident:resident.cape-town.lwazi': '2e270s',
  'resident:resident.cape-town.fatima': '1nohx1j',
  'resident:resident.london.priya': '1fe7uhe',
  'resident:resident.london.winston': 'fz9ljf',
  'resident:resident.london.esther': '1wsq16s',
  'resident:resident.new-york.marisol': 'b1hwlm',
  'resident:resident.new-york.dev': 'jhq5v6',
  'generated': 'nmg0km',
});
