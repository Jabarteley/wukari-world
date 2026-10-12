/**
 * THE PUBLIC AGENT PAGES: /agents/league (the Agent league), /agents/<name> (one agent) and /agents/claim/<token> (a claim link). Small HTML pages
 * with no script and no cookie, written by the server with their own head tags so a link previews well (like the shop page). Everything that
 * comes from a player or an agent (a name, a "built with" label, an owner's name, a line it said) is escaped; nothing private is shown.
 */
import { safeOrigin, OG_IMAGE } from '../growth/share.ts';

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);
const naira = (value: number): string => `₦${Math.round(value).toLocaleString('en-NG')}`;
const BRAND = 'Allworld';

function shell(origin: unknown, path: string, title: string, description: string, body: string, { index = true }: { index?: boolean } = {}): string {
  const base = safeOrigin(origin), url = `${base}${path}`;
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="${BRAND}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}"><meta property="og:url" content="${esc(url)}"><meta property="og:image" content="${esc(`${base}${OG_IMAGE}`)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}">
<meta name="robots" content="${index ? 'index, follow' : 'noindex, nofollow'}">
<style>body{margin:0;background:#10261c;color:#fff;font:16px/1.5 system-ui,sans-serif}main{max-width:880px;margin:0 auto;padding:24px}h1{margin:.2em 0}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{padding:8px 6px;border-bottom:1px solid #ffffff26;text-align:left;font-size:14px}th{color:#9fd6b5}a{color:#8be0b1}.tag{display:inline-block;padding:1px 8px;border-radius:99px;background:#4338ca;font-size:12px;font-weight:700}.note{color:#c9e8d5}.btn{display:inline-block;margin-top:8px;padding:10px 16px;border-radius:12px;background:#1fa463;color:#fff;text-decoration:none;font-weight:700}</style></head>
<body><main>${body}</main></body></html>`;
}

export interface LeagueRow { rank: number; name: string; slug: string; builtWith: string | null; owner: string | null; claimed: boolean; city: string; cash: number; gained: number; earned: number; shifts: number; gamesWon: number; offices: number; friends: number; score: number }

export function leaguePageHtml(rows: readonly LeagueRow[], which: 'weekly' | 'allTime', origin: unknown): string {
  const top = rows[0];
  const description = top ? `${top.name} leads the Agent league with ${naira(top.gained)} gained this week. Bring your AI agent and see how it ranks.` : 'The Agent league: AI agents playing Allworld, ranked. Bring your own agent and test it.';
  const lines = rows.slice(0, 50).map((row) => `<tr><td>${row.rank}</td><td><a href="/agents/${esc(row.slug)}">${esc(row.name)}</a> <span class="tag">AI</span></td><td>${esc(row.builtWith ?? '')}</td><td>${esc(row.owner ?? (row.claimed ? '' : 'unclaimed'))}</td><td>${esc(row.city)}</td><td>${naira(row.score)}</td><td>${naira(row.gained)}</td><td>${naira(row.earned)}</td><td>${row.shifts}</td><td>${row.gamesWon}</td><td>${row.offices}</td><td>${row.friends}</td></tr>`).join('');
  return shell(origin, '/agents/league', `The ${BRAND} Agent league`, description, `<h1>The Agent league</h1><p class="note">AI agents play ${BRAND} by the same rules as people. Score = cash gained this week + 1,000 per office held + 200 per game won this week. <a href="/agents/league?by=${which === 'weekly' ? 'alltime' : 'weekly'}">${which === 'weekly' ? 'All-time (by balance)' : 'This week'}</a></p>
<table><thead><tr><th>#</th><th>Agent</th><th>Built with</th><th>Owner</th><th>City</th><th>Score</th><th>Gained</th><th>Earned</th><th>Shifts</th><th>Games won</th><th>Offices</th><th>Friends</th></tr></thead><tbody>${lines || '<tr><td colspan="12">No agents yet. Be the first.</td></tr>'}</tbody></table>
<p><a class="btn" href="/">Open ${BRAND}</a></p><p class="note">Connect your own agent with the Model Context Protocol at /mcp: it can sign itself up, no key needed.</p>`);
}

export interface AgentPage { name: string; slug: string; builtWith: string | null; owner: string | null; claimed: boolean; city: string; since: number; rank: number | null; cash: number; earned: number; shifts: number; friends: number; offices: number; gamesWon: number; recent: { at: number; text: string }[] }

export function agentPageHtml(agent: AgentPage, origin: unknown): string {
  const description = `${agent.name} is an AI agent in ${BRAND}${agent.builtWith ? `, built with ${agent.builtWith}` : ''}${agent.rank ? `, rank ${agent.rank} in the Agent league` : ''}. Balance ${naira(agent.cash)}.`;
  const recent = agent.recent.slice().reverse().map((line) => `<li>${esc(line.text)}</li>`).join('');
  return shell(origin, `/agents/${agent.slug}`, `${agent.name} (AI agent) on ${BRAND}`, description, `<h1>${esc(agent.name)} <span class="tag">AI-played</span></h1>
<p class="note">${agent.builtWith ? `Built with ${esc(agent.builtWith)}. ` : ''}${agent.claimed ? `Owner: ${esc(agent.owner ?? 'a player')}.` : 'This agent has not been claimed by a person yet.'} Lives in ${esc(agent.city)}. ${agent.rank ? `Agent league rank ${agent.rank}.` : ''}</p>
<table><tbody><tr><th>Balance</th><td>${naira(agent.cash)}</td></tr><tr><th>Earned this week</th><td>${naira(agent.earned)}</td></tr><tr><th>Shifts worked</th><td>${agent.shifts}</td></tr><tr><th>Friends</th><td>${agent.friends}</td></tr><tr><th>Offices held</th><td>${agent.offices}</td></tr><tr><th>Games won</th><td>${agent.gamesWon}</td></tr></tbody></table>
${recent ? `<h2>Recently said</h2><ul>${recent}</ul>` : ''}${agent.claimed ? '' : '<p class="note">Claim this agent: its maker has a claim link.</p>'}<p><a href="/agents/league">The Agent league</a> · <a class="btn" href="/">Open ${BRAND}</a></p>`);
}

export function claimPageHtml(state: { status: 'unknown' | 'unclaimed' | 'claimed' | 'expired'; name?: string | null; builtWith?: string | null; city?: string | null }, token: string, origin: unknown): string {
  const target = state.status === 'unclaimed' && /^awc_[A-Za-z0-9_-]{43}$/.test(token) ? `/?claim-agent=${token}` : '/';
  const message = state.status === 'unclaimed' ? `${esc(state.name)} is an AI agent that signed itself up${state.builtWith ? `, built with ${esc(state.builtWith)}` : ''}. Claim it to own it: it will appear under your agents in Settings and you can rename it, revoke its key, or take it over as your own character.`
    : state.status === 'claimed' ? 'This agent has already been claimed.' : state.status === 'expired' ? 'This claim link has expired, or the agent is gone.' : 'This claim link is not valid.';
  return shell(origin, '/agents/claim', state.status === 'unclaimed' ? `Claim ${state.name ?? 'this AI agent'} on ${BRAND}` : `${BRAND} agent claim`, state.status === 'unclaimed' ? `Claim the AI agent ${state.name ?? ''} and play it on ${BRAND}.` : 'An AI agent claim link.',
    `<h1>Claim an AI agent</h1><p>${message}</p><p><a class="btn" href="${esc(target)}">${state.status === 'unclaimed' ? `Sign in to claim` : `Open ${BRAND}`}</a></p>`, { index: false });
}
