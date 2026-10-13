// OWNER: games (real-time) — the link preview of an invite to a live game names the game.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { withPathMeta, roomMeta } from './path-meta.ts';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('an invite link names the game and is not indexed', () => {
  const page = withPathMeta(html, '/', 'https://play.example', '?table=g-football-k7m2qp');
  assert.match(page, /<title>Join my Football match on Allworld<\/title>/);
  assert.match(page, /og:title" content="Join my Football match on Allworld"/);
  assert.match(page, /noindex/);
});

test('anything that is not a known game room keeps the default head', () => {
  for (const search of ['', '?table=buka-corner', '?table=g-nope-k7m2qp', '?table=g-fight-AAAAAA', '?x=1']) assert.equal(roomMeta('/', search), null, search);
  assert.equal(roomMeta('/games', '?table=g-fight-k7m2qp'), null);
  assert.equal(withPathMeta(html, '/', '', '?table=buka-corner'), html);
});

test('the title comes from the registry, never from the link', () => {
  const meta = roomMeta('/', '?table=g-fight-k7m2qp&name=<script>');
  assert.equal(meta?.title, 'Join my Fight match on Allworld');
});
