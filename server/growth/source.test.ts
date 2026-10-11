// OWNER: growth — counting where visits came from (server/growth/metrics.ts countSource, POST /api/growth/source).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from '../test-fixture.ts';
import { KEEP, countSource, prune, report } from './metrics.ts';
import type { GrowthMetricsResponse } from '../../src/types/growth.ts';
import type { GrowthCollection } from '../types.ts';

const DAY = 86400000;
const TOKEN = 'operator-token-for-growth-tests-0123456789';
const empty = (): GrowthCollection => ({ salt: 's', players: {}, shares: {}, metrics: {}, tables: {}, sweptAt: 0 });

test('one campaign is counted per step, words are cleaned again, and a bad event counts nothing', () => {
  const g = empty(), now = 1_800_000_000_000;
  countSource(g, now, { source: 'TikTok', medium: 'paid', campaign: 'test1' }, 'landed');
  countSource(g, now, { source: 'tiktok', medium: 'paid', campaign: 'test1' }, 'landed');
  countSource(g, now, { source: 'tiktok', medium: 'paid', campaign: 'test1' }, 'play');
  countSource(g, now, { source: 'a b', medium: '<x>' }, 'landed');
  countSource(g, now, { source: 'tiktok' }, 'nonsense' as 'landed');
  const out = report(g, now);
  const tiktok = out.campaigns.find((row) => row.source === 'tiktok');
  assert.deepEqual(tiktok, { source: 'tiktok', medium: 'paid', campaign: 'test1', content: 'none', landed: 2, play: 1, game: 0, stayed: 0 });
  assert.deepEqual(out.campaigns.find((row) => row.source === 'direct')?.landed, 1, 'an unusable word is direct');
  assert.equal(out.campaigns.length, 2);
});

test('distinct campaign keys are capped per day; the rest are counted as other', () => {
  const g = empty(), now = 1_800_000_000_000;
  for (let i = 0; i < KEEP.sourceKeys + 50; i++) countSource(g, now, { source: 'x', campaign: `c${i}` }, 'landed');
  const rows = report(g, now).sources;
  assert.equal(rows.length, KEEP.sourceKeys + 1);
  const other = rows.find((row) => row.source === 'other');
  assert.equal(other?.landed, 50);
  // A key already counted today still counts after the cap; a new day starts afresh.
  countSource(g, now, { source: 'x', campaign: 'c0' }, 'play');
  assert.equal(report(g, now).sources.find((row) => row.campaign === 'c0')?.play, 1);
  countSource(g, now + DAY, { source: 'x', campaign: 'new' }, 'landed');
  assert.equal(report(g, now + DAY, { days: 1 }).sources.length, 1);
});

test('old days are pruned', () => {
  const g = empty(), now = 1_800_000_000_000;
  countSource(g, now, { source: 'x' }, 'landed');
  prune(g, now + (KEEP.sourceDays + 2) * DAY);
  assert.deepEqual(g.metrics.sources, {});
});

test('the endpoint counts a step, refuses an unknown one, is rate limited and stores nothing about the sender', async (t) => {
  const f = await fixture(t, { moderatorToken: TOKEN });
  const post = async (body: unknown) => { const res = await f.request('/api/growth/source', body); return { status: res.status, ...(await res.json() as Record<string, unknown>) }; };
  assert.deepEqual([(await post({ event: 'landed', source: 'TikTok', medium: 'paid', campaign: 'test1' })).counted, (await post({ event: 'play', source: 'tiktok', medium: 'paid', campaign: 'test1' })).counted], [true, true]);
  assert.equal((await post({ event: 'evil', source: 'tiktok' })).counted, false);
  const read = async () => (await (await fetch(`${f.base}/api/mod/growth/metrics`, { headers: { Authorization: `Bearer ${TOKEN}` } })).json()) as GrowthMetricsResponse;
  const report = await read();
  assert.deepEqual(report.campaigns.map(({ source, medium, campaign, landed, play, game, stayed }) => [source, medium, campaign, landed, play, game, stayed]), [['tiktok', 'paid', 'test1', 1, 1, 0, 0]]);
  // Nothing personal is kept: the stored record is only words and four numbers per campaign.
  const stored = JSON.stringify(await f.server.store.read((db) => db.growth?.metrics.sources));
  for (const secret of ['127.0.0.1', 'localhost', 'Mozilla', 'cookie', 'publicId']) assert.equal(stored.includes(secret), false, `no ${secret}`);
  assert.match(stored, /^\{"\d+":\{"tiktok\|paid\|test1\|none":\{"landed":1,"play":1,"game":0,"stayed":0\}\}\}$/);
  for (let i = 0; i < 40; i++) await post({ event: 'landed' });
  assert.equal((await post({ event: 'landed' })).status, 429);
});
