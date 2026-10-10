/**
 * The page side of open mode: a small badge on every page ("Open dev mode") that opens a panel of the developer controls.
 * It is a plain script the host serves itself and adds to the game's page, so it is never part of the built page (the
 * first download is the same with and without it). It makes no request outside this origin.
 */
import { OPEN_DEV_MARKER } from './config.ts';

export const PANEL_PATH = '/__open-dev.js';
export const PANEL_TAG = `<script src="${PANEL_PATH}" defer></script>`;

/** The page with the panel's script tag before </body> (or at the end). */
export function withPanel(html: string): string {
  return html.includes(PANEL_PATH) ? html : html.includes('</body>') ? html.replace('</body>', `${PANEL_TAG}</body>`) : html + PANEL_TAG;
}

export const PANEL_SCRIPT = `/* ${OPEN_DEV_MARKER} */
(() => {
  const BASE = '/api/account/open-dev';
  const el = (tag, css, text) => { const node = document.createElement(tag); if (css) node.style.cssText = css; if (text) node.textContent = text; return node; };
  const host = el('div', 'position:fixed;left:8px;bottom:8px;z-index:2147483647;font:12px/1.4 system-ui,sans-serif;color:#fff');
  const badge = el('button', 'background:#b3261e;color:#fff;border:0;border-radius:12px;padding:4px 10px;font:600 12px system-ui,sans-serif;cursor:pointer;opacity:.92', 'Open dev mode');
  const box = el('div', 'display:none;margin-bottom:6px;background:#1c1b1f;border-radius:10px;padding:10px;width:230px;box-shadow:0 4px 16px rgba(0,0,0,.4)');
  const info = el('div', 'margin-bottom:8px;color:#d0cfd4', 'Local development only. Money, waits and trust gates are relaxed.');
  const out = el('div', 'margin-top:6px;color:#ffd8a8;white-space:pre-wrap');
  const call = async (path, body) => {
    out.textContent = '...';
    try {
      const res = await fetch(BASE + path, body === undefined ? { credentials: 'same-origin' } : { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      out.textContent = res.ok ? 'Done. Reloading...' : (data.reason || data.error || 'Refused (' + res.status + ')');
      if (res.ok && body !== undefined) setTimeout(() => location.reload(), 600);
      return data;
    } catch { out.textContent = 'The local server did not answer.'; }
  };
  const button = (label, run) => { const b = el('button', 'display:block;width:100%;margin:3px 0;padding:6px;border:0;border-radius:6px;background:#3b3a40;color:#fff;font:12px system-ui,sans-serif;cursor:pointer', label); b.onclick = run; box.appendChild(b); };
  box.appendChild(info);
  button('Top up my money', () => call('/fund', {}));
  button('Be the operator (admin tools)', () => call('/operator', {}));
  button('Set my trust: phone-checked adult', () => call('/trust', {}));
  button('Seed local players', () => call('/seed', {}));
  const admin = el('a', 'display:block;margin:6px 0 0;color:#9ecbff', 'Open the admin page');
  admin.href = location.protocol + '//admin.localhost:' + location.port + '/api/account/open-dev/operator'; admin.target = '_blank'; admin.rel = 'noopener';
  box.appendChild(admin);
  box.appendChild(out);
  badge.onclick = () => { box.style.display = box.style.display === 'none' ? 'block' : 'none'; };
  host.appendChild(box); host.appendChild(badge);
  document.body.appendChild(host);
})();
`;
