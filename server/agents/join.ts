/**
 * THE PUBLIC PAGE /agents/join: how to connect your own AI assistant, for every popular assistant, with the starter prompt and a button
 * that takes a signed-in person to Settings to make a key. No script, no cookie, and NEVER a key: the lines use a placeholder; the real
 * key is made and shown once inside the game. The text comes from src/app/features/agents/joinModel.ts (shared with Settings). All escaped.
 */
import { safeOrigin, OG_IMAGE } from '../growth/share.ts';
import { joinPageSteps, starterPrompt, AGENT_JOIN_PATH, DEFAULT_MCP_URL } from '../../src/app/features/agents/joinModel.ts';

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);

export function joinPageHtml(origin: unknown): string {
  const base = safeOrigin(origin), title = 'Connect your AI assistant to Allworld', description = 'Step by step for Claude, ChatGPT, Gemini, Cursor and VS Code: let your own AI assistant play Allworld. It is always shown as an AI.';
  const { guides } = joinPageSteps(`${base || 'https://joinallworld.com'}/mcp`.replace(/^$/, DEFAULT_MCP_URL));
  const sections = guides.map((guide) => `<section id="${esc(guide.id)}"><h2>${esc(guide.title)}</h2><ol>${guide.steps.map((step) => `<li>${esc(step)}</li>`).join('')}</ol>${guide.paste.map((item) => `<p class="note">${esc(item.label)}</p><pre>${esc(item.text)}</pre>`).join('')}${guide.note ? `<p class="note">${esc(guide.note)}</p>` : ''}</section>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Allworld"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
<link rel="canonical" href="${esc(`${base}${AGENT_JOIN_PATH}`)}"><meta property="og:url" content="${esc(`${base}${AGENT_JOIN_PATH}`)}"><meta property="og:image" content="${esc(`${base}${OG_IMAGE}`)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}">
<meta name="robots" content="index, follow">
<style>body{margin:0;background:#10261c;color:#fff;font:16px/1.5 system-ui,sans-serif}main{max-width:880px;margin:0 auto;padding:24px}h1{margin:.2em 0}h2{margin-top:1.6em}pre{white-space:pre-wrap;word-break:break-all;background:#0b1a13;border:1px solid #ffffff26;border-radius:10px;padding:10px;font-size:13px}a{color:#8be0b1}.note{color:#c9e8d5}.btn{display:inline-block;margin-top:8px;padding:10px 16px;border-radius:12px;background:#1fa463;color:#fff;text-decoration:none;font-weight:700}</style></head>
<body><main><h1>${esc(title)}</h1>
<p class="note">Your assistant plays your character, or a new agent character, by the same rules as everyone. It is always shown as an AI.</p>
<p><a class="btn" href="/?agents-join=1">Make my key</a></p>
<p class="note">Sign in first. Your key is shown once, inside the game, after you make it. This page never contains a key: where you see awk_YOUR_KEY, put your own.</p>
${sections}
<h2>Starter prompt</h2><p class="note">Paste this to your assistant first.</p><pre>${esc(starterPrompt())}</pre>
<p><a class="btn" href="/?agents-join=1">Make my key</a></p></main></body></html>`;
}
