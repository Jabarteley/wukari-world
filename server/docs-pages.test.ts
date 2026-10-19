// OWNER: growth — the public guides: /features and /pages on the Node host, plain HTML, no script, a contents list that links to every section.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './test-fixture.ts';
import { featuresPageHtml, pagesPageHtml, PAGE_SECTIONS } from './docs-pages.ts';
import { FEATURE_SECTIONS } from './docs-features.ts';
import { parsePath, isReservedPath } from '../src/paths.ts';
import { sitemapPaths } from './path-meta.ts';

for (const [path, title] of [['/features', 'Features — Allworld'], ['/pages', 'Pages — Allworld']] as const) {
  test(`guide ${path}: served as plain HTML with no script, its contents list, its canonical and the links between the guides`, async (t) => {
    const f = await fixture(t, { env: {} });
    const res = await f.request(path);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') ?? '', /text\/html/);
    const html = await res.text();
    for (const words of [`<title>${title}</title>`, `rel="canonical" href="${f.base}${path}"`, 'On this page', `href="${f.base}/features"`, `href="${f.base}/pages"`, `href="${f.base}/money"`, `href="${f.base}/privacy"`, 'aria-current="page"']) assert.ok(html.includes(words), words);
    assert.equal(/<script/i.test(html), false, 'no script on the page');
    for (const route of ['/features/', '/pages/x']) assert.equal((await f.request(route)).status, 200, route);
  });
}

test('guides: every section has a unique anchor the contents list links to, and every entry says what it does', () => {
  for (const [sections, html] of [[FEATURE_SECTIONS, featuresPageHtml('https://joinallworld.com')], [PAGE_SECTIONS, pagesPageHtml('https://joinallworld.com')]] as const) {
    const ids = sections.map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length, 'unique section ids');
    for (const id of ids) { assert.ok(html.includes(`<section id="${id}">`), id); assert.ok(html.includes(`href="#${id}"`), id) }
    for (const section of sections) {
      assert.ok(section.entries.length > 0, section.id);
      for (const entry of section.entries) {
        assert.ok(entry.name.trim() && entry.text.trim(), `${section.id}: ${entry.name}`);
        if (entry.href) assert.match(entry.href, /^\/[a-z0-9/._-]*$/, entry.href);
      }
    }
  }
});

test('guides: a linked name points at an address the game or the server answers, never at a share pattern', () => {
  for (const section of [...FEATURE_SECTIONS, ...PAGE_SECTIONS]) {
    for (const { href } of section.entries) if (href) assert.equal(href.includes('<'), false, href);
  }
  assert.ok(isReservedPath('/features') && isReservedPath('/pages'), 'the guides are never read as a place');
  assert.equal(parsePath('/pages'), null);
  for (const path of ['/features', '/pages']) assert.ok(sitemapPaths().includes(path), path);
});

test('guides: text is escaped and backquotes become code', () => {
  const html = pagesPageHtml('https://joinallworld.com');
  assert.ok(html.includes('<code>/&lt;city&gt;</code>'));
  assert.equal(featuresPageHtml('javascript:alert(1)').includes('javascript:'), false, 'an unsafe origin is dropped');
});
