// The Clans screen's words and small rules, pure (ClansScreen.vue; the server is server/clans/, the rules src/clans/; docs/CLANS.md).
// A clan invite is a link the quick start already keeps across Play now: /?table=clan-<code in lower case> (src/quick-start/model.ts
// linkParts), which the landing turns into the Games app opened on the clan (src/app/features/landing/landingStore.ts).

const CLAN_LINK = /^clan-([a-hjkmnp-z]{6})$/

/** The path that invites someone into a clan. */
export const inviteLinkPath = (code: string): string => `/?table=clan-${code.toLowerCase()}`
/** The clan code a kept link names, or null. */
export const clanCodeOf = (table: string | null | undefined): string | null => { const m = CLAN_LINK.exec(table ?? ''); return m ? (m[1] as string).toUpperCase() : null }
/** What a code typed or pasted (a whole link, or the six letters) is, or null. */
export function codeFromText(text: string): string | null {
  const trimmed = text.trim()
  const fromLink = /[?&]table=clan-([a-z]{6})/i.exec(trimmed)?.[1] ?? null
  const bare = (fromLink ?? trimmed).toUpperCase().replace(/[\s-]+/g, '')
  return /^[A-HJKMNP-Z]{6}$/.test(bare) ? bare : null
}
export const inviteLine = (name: string): string => `Join my clan ${name} on Allworld. We play Fight, Race and Football together:`

export const ROLE_WORDS: Readonly<Record<string, string>> = { leader: 'Leader', deputy: 'Deputy', member: 'Member' }
/** "Gold II" with its tier number: the colour of a rank badge. */
export const TIER_COLOURS = ['#b07a4f', '#9aa3ad', '#d9a521', '#4bb3c4', '#6c7fe0', '#c0489b'] as const
export const tierColour = (tier: number): string => TIER_COLOURS[Math.max(0, Math.min(TIER_COLOURS.length - 1, Math.floor(tier)))] as string

/** A board row from the server: [rank, name, score, tier, me?, ai?]. */
export interface BoardRowView { rank: number; name: string; score: number; tier: number; me: boolean; ai: boolean }
export function boardRows(rows: readonly (readonly (number | string)[])[]): BoardRowView[] {
  return rows.map((r) => ({ rank: Number(r[0]) || 0, name: String(r[1] ?? ''), score: Math.round(Number(r[2]) || 0), tier: Number(r[3]) || 0, me: r[4] === 1, ai: r[5] === 1 }))
}

/** What the war card says this week. */
export function warLine(war: { vs: { name: string } | null; mine: readonly number[] } | null | undefined, size: number, warMin = 3): string {
  if (size < warMin) return `A clan war needs ${warMin} people. Invite friends to start one.`
  if (!war?.vs) return 'Looking for a clan your size to play this week. Every counted match adds points.'
  const counted = Math.max(1, Math.floor(war.mine.length * 0.8)), total = [...war.mine].sort((a, b) => b - a).slice(0, counted).reduce((a, b) => a + Math.max(0, b), 0)
  return `This week against ${war.vs.name}. Your best ${counted} have ${total} points so far.`
}
/** The last war, in a sentence. */
export function lastWarLine(last: { vsName: string; mine: number; theirs: number; outcome: string } | null | undefined): string {
  if (!last) return ''
  const score = `${last.mine} to ${last.theirs}`
  return last.outcome === 'win' ? `Last week you beat ${last.vsName}, ${score}.` : last.outcome === 'loss' ? `Last week ${last.vsName} won, ${score}.` : `Last week was a draw with ${last.vsName}, ${score}.`
}
/** The city league in one line for sharing. */
export const leagueShareLine = (city: string, place: number, week: number): string => (place === 1 ? `${city} leads the Allworld city league this week (week ${week}). Play for your city:` : `${city} is number ${place} in the Allworld city league this week. Help us climb:`)
