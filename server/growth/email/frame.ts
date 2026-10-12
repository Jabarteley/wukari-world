/**
 * OWNER: growth
 * THE FRAME OF EVERY E-MAIL THE GAME SENDS: one family, so that a confirmation, a welcome, a friend's ping, a comeback mail
 * and an announcement look like the same world. Pure functions of plain data; nothing here knows a mail's words or rules.
 *
 * MAIL-SAFE. Tables for the layout, every colour inline (a reader that drops style sheets shows the light message whole),
 * a system font stack, at most 600 px wide and fluid below that, a button that is a link in a coloured cell (it works
 * with images off), no script, no form, no web font and no tracking pixel. The dark colours are one small style block
 * for the readers that honour the reader's choice.
 *
 * THE HERO is a picture from the game's own 3D art, served by the game from its own static files (public/mail/): a
 * different scene for each kind of mail. It is an ordinary image at an absolute address built from the public origin the
 * mail's own links already use (never another host, never inline data). Without an origin the picture is left out and the
 * rest of the mail is whole. Its width and height are set and it is a block, so a reader that does not load images keeps
 * the layout and shows the alternative text.
 *
 * Every value written into HTML goes through esc().
 */
const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);
export const BRAND = 'Allworld';
export const FONT = "font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** The dark colours, for a reader that honours the reader's choice; one that ignores this block shows the light message, whose colours are all set inline. */
export const DARK = `:root{color-scheme:light dark;supported-color-schemes:light dark}
@media (prefers-color-scheme:dark){.aw-page{background:#101613!important}.aw-card{background:#18211c!important}.aw-ink{color:#eef2ef!important}.aw-body{color:#d5dcd7!important}.aw-muted{color:#a3aea7!important}
.aw-soft{background:#203027!important;border-color:#2f4638!important}.aw-badge{background:#274a37!important;color:#bfe6cd!important}.aw-rule{border-color:#2a352f!important}.aw-link{color:#9ad6b2!important}.aw-foot a{color:#a3aea7!important}}
@media (max-width:480px){.aw-pad{padding-left:20px!important;padding-right:20px!important}.aw-h1{font-size:24px!important}}`;

export type HeroKind = 'welcome' | 'ping' | 'update' | 'home' | 'confirm';
/** The scenes (public/mail/<file>.jpg at 1200x600 and <file>-600.jpg at 600x300) and what each shows, for a reader that does not load images. */
export const HERO: Readonly<Record<HeroKind, { file: string; alt: string }>> = Object.freeze({
  welcome: { file: 'welcome', alt: 'A street in Allworld in golden evening light, with people walking past the shops.' },
  ping: { file: 'ping', alt: 'Two people at a fruit stall in Allworld, one of them smiling.' },
  update: { file: 'update', alt: 'Africa on the Allworld map, with cities lit up.' },
  home: { file: 'home', alt: 'A friendly character standing outside a house with lit windows in Allworld.' },
  confirm: { file: 'confirm', alt: 'A yellow danfo bus on a city street in Allworld.' },
});
/** The scheme and host of an address, or '' when it is not an http(s) address. The mails build their picture addresses from the origin of their own button. */
export const originOf = (url: string): string => { try { const parsed = new URL(url); return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.origin : ''; } catch { return ''; } };

const cell = (padding: string, extra = ''): string => `style="padding:${padding};${FONT};${extra}"`;
/** The mark: a globe drawn with borders. A reader that cannot round a corner is not shown it at all. */
const GLOBE = `<!--[if !mso]><!--><td width="40" valign="middle" style="padding:0 12px 0 0"><div style="width:32px;height:32px;border:2px solid #ffffff;border-radius:50%;position:relative;overflow:hidden;box-sizing:border-box">
<div style="width:13px;height:28px;margin:0 auto;border-left:2px solid #ffffff;border-right:2px solid #ffffff;border-radius:50%;box-sizing:border-box"></div><div style="height:2px;line-height:2px;font-size:0;background:#ffffff;margin-top:-15px">&nbsp;</div></div></td><!--<![endif]-->`;

/** The picture row: a 600 px picture (twice that where the reader can use it), at the address the game serves it from. */
function heroRow(hero: { kind: HeroKind; origin: string } | undefined): string {
  const origin = hero ? originOf(hero.origin) : '';
  if (!hero || !origin) return '';
  const scene = HERO[hero.kind], base = `${origin}/mail/${scene.file}`;
  return `<tr><td bgcolor="#256b45" style="padding:0;font-size:0;line-height:0;background:#256b45"><img src="${esc(`${base}-600.jpg`)}" srcset="${esc(`${base}.jpg`)} 2x" width="600" height="300" alt="${esc(scene.alt)}" style="display:block;width:100%;max-width:600px;height:auto;border:0;outline:none;text-decoration:none;color:#ffffff;${FONT};font-size:14px"></td></tr>`;
}

