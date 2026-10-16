/** Catalogue-driven accounting for the exact native runtime selection. No network requests. */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { NATIVE_ASSET_LIMITS as limits } from './native-character-policy.mjs';

/**
 * @typedef {{raw:number,gzip:number,brotli:number}} Sizes
 * @typedef {{id:string,url?:string,bodyVariants?:Record<string,Partial<Item>>}} Item
 * @typedef {{id:string,url:string,complexions?:Record<string,string>,variants?:Record<string,Record<string,string|Partial<Item>>>}} Body
 * @typedef {{bodies?:Body[],base:Body,hair:Item[],garments:Item[],shoes:Item[],eyeColors:Item[],defaults:{hair:string,garments:string[],shoes:string,eyeColor:string}}} Catalog
 * @param {unknown} catalog
 * @param {Item | undefined} item
 * @param {Body} body
 * @param {string} category
 */
export function resolveItem(catalog, item, body, category) {
  const fitted = item?.bodyVariants?.[body.id];
  const variant = item ? body.variants?.[category]?.[item.id] : undefined;
  return { ...item, ...(fitted && typeof fitted === 'object' ? fitted : {}), ...(typeof variant === 'string' ? { url: variant } : variant ?? {}) };
}
/** @param {string} root @param {string} [assetRoot] @param {(url:string,sha256:string) => Sizes | undefined} [measured] */
export async function inventory(root, assetRoot = resolve(root, 'public'), measured) {
  const publicRoot = resolve(assetRoot);
  const profilePath = resolve(root, 'src/scene/character-lab/runtime/selected-profile.mjs');
  const { profile } = await import(pathToFileURL(profilePath).href);
  /** @param {string} url */
  const fileFor = url => {
    if (typeof url !== 'string' || !url.startsWith('/character-lab/') || url.includes('?') || url.includes('#')) throw Error(`Non-local native asset URL: ${url}`);
    const file = resolve(publicRoot, `.${url}`);
    if (!file.startsWith(publicRoot + sep)) throw Error(`Asset path escapes public root: ${url}`);
    return file;
  };
  /** @type {Catalog} */
  const catalog = JSON.parse(await readFile(fileFor(profile.catalogUrl), 'utf8'));
  const resources = new Map(), conflicts = [];
  /** @param {string | undefined} url @param {string} kind */
  const add = (url, kind) => { if (!url) return; fileFor(url); const entry = resources.get(url) ?? { url, kinds: new Set() }; entry.kinds.add(kind); resources.set(url, entry); };
  add(profile.catalogUrl, 'catalog'); add(profile.animationUrl, 'motion'); add(profile.motionMetadataUrl, 'motion');
  const defaults = [];
  for (const body of catalog.bodies ?? [catalog.base]) {
    add(body.url, 'body');
    for (const url of Object.values(body.complexions ?? {})) add(url, 'complexion');
    for (const category of /** @type {const} */ (['hair', 'garments', 'shoes'])) for (const item of catalog[category] ?? []) {
      const selected = resolveItem(catalog, item, body, category);
      const fitted = item.bodyVariants?.[body.id]?.url;
      if (fitted && selected.url !== fitted) conflicts.push({ body: body.id, category, item: item.id, fitted, selected: selected.url });
      add(selected.url, category);
    }
    const urls = new Set([profile.catalogUrl, profile.animationUrl, profile.motionMetadataUrl, body.url]);
    for (const [category, ids] of /** @type {const} */ ([['hair', [catalog.defaults.hair]], ['garments', catalog.defaults.garments], ['shoes', [catalog.defaults.shoes]]])) {
      for (const id of ids) { const item = catalog[category].find(item => item.id === id); const url = resolveItem(catalog, item, body, category).url; if (url) urls.add(url); }
    }
    const eye = catalog.eyeColors.find(item => item.id === catalog.defaults.eyeColor)?.url; if (eye) urls.add(eye);
    defaults.push({ body: body.id, urls: [...urls], totals: {raw:0,gzip:0,brotli:0} });
  }
  for (const eye of catalog.eyeColors ?? []) add(eye.url, 'eyes');
  const rows = [], errors = [];
  for (const entry of resources.values()) {
    try {
      const file = fileFor(entry.url), bytes = await readFile(file);
      const sha256 = createHash('sha256').update(bytes).digest('hex');
      const sizes = measured?.(entry.url, sha256) ?? {raw:bytes.length,gzip:gzipSync(bytes).length,brotli:brotliCompressSync(bytes).length};
      rows.push({ url: entry.url, kinds: [...entry.kinds], sha256, ...sizes });
    } catch (error) { errors.push({ url: entry.url, error: error instanceof Error ? error.message : String(error) }); }
  }
  /** @param {Sizes[]} selected */
  const sum = selected => selected.reduce((a, r) => ({ raw: a.raw + r.raw, gzip: a.gzip + r.gzip, brotli: a.brotli + r.brotli }), { raw: 0, gzip: 0, brotli: 0 });
  for (const entry of defaults) entry.totals = sum(rows.filter(row => entry.urls.includes(row.url)));
  /** @type {{budget:string,url?:string,body?:string,measured:number,limit:number,pass:boolean}[]} */
  const checks = rows.flatMap(row => {
    const name = row.kinds.includes('body') ? 'NATIVE_BODY_BROTLI' : row.kinds.some(kind => ['hair', 'garments', 'shoes'].includes(kind)) ? 'NATIVE_ITEM_BROTLI' : null;
    const limit = name === 'NATIVE_BODY_BROTLI' ? limits.bodyBrotli : limits.itemBrotli;
    return name ? [{ budget: name, url: row.url, measured: row.brotli, limit, pass: row.brotli <= limit }] : [];
  });
  const motion = sum(rows.filter(row => row.kinds.includes('motion'))).brotli;
  checks.push({ budget: 'NATIVE_MOTION_BROTLI', measured: motion, limit: limits.motionBrotli, pass: motion <= limits.motionBrotli });
  for (const entry of defaults) checks.push({ budget: 'NATIVE_DEFAULT_CHARACTER_BROTLI', body: entry.body, measured: entry.totals.brotli, limit: limits.defaultCharacterBrotli, pass: entry.totals.brotli <= limits.defaultCharacterBrotli });
  const total = sum(rows).brotli;
  checks.push({ budget: 'NATIVE_CATALOGUE_BROTLI', measured: total, limit: limits.optionalCatalogueBrotli, pass: total <= limits.optionalCatalogueBrotli });
  /** @type {string[]} */
  const files = [];
  /** @param {string} dir */
  async function walk(dir) { for (const entry of await readdir(dir, { withFileTypes: true })) { const file = resolve(dir, entry.name); if (entry.isDirectory()) await walk(file); else if (entry.isFile()) files.push('/' + relative(publicRoot, file).split(sep).join('/')); else throw Error(`Unexpected symlink or special asset: ${file}`); } }
  await walk(resolve(publicRoot, 'character-lab'));
  const extras = files.filter(url => !resources.has(url) && !url.endsWith('.md'));
  return { scope: 'Exact catalogue resource accounting; excludes JS, decoder bytes and HTTP overhead. Not a browser or phone timing test.', totals: sum(rows), defaults, conflicts, errors, extras, checks, rows, pass: !errors.length && !conflicts.length && !extras.length && checks.every(check => check.pass) };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(process.argv[2] ?? '.');
  const result = await inventory(root, process.argv[4] ? resolve(process.argv[4]) : undefined);
  if (process.argv[3]) await writeFile(resolve(process.argv[3]), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ pass: result.pass, resources: result.rows.length, totals: result.totals, defaults: result.defaults.map(({ body, totals }) => ({ body, totals })), conflicts: result.conflicts.length, errors: result.errors.length, extras: result.extras.length, overBudget: result.checks.filter(check => !check.pass).length }, null, 2));
  process.exitCode = result.pass ? 0 : 1;
}
