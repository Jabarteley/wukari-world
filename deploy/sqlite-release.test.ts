// OWNER: store — the store moving ITSELF between layouts as a build asks (deploy/store-release.ts, docs/STORE-MIGRATION.md):
// bounded steps, only forwards, the operator's choice left alone, findings that outlive a restart, a failure at any statement,
// and a build of before taking turns with this one on the same stored state. On a node:sqlite stand-in.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSqliteStore } from './sqlite-store.ts';
import { testStorage } from '../server/testing/sqliteStorage.ts';
import { legacySeed } from '../server/testing/legacySeed.ts';
import { KEYED_SPECS } from '../server/keyed.ts';
import type { SqlBinding, SqliteStorage, SqlCursor, SqlRow } from './cf-types.ts';
import type { StoreLayoutTools, TransactOptions } from '../server/types.ts';

type Draft = Record<string, unknown>;
interface Loose {
  transact<T>(operation: (db: Draft) => T | Promise<T>, options?: TransactOptions<T>): Promise<T>
  read<T>(operation: (db: Draft) => T | Promise<T>): Promise<T>
  flush(): Promise<void>
  layout: Required<StoreLayoutTools>
}
type Options = NonNullable<Parameters<typeof createSqliteStore>[1]>;
const open = (storage: SqliteStorage, options: Options = {}): Loose => createSqliteStore(storage, { log: () => {}, ...options }) as unknown as Loose;
/** The store as the build of before opens it: no word of its own, so whatever the store names, else one value per collection. */
const before = (storage: SqliteStorage, options: Options = {}): Loose => open(storage, options);
const KEYED = Object.keys(KEYED_SPECS);
type Storage = ReturnType<typeof testStorage>;

