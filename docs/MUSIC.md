# Original game music

The soundtrack is generated on the device after the first user gesture. It ships no recordings, makes no music network requests, and requires no new dependency.

`src/audio/music/songs.ts` contains twelve original instrumental scores. `sequencer.ts` plays their intro, answering phrases, break, variation and outro on the audio clock. Every fifth selection uses a seeded composition. Context changes align to a bar and crossfade over 750 ms. Venues with their own music keep priority. A shared 24-note budget limits overlapping bands.

The listening revision raises each score by 6 BPM (Home's first selection, Evening Palm, moves from 88 to 94 BPM). Alternating soft shaker accents and a later pickup every fourth full bar add movement without adding notes. Melodies, instruments, sparse sections, mix levels and voice ducking retain the approved candidate's identity.

The scores, instruments, composer and initial lifecycle implementation were adapted from this repository's stopped local music candidate, commit `75f0d838632c0761dbdf73a6e79de8e1fdc30a58`, originating in `e0c8278d`. The source carries the repository's AGPL-3.0-or-later license. No third-party composition, sample, paid generation or recording from that candidate is included.

Ordinary ambience no longer holds a three-note chord. Environmental sounds remain, including contextual motors, rain, footsteps and sparse outdoor details. Fixed-key musical fragments were removed from the park and market so they cannot conflict with the soundtrack's changing harmony.

Music has an independent switch and volume. Its default is 40%, with a 0.25 trim into the same output ceiling as effects and ambience. Calls reduce music to 12% of its normal level; speech and useful effects also duck it. Quiet softens music and effects and removes ambience. Mute fades the mixed output before closing the context. Hiding the page releases scheduled music and suspends audio. The next allowed gesture can unlock it again.

The engine removes its listeners on disposal. Repeated navigation keeps one engine. Old stored preferences retain their values and acquire only the new music defaults.

Run the audio checks with:

```sh
node --test src/audio/*.test.ts src/audio/music/*.test.ts src/audio/voice/*.test.ts src/app/features/sim/soundSettingsModel.test.ts
npm run check:fast
```

The comparison and full task report live beside the isolated checkout in `../evidence/` and `../HANDOFF.md`. Neither this document nor those recordings establish subjective listening approval or production deployment.
