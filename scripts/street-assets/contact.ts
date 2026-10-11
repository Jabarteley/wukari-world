// Contact sheets: many pictures in one labelled image, so each can be looked at. node --experimental-strip-types contact.ts <out-prefix> <cols> <per-sheet> <img>...
import { rmSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { Browser } from '../journeys/cdp.ts';

const [prefix, colsS, perS, ...files] = process.argv.slice(2) as [string, string, string, ...string[]];
const cols = Number(colsS), per = Number(perS);
const b = await Browser.launch(4489);
try {
  const cw = Math.floor(2400 / cols), ch = Math.round(cw * 0.5625);
  for (let s = 0; s * per < files.length; s++) {
    const list = files.slice(s * per, (s + 1) * per);
    const rows = Math.ceil(list.length / cols);
    await b.setViewport({ width: cols * cw, height: rows * (ch + 22), scale: 1, mobile: false });
    const html = `<body style="margin:0;background:#222;color:#fff;font:13px system-ui"><div style="display:grid;grid-template-columns:repeat(${cols},${cw}px)">${list.map((f) => `<div><div style="height:22px;line-height:22px;padding-left:4px">${basename(f)}</div><img src="file://${f}" style="width:${cw}px;height:${ch}px;object-fit:cover;display:block"></div>`).join('')}</div></body>`;
    const page = `${prefix}-${s + 1}.html`; writeFileSync(page, html);
    await b.goto('file://' + page);
    await b.eval('new Promise(r=>setTimeout(r,600))');
    const shot = await b.send('Page.captureScreenshot', { format: 'jpeg', quality: 84 });
    writeFileSync(`${prefix}-${s + 1}.jpg`, Buffer.from(shot.data, 'base64'));
    rmSync(page);
    console.log('sheet', s + 1);
  }
} finally { b.close(); }
process.exit(0);