/** A stored state as the live layout holds it: the four seeded collections, and agents with keys and audit trails. */
function seed(t: Storage, players: number, seedNumber = 1, agents = 40): void {
  const { collections, ids } = legacySeed({ players, seed: seedNumber });
  open(t.storage);
  const keys: Record<string, unknown> = {}, chars: Record<string, unknown> = {}, names: Record<string, string> = {}, owners: Record<string, unknown> = {};
  for (let i = 0; i < agents; i += 1) {
    const id = ids[i % ids.length] as string, hash = `h${String(i).padStart(4, '0')}`;
    keys[hash] = { name: `Agent ${i}`, account: `acct${i}`, publicId: id, mode: 'agent', day: 20000, today: i, calls: i * 7, refusals: 0, audit: Array.from({ length: 20 }, (_, n) => ({ at: 1_790_000_000_000 + n, tool: 'look', ok: true, code: 'ok' })) };
    chars[id] = { name: `Agent ${i}`, slug: `agent-${i}`, account: `acct${i}`, city: 'lagos', cash: i, recent: [] };
    names[`agent-${i}`] = id; owners[`acct${i}`] = { keys: [hash], chars: [id] };
  }
  const all: Record<string, unknown> = { ...collections, agents: { v: 1, settings: { ceiling: 6000 }, keys, owners, chars, claims: {}, names } };
  for (const [name, value] of Object.entries(all)) t.db.prepare('INSERT INTO collections(name,value) VALUES(?,?)').run(name, JSON.stringify(value));
}
const logical = async (store: Loose): Promise<string> => JSON.stringify(await store.layout.logical());
const meta = (t: Storage, key: string): string | undefined => (t.db.prepare('SELECT value FROM store_meta WHERE key = ?').get(key) as { value: string } | undefined)?.value;
const legacyRows = (t: Storage): string => JSON.stringify(t.db.prepare("SELECT name, value FROM collections WHERE name NOT LIKE 'root:%' ORDER BY name").all()) + JSON.stringify(t.db.prepare("SELECT name, part, value FROM collection_parts WHERE name NOT LIKE 'root:%' AND name NOT LIKE 'entry:%' ORDER BY name, part").all());
interface Status { requested: string; stored: string | null; cutoverAt: number | null; shadow: { mismatches: number; errors: number; first: string[]; compared: number }; release: { target: string | null; by: string | null; moving: string | null; pending: string[]; refusal: string | null; steps: { count: number; largest: { collection: string; chars: number } | null } }; collections: Record<string, { mode: string; synced: boolean; legacyChars: number; error: string | null; entries: number }> }
const status = async (store: Loose): Promise<Status> => await store.layout.status() as unknown as Status;
const equalCopies = async (store: Loose): Promise<boolean> => Object.values(await store.layout.compare()).every((row) => { const r = row as { equal: boolean; legacyEntries: number; entryRows: number; legacyHash: string | null; entryHash: string | null }; return r.equal && r.legacyEntries === r.entryRows && r.legacyHash === r.entryHash; });
/** A deterministic stream of numbers in [0, 1). */
function stream(seedNumber: number): () => number {
  let s = seedNumber >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let x = s; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
}
interface Social { players: Record<string, { seen: number; name: string; friends: Record<string, number>; blocked: Record<string, number> }>; convs: Record<string, { messages: unknown[]; seq: number }>; pending: Record<string, unknown[]>; seq: number }
interface Agents { keys: Record<string, { today: number; calls: number; audit: unknown[] }>; chars: Record<string, { cash: number }>; names: Record<string, string>; settings: { ceiling: number } }
/** One request's worth of change, chosen by `r`: what players and agents do to the shared collections. Answers what the request would be told. */
function change(db: Draft, r: number, pick: number, step: number): unknown {
  const social = db['social'] as Social, agents = db['agents'] as Agents;
  const ids = Object.keys(social.players), id = ids[Math.floor(pick * ids.length)] as string;
  if (r < 0.2) { const p = social.players[id]; if (p) { p.seen += 1; return p.seen; } return null; }
  if (r < 0.3) { social.players[`n${step}`] = { name: `Newcomer ${step}`, seen: step, friends: {}, blocked: {} }; return Object.keys(social.players).length; }
  if (r < 0.36) { delete social.players[id]; return id in social.players; }
  if (r < 0.5) { const key = Object.keys(social.convs)[Math.floor(pick * 5)]; if (!key) return null; const conv = social.convs[key]!; conv.messages.push({ seq: ++conv.seq, from: id, body: `m${step}`, at: step }); return conv.seq; }
  if (r < 0.58) { (social.pending[id] ??= []).push({ n: step, at: step, cityId: 'lagos', keep: true, payload: {} }); return social.pending[id]!.length; }
  if (r < 0.8) {
    // An agent call: the key is found, counted, and its audit trail turned over.
    const hashes = Object.keys(agents.keys), hash = hashes[Math.floor(pick * hashes.length)] as string, key = agents.keys[hash];
    if (!key) return null;
    key.today += 1; key.calls += 1; key.audit.push({ at: step, tool: 'act', ok: true, code: 'ok' }); if (key.audit.length > 20) key.audit.shift();
    return [key.today, key.calls];
  }
  if (r < 0.86) { agents.keys[`new${step}`] = { today: 0, calls: 0, audit: [] }; agents.names[`new-${step}`] = id; return Object.keys(agents.keys).length; }
  if (r < 0.9) { const hashes = Object.keys(agents.keys), hash = hashes[Math.floor(pick * hashes.length)] as string; delete agents.keys[hash]; return hashes.length; }
  if (r < 0.95) { (db['growth'] as { sweptAt: number }).sweptAt = step; return step; }
  social.seq += 1; agents.settings.ceiling += 1;
  return [social.seq, agents.settings.ceiling];
}

