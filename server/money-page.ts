/**
 * OWNER: growth
 * The public money page, /money, written by both hosts (ctx.pages, registered in server/routes/profiles.ts beside /privacy; the Worker lists the prefix).
 * Plain HTML with no script, the same style as the privacy page. It says what game naira is and is not, what real money exists in Allworld and who holds it,
 * and what to do about a scam. Every line states what the code does today (docs/PROMOTE.md, docs/EARN.md, docs/WOW-PLAN.md Phase 0): when a behaviour changes,
 * change the line. The scam banner under a chat line (src/app/features/trust/ScamNotice.vue) and the Bank panel link here.
 */
import { OG_IMAGE, safeOrigin } from './growth/share.ts'
import { escapeHtml as esc } from './path-meta.ts'
import { STYLE } from './privacy-page.ts'

const UPDATED = '19 October 2026'

export function moneyPageHtml(origin: unknown = ''): string {
  const base = safeOrigin(origin), title = 'Money — Allworld'
  const description = 'Game naira is never real money and nobody can withdraw it. What real money exists in Allworld, who holds it, and what to do about a scam.'
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<meta name="description" content="${esc(description)}"><link rel="canonical" href="${esc(`${base}/money`)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:image" content="${esc(`${base}${OG_IMAGE}`)}"><style>${STYLE}</style></head>
<body><main class="wrap"><div class="top"><a class="brand" href="${esc(`${base}/`)}">Allworld</a><span class="meta">Updated ${UPDATED}</span></div>
<h1>Money in Allworld</h1><p class="meta">Short version: <b>game naira is never real money.</b> It is never sold, never bought and nobody can withdraw it: not you, not Allworld and not a stranger who offers to help.</p>
<h2>Game naira</h2><ul>
<li>You earn it by playing: working a shift, selling at a stall, winning a game. You spend it inside the game: food, rent, fares, furniture.</li>
<li>It is not a currency and not an investment. It cannot be paid out, exchanged for real money, or bought for real money, by anyone.</li>
<li>Anyone who says they can "withdraw your millions", "unlock" your wallet, sell you game naira, or double it is lying. They want your real money, your bank details or a code that was sent to your phone.</li>
</ul>
<h2>The real money that does exist</h2><p>Three things in Allworld use real naira. They are separate from game naira, they are paid through the payment company Bachs, and each one is labelled before you pay or are paid.</p><ul>
<li><b>Business boosts.</b> A business that wants to be seen pays Allworld for a Boost or a Spotlight by the week. This is advertising. The price is shown before checkout, and the business pays Allworld, never a player.</li>
<li><b>Tickets and gig pay.</b> A host who sells a ticket to an event, or someone who posts a gig and chooses to pay the worker, is paid directly to the earner's own Bachs account. Allworld takes a small fee, shown before you pay, and never holds the money in between.</li>
<li><b>The creator pool.</b> Each month a share of Allworld's own boost income is divided among creators whose public posts people reacted to and replied to. It comes from Allworld's revenue, never from other players, and it is not a promise of earnings.</li>
</ul>
<h2>Allworld never holds your money</h2>
<p>Bachs opens the account in your name, checks who you are and keeps your bank details. Allworld keeps only the account's reference and its status. Real-money features are for adults who have signed in. If a person or a page in the game asks you to send money to them instead, it is not Allworld.</p>
<h2>What Allworld will never ask you</h2><ul>
<li>For money, airtime, a gift or a "registration fee", in chat or anywhere else.</li>
<li>For a PIN, a password, a card number, a bank account number, an OTP, or any code sent to your phone.</li>
<li>To move the conversation to another app so that someone can "help you withdraw".</li>
</ul>
<h2>If someone asks you</h2><ul>
<li>Do not send anything and do not share a code. A real friend will not mind.</li>
<li>Tap <b>Report</b> on the yellow warning the game shows under a message that asks for money, or open the person's card and report them, or use Report a problem in the game. Two reports can hide a post until someone looks.</li>
<li>Block them from their card. Blocking stops their messages.</li>
<li>If you already sent real money, tell your bank or Bachs at once, then tell us through Report a problem.</li>
</ul>
<p class="meta">More: <a href="${esc(`${base}/privacy`)}">how Allworld treats your data</a>.</p>
<p class="foot"><a href="${esc(`${base}/`)}">Back to Allworld</a></p></main></body></html>`
}
