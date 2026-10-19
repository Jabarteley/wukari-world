// OWNER: social - the owambe upgrade (WOW-PLAN Phase 7): who came, the aso-ebi look on everyone, the notes a spray sends flying (a
// picture: no money moves), and the "who came" card's words.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NOTES, PARTY, asoEbiLook, noteAt, noteBurst, noteCame, partyView, whoCameWords } from './party.ts';
import type { PartyRecord } from './party.ts';

const party = (change: Partial<PartyRecord> = {}): PartyRecord => ({ title: 'Tola’s owambe', colour: 'gold', startedAt: 1000, until: 1000 + PARTY.minutes * 60000, sprays: 0, ...change });

test('who came: each once, in order, at most PARTY.cameMax; the view names them', () => {
  const p = party();
  noteCame(p, 'a', 'b', 'a'); noteCame(p, 'c', '');
  assert.deepEqual(p.came, ['a', 'b', 'c']);
  noteCame(p, ...Array.from({ length: 50 }, (_, i) => `g${i}`));
  assert.equal(p.came!.length, PARTY.cameMax);
  const names: Record<string, string> = { a: 'Ada', b: 'Bola', c: 'Chi' };
  const view = partyView(party({ came: ['a', 'b', 'c'] }), 'a', () => null, (id) => names[id] ?? '');
  assert.deepEqual(view.came, ['Ada', 'Bola', 'Chi']);
  assert.equal(partyView(party({ came: ['a'] }), 'a', () => null).came, undefined, 'without a namer the view stays as it was');
});

test('aso-ebi: the top in the party colour, in aso-oke; everything else stays the person’s own; nothing else changes', () => {
  const own = { body: 'woman', hair: 'braids', outfitColor: '#123456', fabric: 'plain', skin: '#8d5524' };
  const dressed = asoEbiLook(own, '#D9A21B');
  assert.deepEqual(dressed, { ...own, outfitColor: '#d9a21b', fabric: 'asooke' });
  assert.equal(own.outfitColor, '#123456', 'the saved look is not touched');
  assert.equal(asoEbiLook({}, 'not a colour').outfitColor, '#1b8a5a', 'a bad colour falls back to the first');
});

test('a spray’s notes: the same seed flies the same; they rise, then settle on the floor; a picture only', () => {
  const a = noteBurst(7), b = noteBurst(7);
  assert.deepEqual(a, b);
  assert.equal(a.length, NOTES.count);
  assert.notDeepEqual(noteBurst(8), a);
  for (const note of a) {
    assert.equal(noteAt(note, note.delay - 0.01), null, 'not before its delay');
    const up = noteAt(note, note.delay + 0.4)!, down = noteAt(note, note.delay + NOTES.seconds + 3)!;
    assert.ok(up.y > 1.4, 'it rises');
    assert.equal(down.y, 0.02, 'it lands on the floor');
  }
  // The home party's spray stays a counted cheer: nothing in the party rules, the service or the scene layer touches money.
  for (const file of ['src/festivals/party.ts', 'server/social/party.ts', 'src/scene/party-dress.ts']) assert.doesNotMatch(readFileSync(file, 'utf8'), /wallet|balance|transfer|money\s*[-+]=|cash\s*[-+]=/i, file);
});

test('the "who came" card: the title, the facts, twelve names and the rest counted; the host is not listed twice', () => {
  const colour = { id: 'gold', label: 'Gold', hex: '#d9a21b' };
  const words = whoCameWords({ title: 'Tola’s owambe', colour, sprays: 9, came: ['Tola', ...Array.from({ length: 14 }, (_, i) => `Guest ${i}`)] }, 'Tola');
  assert.equal(words.headline, 'Tola’s owambe');
  assert.equal(words.facts, 'Tola\'s owambe · 14 came · 9 sprays · Gold aso-ebi');
  assert.equal(words.names.length, 12); assert.equal(words.more, 2);
  assert.equal(whoCameWords({ title: 'x', colour, sprays: 1, came: [] }, 'Tola').facts, 'Tola\'s owambe · 0 came · 1 spray · Gold aso-ebi');
});