test('a build that asks for shadow copies the collections a bounded step at a time, keeps every copy, and writes down shadow only when all exist', async () => {
  const t = testStorage(); seed(t, 300);
  const stored = legacyRows(t), baseline = await logical(before(t.storage));
  const sizes = (await status(before(t.storage))).collections;
  const largest = Math.max(...Object.values(sizes).map((c) => c.legacyChars));
  assert.ok(largest > 100000, 'the seed is large enough to need several steps');
  // A step holds at most the largest collection, so the move takes several transactions.
  const store = open(t.storage, { target: 'shadow', stepChars: 60000, shadowSample: 1 });
  let transactions = 0, seenPending = new Set<number>();
  for (;;) {
    await store.read(() => undefined); transactions += 1;
    const now = await status(store);
    seenPending.add(now.release.pending.length);
    assert.equal(now.requested, 'shadow');
    // Whatever is copied so far is kept equal; what is not copied is still served from its stored value.
    assert.equal(await logical(store), baseline);
    if (!now.release.pending.length) break;
    assert.equal(now.stored, null, 'shadow is not written down while any copy is missing');
    assert.ok(transactions < 50);
  }
  assert.ok(transactions >= 3, `the move took ${transactions} transactions`);
  assert.ok(seenPending.size >= 3);
  const done = await status(store);
  assert.equal(done.stored, 'shadow'); assert.equal(done.release.by, 'release'); assert.equal(done.release.moving, null);
  assert.equal(done.release.steps.count, KEYED.length);
  assert.equal(done.release.steps.largest?.collection, Object.entries(sizes).find(([, c]) => c.legacyChars === largest)?.[0]);
  assert.ok(await equalCopies(store));
  assert.equal(legacyRows(t), stored, 'making the copies writes nothing to the stored values');
  // From here every write goes both ways.
  const random = stream(4);
  for (let step = 0; step < 60; step += 1) await store.transact((db) => change(db, random(), random(), step));
  assert.ok(await equalCopies(store));
  const after = await status(store);
  assert.equal(after.shadow.mismatches, 0); assert.equal(after.shadow.errors, 0); assert.ok(after.shadow.compared > 0);
});

test('a build that asks for entries after shadow switches only when every copy equals its stored value, and never goes back by itself', async () => {
  const t = testStorage(); seed(t, 120);
  const a = open(t.storage, { target: 'shadow' });
  const random = stream(9);
  for (let step = 0; step < 40; step += 1) await a.transact((db) => change(db, random(), random(), step));
  await a.flush();
  const expected = await logical(a), stored = legacyRows(t);
  const b = open(t.storage, { target: 'entries' });
  await b.read(() => undefined);
  const switched = await status(b);
  assert.equal(switched.requested, 'entries'); assert.equal(switched.stored, 'entries'); assert.equal(switched.release.by, 'release'); assert.ok(switched.cutoverAt);
  assert.ok(Object.values(switched.collections).every((c) => c.mode === 'entries'));
  assert.equal(await logical(b), expected);
  assert.equal(legacyRows(t), stored, 'the switch writes nothing to the stored values');
  await b.transact((db) => change(db, 0.7, 0.5, 1000));
  assert.equal(legacyRows(t), stored, 'after the switch the stored values of before are left as they were');
  const moved = await logical(b);
  assert.notEqual(moved, expected);
  // A later build that says less than the store has reached changes nothing, whichever word it carries.
  for (const target of ['legacy', 'shadow', undefined] as const) {
    const later = open(t.storage, target === undefined ? {} : { target });
    assert.equal((await status(later)).requested, 'entries');
    assert.equal(await logical(later), moved);
  }
});

test('a store that was never moved goes from the stored values straight to entries when a build asks, with the same checks', async () => {
  const t = testStorage(); seed(t, 80);
  const baseline = await logical(before(t.storage));
  const store = open(t.storage, { target: 'entries' });
  assert.equal(await store.read((db) => Object.keys((db['social'] as Social).players).length), 80);
  const now = await status(store);
  assert.equal(now.stored, 'entries'); assert.equal(await logical(store), baseline);
  // An empty store is in entries from its first transaction.
  const fresh = testStorage(), empty = open(fresh.storage, { target: 'entries' });
  await empty.transact((db) => { db['social'] = { players: { a: { seen: 1 } }, convs: {}, houses: {}, pending: {}, seq: 0 }; });
  assert.equal((await status(empty)).collections['social']?.mode, 'entries');
  assert.equal((fresh.db.prepare("SELECT COUNT(*) AS n FROM entries WHERE coll = 'social'").get() as { n: number }).n, 1);
});

