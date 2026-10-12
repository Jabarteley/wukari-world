# Alive places: people, motion, voice, memory, gossip

What a player sees in a public venue, and where it lives. Companion to `REALISM.md` (behaviour, memory, city life) and `EMBODIMENT.md` (bodies).

## 1. Presence

`src/scene/ambient/`. Every public venue scene can hold background people besides its regulars and the players: walkers who cross it, people who sit on real seats, pairs who talk, people on the phone, and a far crowd that fills the back.

- **How many** is `density.ts`: a curve of the Lagos hour for each scene kind (a market is busy at ten and quiet at ten at night, a bar the reverse, a park fills at the cool ends of the day, a viewing centre for the football), times a weather factor (open places thin out in rain, indoor ones hold), capped by the device tier (`full`, `light` for a weak phone: three walkers, no far crowd, `off`).
- **Who and where** is `plan.ts`, a pure function of (city, venue, time): the cast of a quarter hour, the walkers of a 40-second wave, and each person's track (keys with times). Two players in one place see the same people with no traffic between them. Routes come from the scene's own walk grid, so people go round furniture; before a wave starts, a walker who would come within a body's width of another person or a regular is held back or sent another way. People come in by the scene's door (and, in an open place, its edges) and leave the same way, spread over the turn of the quarter, so nobody pops in or out.
- **Seats** are real: props that draw a chair, stool, bench or sofa report where its seat is (`Batch.seat`, recorded by `footprintRecorder`), and sitters walk to the free ground in front of one and sit on it.
- **Budget**: `layer.ts` is told what the scene has left of 17,000 triangles and 60 draw calls and spends it in this order: the regulars (full figures), up to four more full figures, then lean figures (about 170 triangles, one mesh, for the people who walk and sit further from the camera), then the far crowd (about 60 triangles a person, one merged mesh). When the scene is full it builds fewer, and never more than fits. The scene's own crowd and the player count first.
- **Weight**: `hub.ts` is all the scene's own chunk carries. The layer, the plan, the density curves and the figures are a lazy chunk fetched after the first frame, and never fetched for a device told to show nobody.

## 2. Motion

- Standing people shift their weight, look at a phone, wave (`poseOf`), on a seeded rhythm; talking pairs face each other and one gestures while the other listens; a regular turns to a chatter partner for the length of their exchange (`talk`).
- Everyone who stands still glances at the player who comes close (`space.ts` gaze, the same machine other players use); a walker steps aside rather than through the player.
- The regulars (up to six) are drawn by the layer when it is on, so they have all of the above; the rest stay in the scene's merged batch as before.

## 3. Voice

`src/game/chatter/voice.ts`, driven by `src/app/chatter/ambient.ts`. About one slot in two (a slot is nine seconds) holds a short line over a person: greetings by band of the day, the weather, football, traffic, prices, what is on today from the city's calendar. A line the player has heard in the session is never picked again, a visit hears at most fourteen, and the first five seconds are silent. The pick is deterministic from (city, venue, slot, crowd). Anonymous lines are bubbles in the scene itself (tag kind `bark`, marked NPC); a regular's line is the existing bubble over their name tag.

## 4. Memory

A regular keeps two small counters per player on the relationship that already exists (`Relationship.v` days met, `Relationship.b` services that went through, both at most 99), beside closeness (`p`), the last day (`d`) and the facts (`m`). `standingOf` (`src/game/memory/mind.ts`) reads them as new, known, cold, regular, friend or neglected, and `meet()` greets accordingly: a new face formally, a regular customer by name with a small treat on every third visit (the existing grocery coupon, five per cent, never stacked), someone gone a week with a remark. A life saved before the counters existed has no `v`: it reads as one visit and counts from there; invalid values are dropped at load.

## 5. Gossip

`src/game/chatter/gossip.ts`. A regular passes on only what is in `PublicRecord`: civic headlines the life was told, an event on the city's calendar, the sky, and (when a source supplies them) a shop that opened, the board's leading city, an office holder and a housewarming's street. There is no field for money, place, messages or online status, so there is nothing to leak; `voice.test.ts` hands the builder a record poisoned with such fields and fails if one comes out, and reads the source for forbidden words.

## Swapping the look

`src/scene/ambient/figure.ts` is the one place a background person is made: `makeFigure(kit, { seed, pose, step, seat })` and `makeFarFigures(kit, people)`. Replace those two functions when the new character models arrive; the plan, the paths, the voice and the memory do not change.

## Frames

A scene is drawn on demand. The layer asks for frames only inside a window of twelve seconds (`WINDOW_MS`), opened when the player arrives, when a quarter hour turns while they stay, when they walk or tap, and when someone speaks; then the loop ends and people stand where they were. A weak phone or reduced motion places the people once, standing, and never opens a window. `layer.test.ts` counts the frames.

## Voices (heard, not just seen)

`src/audio/voice/`, a lazy chunk of the audio engine, fetched on the first line that is to be heard (after the first tap). The game raises three window events through `emit.ts` (`jaw:voice` a line, `jaw:voice-scene` who is in the place and what they do, `jaw:voice-stop`); the engine listens and nothing else imports the voices.

- **Talk sounds** (`syllables.ts`, `talk.ts`): a line becomes one soft vowel-like blip per syllable, paced by the text (a pause at a space, longer at a comma, longest at a full stop; a question climbs, an exclamation lifts). One glottal-ish source runs through three band-pass formants whose centres glide from vowel to vowel. Everything is scheduled on the audio clock when the line appears.
- **A voice from a seed** (`seed.ts`): pitch, pace, breath, vowel tract, vibrato and brightness come from a stable seed (a regular's id, a player's public id, or a voice seed the server puts on a line), so each person always sounds like themselves; men, women, youths and elders sit in different ranges.
- **Place and cap** (`spatial.ts`, `cap.ts`): loudness, dullness and stereo pan follow distance and screen position (far speakers are a quiet murmur). At most three voices sound at once, nearest first; a farther newcomer is not heard.
- **Spoken words, optional** (`speech.ts`): the browser's own speech synthesis for the nearest speaker only, with a voice that runs on the device (never one that sends text to a server), the African English locale first, pitch and rate from the same seed, queued so lines never overlap, cancelled when the scene changes or the page is hidden. No voice on the device means the talk sounds carry on. Setting: Spoken voices Off / Sounds / Speech (default Sounds); Quiet keeps speech off.
- **Human sounds** (`cues.ts`, `sounds.ts`): a laugh after a reply, a call between two walkers, a hum from a lone sitter, a whistle outdoors, a seller's call at a market, a cheer when a goal is spoken at a viewing centre, and the footsteps of the nearest two walkers. At most one vocal cue every eight seconds, each kind on its own cooldown.
- **Never private**: only bubbles over people and venue chat lines are voiced; direct messages never are.
- **Measuring** (`scripts/voice-render/run.ts`): renders sample voices and three places offline in a headless browser through the game's own mixer, with loudness, pitch and spectra, WAV files and spectrograms.
