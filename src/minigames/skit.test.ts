// OWNER: minigames — the skit (docs/MINI-GAMES.md): composing, bounds, the timeline, and the promise that nothing in it records sound.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BACKDROPS, CAPTION_MAX, END_MS, LENGTHS, MAX_ACTORS, MAX_BEATS, MIN_BEAT_MS, POSES, SAFETY_MS, TITLE_MAX, TITLE_MS, addActor, addBeat, beatMs, frameAt, hueOf, maxBeats, newSkit, recordMs, removeActor, removeBeat, sanitize, setCaption, setLength, setPose, setTitle, wordsOf } from './skit.ts';
import type { Skit } from './skit.ts';
import { POSES as GAME_POSES } from '../models/people/index.ts';

const ME = { id: 'p_me', name: 'Ada' };
const friends = ['f1', 'f2', 'f3', 'f4'].map((id) => ({ id, name: `Friend ${id}` }));

test('the poses are the game\'s own, and every backdrop is a place with a sky and a floor', () => {
  for (const pose of POSES) assert.ok((GAME_POSES as readonly string[]).includes(pose), `${pose} is one of the game's poses`);
  assert.equal(new Set(POSES).size, POSES.length);
  assert.ok(BACKDROPS.length >= 5 && BACKDROPS.some((place) => place.id === 'home'));
  for (const place of BACKDROPS) assert.ok(place.sky.length === 2 && /^#/.test(place.floor), place.id);
});

test('a new skit is the person alone with two beats; editing keeps every beat one pose per actor and stops at four actors', () => {
  let skit = newSkit(ME);
  assert.deepEqual(skit.actors, [{ id: 'p_me', name: 'Ada', you: true }]);
  assert.ok(skit.beats.length >= 1 && skit.lengthMs === 30_000);
  for (const friend of friends) skit = addActor(skit, friend);
  assert.equal(skit.actors.length, MAX_ACTORS, 'up to three friends');
  assert.deepEqual(skit.actors.map((actor) => actor.you), [true, false, false, false]);
  assert.ok(skit.beats.every((beat) => beat.poses.length === MAX_ACTORS));
  assert.equal(addActor(skit, { id: 'f1', name: 'again' }), skit, 'no one twice');
  skit = setPose(skit, 0, 2, 'dance');
  assert.equal(skit.beats[0]!.poses[2], 'dance');
  assert.equal(setPose(skit, 0, 2, 'fly' as never), skit, 'only the game\'s poses');
  assert.equal(setPose(skit, 9, 0, 'sit'), skit);
  skit = removeActor(skit, 'f2');
  assert.deepEqual(skit.actors.map((actor) => actor.id), ['p_me', 'f1', 'f3']);
  assert.ok(skit.beats.every((beat) => beat.poses.length === 3));
  assert.equal(skit.beats[0]!.poses[1], 'stand', 'the others kept their own poses');
  assert.equal(removeActor(skit, 'p_me'), skit, 'the person cannot be removed from their own skit');
});

test('beats: as many as the length can hold, each at least two seconds; a shorter length drops the extra', () => {
  assert.equal(maxBeats(30_000), MAX_BEATS);
  assert.equal(maxBeats(15_000), Math.floor((15_000 - TITLE_MS - END_MS) / MIN_BEAT_MS));
  let skit = newSkit(ME);
  while (skit.beats.length < MAX_BEATS) skit = addBeat(skit);
  assert.equal(addBeat(skit), skit, 'no more than the limit');
  assert.ok(beatMs(skit) >= MIN_BEAT_MS);
  skit = setLength(skit, 15_000);
  assert.equal(skit.beats.length, maxBeats(15_000));
  assert.ok(beatMs(skit) >= MIN_BEAT_MS, 'every beat still has its two seconds');
  assert.equal(removeBeat(removeBeat(skit, 0), 0).beats.length >= 1, true, 'a skit keeps at least one beat');
  assert.deepEqual([...LENGTHS], [15_000, 30_000]);
  assert.equal(recordMs(skit), 15_000 - SAFETY_MS, 'the recording stops before the capture limit');
  assert.ok(recordMs(newSkit(ME)) < 30_000);
});

test('captions and the title are tidied and cut; the words of a skit are listed for the server\'s filter', () => {
  let skit = newSkit(ME);
  skit = setTitle(skit, `  ${'x'.repeat(100)}  `);
  assert.equal(skit.title.length, TITLE_MAX);
  skit = setCaption(skit, 0, 'a\n\nb\t  c');
  assert.equal(skit.beats[0]!.caption, 'a b c');
  skit = setCaption(skit, 1, 'y'.repeat(300));
  assert.equal(skit.beats[1]!.caption.length, CAPTION_MAX);
  assert.equal(setCaption(skit, 9, 'nope'), skit);
  assert.deepEqual(wordsOf(skit), { title: skit.title, captions: skit.beats.map((beat) => beat.caption) });
});

test('sanitize: anything saved or sent is bounded before it is played', () => {
  assert.equal(sanitize(null), null);
  assert.equal(sanitize({}), null);
  assert.equal(sanitize({ actors: [{ id: 'x', name: 'N', you: false }], beats: [{ poses: ['stand'] }] }), null, 'the person must be in it');
  const wild = sanitize({
    title: 'T'.repeat(80), backdrop: 'moon', lengthMs: 99_999,
    actors: [{ id: 'a', name: 'A'.repeat(50) }, { id: 'me', name: 'Me', you: true }, { id: 'me', name: 'dup', you: true }, ...Array.from({ length: 8 }, (_, n) => ({ id: `z${n}`, name: 'Z' }))],
    beats: Array.from({ length: 20 }, () => ({ poses: ['fly', 'sit'], caption: 'c'.repeat(200) })),
  })!;
  assert.equal(wild.actors.length, MAX_ACTORS);
  assert.equal(wild.actors[0]!.you, true, 'the person comes first');
  assert.equal(wild.actors.filter((actor) => actor.you).length, 1);
  assert.equal(wild.backdrop, 'street');
  assert.equal(wild.lengthMs, 30_000);
  assert.equal(wild.beats.length, MAX_BEATS);
  assert.ok(wild.beats.every((beat) => beat.poses.length === wild.actors.length && beat.poses.every((pose) => (POSES as readonly string[]).includes(pose)) && beat.caption.length <= CAPTION_MAX));
  assert.equal(wild.title.length, TITLE_MAX);
  assert.ok(wild.actors.every((actor) => actor.name.length <= 24));
});

test('the timeline: a title card, the beats in turn, then the end card', () => {
  let skit: Skit = newSkit(ME);
  skit = setPose(setCaption(skit, 0, 'First'), 1, 0, 'dance');
  const body = skit.lengthMs - TITLE_MS - END_MS;
  assert.equal(frameAt(skit, 0).phase, 'title');
  assert.equal(frameAt(skit, TITLE_MS - 1).phase, 'title');
  const first = frameAt(skit, TITLE_MS + 10);
  assert.deepEqual({ phase: first.phase, beat: first.beat, caption: first.caption }, { phase: 'beat', beat: 0, caption: 'First' });
  const second = frameAt(skit, TITLE_MS + body / skit.beats.length + 10);
  assert.deepEqual({ beat: second.beat, pose: second.poses[0] }, { beat: 1, pose: 'dance' });
  assert.equal(frameAt(skit, TITLE_MS + body + 5).phase, 'end');
  assert.equal(frameAt(skit, skit.lengthMs).progress, 1);
  assert.equal(frameAt(skit, -50).phase, 'title');
  assert.equal(frameAt(skit, 10 ** 9).phase, 'end');
  assert.equal(frameAt(skit, TITLE_MS + body + 5).caption, '', 'no caption on the end card');
  for (let ms = 0; ms <= skit.lengthMs; ms += 250) { const f = frameAt(skit, ms); assert.ok(f.progress >= 0 && f.progress <= 1 && f.beat >= 0 && f.beat < skit.beats.length, `${ms}`); }
});

test('every actor gets a stable shade of their own', () => {
  assert.equal(hueOf('abc'), hueOf('abc'));
  assert.notEqual(hueOf('abc'), hueOf('abd'));
  assert.ok(hueOf('x') >= 0 && hueOf('x') < 360);
});

test('nothing in the skit studio can record sound: no microphone, no audio track, no upload', () => {
  const here = fileURLToPath(new URL('.', import.meta.url)), studio = join(here, '..', 'app', 'features', 'minigames');
  const files = [join(here, 'skit.ts'), ...readdirSync(studio).filter((name) => /\.(ts|vue)$/.test(name) && !name.endsWith('.test.ts')).map((name) => join(studio, name))];
  assert.ok(files.length >= 8);
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /getUserMedia|AudioContext|MediaRecorder|audio:\s*true|\bnavigator\.mediaDevices/, `${file} never asks for the microphone`);
    assert.doesNotMatch(source, /\bfetch\(|XMLHttpRequest|sendBeacon/, `${file} uploads nothing by itself`);
  }
  const app = readFileSync(join(studio, 'SkitApp.vue'), 'utf8');
  assert.match(app, /No sound\./, 'the studio says so');
  assert.match(app, /never asks for your microphone/);
  assert.match(app, /adoptCapture/, 'the clip goes through Capture, which adds the @handle mark');
  assert.match(app, /checkSkit/, 'the words are checked by the server first');
});