test('what the operator chose is left alone by every build, and a store told before this build is treated as the operator\'s', async () => {
  const t = testStorage(); seed(t, 40);
  // The operator holds the store where it is.
  const held = open(t.storage, { target: 'shadow' });
  await held.layout.setLayout('legacy');
  assert.equal(meta(t, 'layout-by'), 'operator');
  for (const target of ['shadow', 'entries'] as const) {
    const store = open(t.storage, { target });
    await store.read(() => undefined);
    const now = await status(store);
    assert.equal(now.requested, 'legacy'); assert.equal(now.release.moving, null); assert.equal(now.release.by, 'operator');
    assert.equal(now.collections['social']?.entries, 0);
  }
  // The operator lets go by choosing the next layout: from then on that is the operator's too.
  const store = open(t.storage, { target: 'entries' });
  await store.layout.setLayout('shadow');
  const again = open(t.storage, { target: 'entries' });
  await again.read(() => undefined);
  assert.equal((await status(again)).requested, 'shadow', 'shadow chosen by the operator is not switched by a build');
  // A layout row with no note of who wrote it (a store told by the build of before) is the operator's.
  const old = testStorage(); seed(old, 40);
  await before(old.storage).layout.setLayout('shadow');
  old.db.prepare("DELETE FROM store_meta WHERE key = 'layout-by'").run();
  const met = open(old.storage, { target: 'entries' });
  await met.read(() => undefined);
  assert.equal((await status(met)).requested, 'shadow'); assert.equal((await status(met)).release.by, 'operator');
});

test('a collection too large to copy unasked stays as it was, and nothing is switched while any copy is missing', async () => {
  const t = testStorage(); seed(t, 200);
  const baseline = await logical(before(t.storage));
  const store = open(t.storage, { target: 'entries', maxStepChars: 100000 });
  await store.read(() => undefined);
  const now = await status(store);
  assert.match(now.collections['social']?.error ?? '', /too large/);
  assert.equal(now.collections['social']?.synced, false); assert.equal(now.collections['agents']?.synced, true);
  assert.equal(now.stored, null); assert.deepEqual(now.release.pending, ['social']);
  assert.equal(await logical(store), baseline);
  await store.transact((db) => change(db, 0.1, 0.3, 1));
  // The operator may copy it by hand; the next start then goes on.
  await store.layout.migrate(['social']);
  const next = open(t.storage, { target: 'entries', maxStepChars: 100000 });
  await next.read(() => undefined);
  assert.equal((await status(next)).stored, 'entries');
});

