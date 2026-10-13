// OWNER: market — db.market on the Worker's per-entry layout (deploy/sqlite-store.ts, server/keyed.ts) on a node:sqlite stand-in:
// the accounts and the books are kept one city at a time, so an order in Lagos writes Lagos rows and nothing of Kano's, and a
// look writes nothing. The rules that change the record are src/game/market-model.ts (pure), shared with the Node server.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSqliteStore } from './sqlite-store.ts';
import { testStorage } from '../server/testing/sqliteStorage.ts';
import { KEYED_SPECS } from '../server/keyed.ts';
import { emptyMarket } from '../server/market/service.ts';
import { emptyAccount, quoteOf, submit } from '../src/game/market-model.ts';
import type { MarketCollection } from '../src/types/market.ts';
import type { StoreLayoutTools, TransactOptions } from '../server/types.ts';

interface Loose {
  transact<T>(operation: (db: Draft) => T | Promise<T>, options?: TransactOptions<T>): Promise<T>
  read<T>(operation: (db: Draft) => T | Promise<T>): Promise<T>
  flush(): Promise<void>
  layout: Required<StoreLayoutTools>
}
type Draft = Record<string, unknown>;
const open = (storage: ReturnType<typeof testStorage>['storage'], options: Parameters<typeof createSqliteStore>[1] = {}): Loose => createSqliteStore(storage, options) as unknown as Loose;
const count = (t: ReturnType<typeof testStorage>, query: string): number => Number((t.db.prepare(query).get() as { n: number }).n);
const NOW = Date.UTC(2026, 9, 5, 10);

/** What the market service does to the record for one order, in one city (the same pure rules). */
function trade(market: MarketCollection, city: string, who: string, side: 'buy' | 'sell', price: number, units: number): void {
  const accounts = (market.accounts[city] ??= {}), books = (market.books[city] ??= {});
  const book = (books.rice ??= []), tape = (market.tape[city] ??= []);
  const result = submit({ accounts, book, tape }, { id: who, name: who }, { commodity: 'rice', side, price, units }, {
    now: NOW, quote: quoteOf(city, 'rice', NOW, book, tape), barred: () => false, frozen: () => false, openOrders: 0, nextId: () => String(++market.seq),
  });
  assert.ok(result.ok, JSON.stringify(result));
}

test('the market is a keyed collection: accounts and books by city, the tape and the small lists in the root', async () => {
  assert.deepEqual(KEYED_SPECS.market, [{ path: ['accounts'] }, { path: ['books'] }]);
  const t = testStorage(), store = open(t.storage, { layout: 'entries' });
  const quote = quoteOf('lagos', 'rice', NOW);
  await store.transact((db) => {
    const market = (db['market'] = emptyMarket()) as MarketCollection;
    for (const city of ['lagos', 'kano']) for (const id of ['ada', 'bola']) (market.accounts[city] ??= {})[id] = { ...emptyAccount(id, 20000), cash: 30000, holdings: { rice: 20 } };
    trade(market, 'lagos', 'bola', 'sell', quote.ref + 10, 5);
    trade(market, 'lagos', 'ada', 'buy', quote.ref + 20, 3);
    trade(market, 'kano', 'ada', 'buy', quoteOf('kano', 'rice', NOW).band.min, 2);
  });
  assert.equal(count(t, "SELECT COUNT(*) AS n FROM entries WHERE coll='market' AND map='accounts'"), 2, 'one row for each city’s accounts');
  assert.equal(count(t, "SELECT COUNT(*) AS n FROM entries WHERE coll='market' AND map='books'"), 2, 'and one for each city’s books');
  const root = (t.db.prepare("SELECT value FROM collections WHERE name='root:market'").get() as { value: string }).value;
  assert.ok(root.includes('{"$keyed":"accounts"}') && root.includes('{"$keyed":"books"}') && root.includes('"tape"') && !root.includes('"cash"'));
  // Read back equal after a restart.
  const again = open(t.storage, { layout: 'entries' });
  const seen = await again.read((db) => JSON.parse(JSON.stringify(db['market'])) as MarketCollection);
  assert.equal(seen.accounts['lagos']?.['ada']?.holdings.rice, 23);
  assert.equal(seen.books['lagos']?.rice?.length, 1);
  assert.equal(seen.books['kano']?.rice?.length, 1);
  assert.equal(seen.tape['lagos']?.length, 1);
  assert.equal(seen.seq > 3, true);
});

test('an order in one city writes that city’s rows only, and a read writes none', async () => {
  const t = testStorage(), store = open(t.storage, { layout: 'entries' });
  await store.transact((db) => {
    const market = (db['market'] = emptyMarket()) as MarketCollection;
    for (const city of ['lagos', 'kano', 'abuja']) for (const id of ['ada', 'bola']) (market.accounts[city] ??= {})[id] = { ...emptyAccount(id, 20000), cash: 30000, holdings: { rice: 20 } };
  });
  const before = t.changes();
  await store.read((db) => { const market = db['market'] as MarketCollection; return [Object.keys(market.accounts), market.accounts['kano']?.['ada']?.cash, market.books['lagos']]; });
  assert.equal(t.changes(), before, 'a read writes nothing');
  await store.transact((db) => trade(db['market'] as MarketCollection, 'kano', 'bola', 'sell', quoteOf('kano', 'rice', NOW).ref + 10, 2));
  // The book and the accounts of Kano, and the root (the sequence and the tape): not Lagos, not Abuja.
  assert.equal(t.changes() - before <= 3, true, `${t.changes() - before} rows written for one order`);
  assert.equal(count(t, "SELECT COUNT(*) AS n FROM entries WHERE coll='market' AND map='accounts'"), 3);
});