/** A row of the white card. `class` names are the dark-mode hooks. */
export const cardRow = (inner: string, padding = '0 32px 14px', extra = ''): string => `<tr><td class="aw-card aw-pad" bgcolor="#ffffff" ${cell(padding, `background:#ffffff;${extra}`)}>${inner}</td></tr>`;
export const heading = (text: string): string => `<h1 class="aw-ink aw-h1" style="margin:0 0 12px;color:#17201b;font-size:28px;line-height:1.2;font-weight:800;overflow-wrap:anywhere;word-wrap:break-word">${esc(text)}</h1>`;
export const paragraph = (text: string, { strong = false, small = false }: { strong?: boolean; small?: boolean } = {}): string => `<p class="aw-body" style="margin:0 0 12px;color:#3b4640;font-size:${small ? 14 : 16}px;line-height:1.55;overflow-wrap:anywhere;word-wrap:break-word">${strong ? `<b class="aw-ink" style="color:#17201b">${esc(text)}</b>` : esc(text)}</p>`;
export const bullets = (items: readonly string[]): string => (items.length ? `<ul style="margin:4px 0 12px;padding-left:20px">${items.map((item) => `<li class="aw-body" style="margin:6px 0;color:#3b4640;font-size:16px;line-height:1.5">${esc(item)}</li>`).join('')}</ul>` : '');
/** One large button (a link in a coloured cell, so that it works without images) and the address to copy when a reader will not show it. */
export const buttonRow = (label: string, url: string, fallback = 'Or copy this address into your browser:'): string => cardRow(`<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="100%" style="max-width:360px"><tr><td align="center" bgcolor="#256b45" style="background:#256b45;border-radius:999px"><a href="${esc(url)}" style="display:block;padding:16px 24px;${FONT};font-size:18px;line-height:1.2;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px">${esc(label)}</a></td></tr></table>
<p class="aw-muted" style="margin:12px 0 0;color:#56625b;font-size:13px;line-height:1.5;text-align:center">${esc(fallback)}<br><span class="aw-link" style="color:#256b45;overflow-wrap:anywhere;word-wrap:break-word;word-break:break-all">${esc(url)}</span></p>`, '8px 32px 22px', 'text-align:center');
/** A soft box inside the card. */
export const softBox = (title: string, text: string): string => cardRow(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="aw-soft" bgcolor="#f1f7f3" ${cell('16px 18px', 'background:#f1f7f3;border:1px solid #d5e6db;border-radius:14px;font-size:15px;line-height:1.5')}>
<div class="aw-ink" style="color:#17201b;font-size:16px;font-weight:700;margin:0 0 2px">${esc(title)}</div><div class="aw-body" style="color:#3b4640">${esc(text)}</div></td></tr></table>`, '0 32px 16px');
export const rule = (): string => cardRow('<div class="aw-rule" style="border-top:1px solid #e3e8e4;font-size:0;line-height:0">&nbsp;</div>', '6px 32px 6px');

/**
 * The whole message. `body` is the card's rows (cardRow and friends), `foot` is the quiet footer as already escaped HTML.
 * `preheader` is the line a mail list shows beside the subject.
 */
export function shell({ subject, preheader, hero, body, foot, tagline = 'The whole world, to live in' }: { subject: string; preheader: string; hero?: { kind: HeroKind; origin: string } | undefined; body: string; foot: string; tagline?: string }): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${esc(subject)}</title><style>${DARK}</style></head>
<body class="aw-page" style="margin:0;padding:0;background:#eef2ef;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;mso-hide:all">${esc(preheader)}</div>
<table role="presentation" class="aw-page" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#eef2ef" style="background:#eef2ef"><tr><td align="center" style="padding:20px 10px">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:0 auto">
<tr><td bgcolor="#256b45" ${cell('16px 24px', 'background:#256b45;background-image:linear-gradient(135deg,#2f8055 0%,#256b45 55%,#1b5235 100%);border-radius:18px 18px 0 0')}><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${GLOBE}
<td valign="middle" style="${FONT}"><div style="color:#ffffff;font-size:20px;line-height:1.15;font-weight:800;letter-spacing:.3px">${esc(BRAND)}</div><div style="color:#d7ecdf;font-size:12px;line-height:1.4;margin-top:1px">${esc(tagline)}</div></td></tr></table></td></tr>
${heroRow(hero)}${cardRow('', '24px 32px 0')}
${body}
<tr><td class="aw-card" bgcolor="#ffffff" style="background:#ffffff;border-radius:0 0 18px 18px;font-size:0;line-height:0;height:10px">&nbsp;</td></tr>
<tr><td class="aw-muted aw-foot aw-pad" ${cell('16px 24px 0', 'color:#56625b;font-size:12px;line-height:1.6')}>${foot}</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;
}