test('a copy that differs is found, made again from the stored value, and held against the switch across restarts until the copies are made afresh', async () => {
  const t = testStorage(); seed(t, 60);
  const a = open(t.storage, { target: 'shadow', shadowSample: 1 });
  await a.read(() => undefined);
  const truth = await logical(a);
  // Damage one row of the copy behind the store's back.
  t.db.prepare("UPDATE entries SET value = '{\"seen\":-1}' WHERE coll = 'social' AND map = 'players' AND ord = 3").run();
  await a.read((db) => (db['social'] as Social).seq);
  const found = await status(a);
  assert.equal(found.shadow.mismatches, 1); assert.match(found.shadow.first[0] ?? '', /^social\/players\//);
  assert.equal(await logical(a), truth, 'the stored value is the truth: nothing a player sees changed');
  await a.read(() => undefined);
  assert.ok(await equalCopies(a), 'the copy was made again');
  // A build asking for entries meets the finding after a restart and does not switch.
  const b = open(t.storage, { target: 'entries' });
  await b.read(() => undefined);
  const refused = await status(b);
  assert.equal(refused.requested, 'shadow'); assert.equal(refused.shadow.mismatches, 1); assert.match(refused.release.refusal ?? '', /^shadow_mismatch/);
  await b.transact((db) => change(db, 0.1, 0.2, 5));
  assert.ok(await equalCopies(b), 'shadow goes on being kept after a refusal');
  // The operator makes every copy afresh: the finding is cleared and the next start switches.
  await b.layout.migrate();
  assert.equal((await status(b)).shadow.mismatches, 0); assert.equal(meta(t, 'shadow-found'), undefined);
  const c = open(t.storage, { target: 'entries' });
  await c.read(() => undefined);
  assert.equal((await status(c)).stored, 'entries');
});

test('a copy that differs at the moment of the switch stops the switch', async () => {
  const t = testStorage(); seed(t, 60);
  const a = open(t.storage, { target: 'shadow', shadowSample: 1000000 });
  await a.read(() => undefined);
  const truth = await logical(a);
  t.db.prepare("DELETE FROM entries WHERE coll = 'agents' AND map = 'keys' AND ord = 2").run();
  const b = open(t.storage, { target: 'entries', shadowSample: 1000000 });
  await b.read(() => undefined);
  const refused = await status(b);
  assert.equal(refused.requested, 'shadow'); assert.equal(refused.stored, 'shadow'); assert.match(refused.release.refusal ?? '', /^not_equal: agents\/keys/);
  assert.equal(refused.shadow.mismatches, 1);
  assert.equal(await logical(b), truth);
});

/** A storage whose statements can be made to fail from the Nth one on. */
function breakable(t: Storage): { storage: SqliteStorage; arm(at: number): void; disarm(): number } {
  let count = 0, at = Infinity;
  const storage: SqliteStorage = {
    sql: { exec<Row extends SqlRow>(query: string, ...params: SqlBinding[]): SqlCursor<Row> { count += 1; if (count >= at) throw new Error(`injected failure at statement ${count}`); return t.storage.sql.exec<Row>(query, ...params); } },
    transactionSync: (fn) => t.storage.transactionSync(fn),
    sync: () => t.storage.sync(),
  };
  return { storage, arm(n) { count = 0; at = n; }, disarm() { at = Infinity; return count; } };
}

test('the move stopped at any statement (the object lost, a deploy, a failed write) is taken up again and ends equal', async () => {
  const fresh = (): Storage => { const t = testStorage(); seed(t, 30, 3, 12); return t; };
  const probeStorage = fresh(), probe = breakable(probeStorage);
  const baseline = await logical(before(probeStorage.storage));
  // How many statements the whole move to entries takes, opening the store included.
  probe.arm(Infinity);
  const whole = open(probe.storage, { target: 'entries', stepChars: 20000 });
  for (let i = 0; i < 30; i += 1) await whole.read(() => undefined);
  const total = probe.disarm();
  assert.equal((await status(whole)).stored, 'entries');
  assert.ok(total > 200, `${total} statements`);
  const stride = Math.max(1, Math.floor(total / 80));
  for (let at = 2; at <= total; at += stride) {
    const t = fresh(), b = breakable(t);
    b.arm(at);
    // The store that is cut off: everything it throws is what a lost object looks like to the next one.
    try { const cut = open(b.storage, { target: 'entries', stepChars: 20000 }); for (let i = 0; i < 30; i += 1) await cut.read(() => undefined).catch(() => undefined); } catch { /* cut off while opening */ }
    b.disarm();
    // The next start: reads what was there, finishes the move, loses nothing.
    const next = open(t.storage, { target: 'entries', stepChars: 20000 });
    for (let i = 0; i < 30; i += 1) await next.read(() => undefined);
    const now = await status(next);
    assert.equal(now.stored, 'entries', `after a stop at statement ${at}: ${JSON.stringify(now.release)}`);
    assert.equal(await logical(next), baseline, `after a stop at statement ${at}`);
  }
});

for (const seedNumber of [1, 2, 3]) {
  test(`the build of before and this build take turns on one store through the whole move: every answer and every collection as on a store that never moved (seed ${seedNumber})`, async () => {
    const moved = testStorage(), plain = testStorage();
    seed(moved, 50, seedNumber, 30); seed(plain, 50, seedNumber, 30);
    const random = stream(seedNumber * 101);
    // The reference: one store in the live layout, never restarted with another build.
    const reference = before(plain.storage);
    /** Which build holds the object in each turn. The overlap of a deploy is a few turns of either at each stage. */
    const turns: { build: 'before' | 'shadow' | 'entries'; stage: string }[] = [];
    for (const build of ['before', 'shadow', 'before', 'shadow', 'before', 'shadow', 'shadow'] as const) turns.push({ build, stage: 'release A' });
    for (const build of ['entries', 'shadow', 'before', 'entries', 'shadow', 'entries', 'before', 'entries'] as const) turns.push({ build, stage: 'release B' });
    let step = 0;
    for (const [n, turn] of turns.entries()) {
      // Small steps, so that a turn often ends with the copies half made.
      const store = turn.build === 'before' ? before(moved.storage, { lazyFlushMs: 60000 }) : open(moved.storage, { target: turn.build, stepChars: 30000, shadowSample: 1, lazyFlushMs: 60000 });
      const requests = 3 + Math.floor(random() * 12);
      for (let i = 0; i < requests; i += 1) {
        const r = random(), pick = random(), lazy = random() < 0.25;
        step += 1;
        const here = step;
        const [got, want] = [await store.transact((db) => change(db, r, pick, here), { durable: !lazy }), await reference.transact((db) => change(db, r, pick, here))];
        assert.deepEqual(got, want, `turn ${n} (${turn.build}, ${turn.stage}), request ${i}`);
      }
      assert.equal(await logical(store), await logical(reference), `turn ${n} (${turn.build}, ${turn.stage})`);
      const now = await status(store);
      assert.equal(now.shadow.mismatches, 0, `turn ${n}: ${JSON.stringify(now.shadow.first)}`); assert.equal(now.shadow.errors, 0);
      // The object is handed over: what it held in memory is written first, as a deploy lets it.
      await store.flush(); await reference.flush();
    }
    const last = open(moved.storage, { target: 'entries' });
    const end = await status(last);
    assert.equal(end.stored, 'entries'); assert.equal(end.release.by, 'release');
    assert.equal(await logical(last), await logical(reference));
    // Once the store names `entries`, the build of before reads and writes entries too: its writes are seen by this build.
    const old = before(moved.storage);
    assert.equal((await status(old)).requested, 'entries');
    await old.transact((db) => { (db['agents'] as Agents).settings.ceiling = 4242; });
    assert.equal(await open(moved.storage, { target: 'entries' }).read((db) => (db['agents'] as Agents).settings.ceiling), 4242);
  });
}

test('a build of before that meets copies half made drops their marks, so no stale copy is ever trusted', async () => {
  const t = testStorage(); seed(t, 120);
  const a = open(t.storage, { target: 'shadow', stepChars: 30000 });
  await a.read(() => undefined);
  const half = await status(a);
  assert.ok(half.release.pending.length > 0 && half.release.pending.length < KEYED.length, 'some copies made, some not');
  // The build of before writes to a collection whose copy exists, in the live layout only.
  const old = before(t.storage);
  await old.transact((db) => change(db, 0.7, 0.5, 1));
  assert.equal((t.db.prepare("SELECT COUNT(*) AS n FROM store_meta WHERE key LIKE 'synced:%'").get() as { n: number }).n, 0);
  const truth = await logical(old);
  const b = open(t.storage, { target: 'shadow', stepChars: 100000000 });
  await b.read(() => undefined);
  assert.equal((await status(b)).stored, 'shadow');
  assert.ok(await equalCopies(b));
  assert.equal(await logical(b), truth);
});

test('a text longer than a row is never cut in the middle of a character: every emoji is read back as it was written, in every layout and in the world shards', async () => {
  const { sqliteShardBackend } = await import('./sqlite-shards.ts');
  for (const layout of ['legacy', 'shadow', 'entries'] as const) {
    const t = testStorage();
    let store = open(t.storage, { layout, chunk: 100, shadowSample: 1 });
    for (let pad = 80; pad < 104; pad += 1) {
      // The cut falls on each unit of four two-unit characters in turn, in a whole collection, in a root and in one long entry.
      const body = `${'x'.repeat(pad)}${'\u{1F600}'.repeat(4)}\u{1F469}‍\u{1F4BB}tail`;
      await store.transact((db) => { db['support'] = { note: body }; db['social'] = { players: { a: { name: body, seen: pad } }, convs: {}, houses: {}, pending: {}, seq: pad, note: body }; });
      store = open(t.storage, { layout, chunk: 100, shadowSample: 1 });
      assert.equal(await store.read((db) => (db['support'] as { note: string }).note), body, `${layout}, a whole collection, ${pad}`);
      assert.equal(await store.read((db) => (db['social'] as { players: Record<string, { name: string }> }).players['a']?.name), body, `${layout}, an entry, ${pad}`);
      assert.equal(await store.read((db) => (db['social'] as { note: string }).note), body, `${layout}, a root, ${pad}`);
    }
    assert.equal((t.db.prepare("SELECT COUNT(*) AS n FROM collection_parts WHERE instr(value, char(65533)) > 0").get() as { n: number }).n, 0);
    if (layout === 'shadow') { const now = await status(store); assert.equal(now.shadow.mismatches, 0); assert.ok(await equalCopies(store)); }
  }
  const t = testStorage(), shards = sqliteShardBackend(t.storage, { chunk: 50 });
  for (let pad = 40; pad < 54; pad += 1) {
    const line = `${'y'.repeat(pad)}${'\u{1F1F3}\u{1F1EC}'.repeat(3)}end`;
    await shards.replace('lagos', line); await shards.append('lagos', line);
    assert.equal(await shards.read('lagos'), line + line, `shard, ${pad}`);
  }
});
