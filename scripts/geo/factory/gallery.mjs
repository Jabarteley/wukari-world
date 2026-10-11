import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { contactSheetInputs } from './report.mjs';

const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export function writeReviewPage(out, rows) {
  const cards = contactSheetInputs(out, rows).map(row => {
    const scenePath = join(out, row.id, 'proof', 'scene-source.json');
    const scene = existsSync(scenePath) ? JSON.parse(readFileSync(scenePath, 'utf8')) : null;
    const stages = Object.entries(row.machineStages).map(([name, passed]) => `<li>${escape(name)}: ${passed === true ? 'passed' : 'failed'}</li>`).join('');
    const images = row.images.map(image => `<figure><a href="${escape(image.path)}"><img loading="lazy" src="${escape(image.path)}" alt="${escape(row.id)} ${escape(image.view)} diagnostic"></a><figcaption>${escape(image.view)} · <a href="${escape(image.proof)}">geometry proof</a><details><summary>Image hash</summary><code>${escape(image.sha256)}</code></details></figcaption></figure>`).join('');
    return `<section id="${escape(row.id)}"><h2>${escape(row.id)}</h2><p class="hold">Candidate held for review</p>${scene ? `<p>${scene.places} source places · ${scene.triangles.toLocaleString('en')}/${scene.triangleLimit.toLocaleString('en')} triangles · ${scene.drawCalls}/${scene.drawCallLimit} draw calls</p>` : ''}<details><summary>Checks and outstanding work</summary><ul>${stages}</ul><ul>${row.reasons.map(reason => `<li>${escape(reason)}</li>`).join('')}</ul></details><div class="images">${images || '<p>No rendered images available.</p>'}</div>${row.missingViews.length ? `<p>Missing views: ${escape(row.missingViews.join(', '))}</p>` : ''}</section>`;
  }).join('');
  writeFileSync(join(out, 'index.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>City generation review</title><style>body{margin:0;background:#f4f2ea;color:#183427;font:16px/1.5 system-ui,sans-serif}main{max-width:1500px;margin:auto;padding:28px}h1,h2{line-height:1.2}section{background:white;border:1px solid #d4dbd4;border-radius:12px;padding:20px;margin:28px 0}.hold{display:inline-block;background:#fff0c7;padding:4px 12px;border-radius:8px}.images{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,480px),1fr));gap:20px}figure{margin:18px 0}img{width:100%;height:auto;display:block}a{color:#215b46}code{overflow-wrap:anywhere}summary{cursor:pointer}nav a{margin-right:18px}</style><main><h1>City generation review</h1><p>Machine checks support review. These candidates are not release-approved or live.</p><nav>${rows.map(row => `<a href="#${escape(row.id)}">${escape(row.id)}</a>`).join('')}</nav><p><a href="machine-holds.json">Full check table</a> · <a href="contact-sheet-inputs.json">Image inventory and hashes</a></p>${cards}</main></html>`);
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const out = resolve(process.argv[2]);
  writeReviewPage(out, JSON.parse(readFileSync(join(out, 'machine-holds.json'), 'utf8')).rows);
}
