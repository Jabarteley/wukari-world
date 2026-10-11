// Puts a reference screenshot and our dressed room side by side in one labelled picture.
//   node --experimental-strip-types scripts/street-assets/compare.ts <reference.png> <ours.jpg> <out.png> [--port 4489]
import { rmSync, writeFileSync } from 'node:fs';
import { Browser } from '../journeys/cdp.ts';

const [ref, ours, out] = process.argv.slice(2) as [string, string, string];
const portAt = process.argv.indexOf('--port');
const port = portAt >= 0 ? Number(process.argv[portAt + 1]) : 4489;
const b = await Browser.launch(port);
try {
  await b.setViewport({ width: 2580, height: 880, scale: 1, mobile: false });
  const data = (p: string, _mime: string): string => `file://${p}`;
  const html = `<html><body style="margin:0;background:#1b1b1b;font:600 26px system-ui;color:#fff"><div style="display:flex;gap:20px;padding:10px"><div><div style="padding:6px 0">Reference</div><img src="${data(ref, 'image/png')}" width="1270"></div><div><div style="padding:6px 0">Ours</div><img src="${data(ours, 'image/jpeg')}" width="1270"></div></div></body></html>`;
  const page = out + '.html'; writeFileSync(page, html);
  await b.goto('file://' + page);
  await b.eval('new Promise(r=>setTimeout(r,800))');
  const s = await b.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(out, Buffer.from(s.data, 'base64'));
  rmSync(out + '.html'); console.log('saved', out);
} finally { b.close(); }
process.exit(0);
