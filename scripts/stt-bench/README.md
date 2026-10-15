# Speech to text: measuring both ways

The call screen can turn a person's voice into words in two ways (docs/CALLS.md "Speech to text"):

- **Browser** — the browser's own recognition (Web Speech API). Free, streams words while you speak, but on most phones the browser sends the audio to its maker.
- **Gateway** — a short recording goes to our server, which passes it to the gateway's transcription model (`microsoft/mai-transcribe-2`, about US$0.10 an hour of audio) and keeps nothing.

Standard recognition makes 3 to 10 times more mistakes on African-accented English, and the best Nigerian Pidgin result found was about 30% of words wrong. So the two are measured here, on
recordings of the accents the game is for, and the one that does better on **words wrong** and **delay** is the default (admin setting `agentCallStt`).

**The measurement has not been run yet: no recordings were available when this was built. The owner collects them (below).**

## What is measured

For each recording with a reference text: the **word error rate** (WER: substitutions + deletions + insertions over the words of the reference, case and punctuation ignored), and the
**delay** (milliseconds from the button being released to the words arriving). Reported per accent group and overall, for each way: `ng` Nigerian English, `gh` Ghanaian, `ke` Kenyan,
`gb` British English, `pidgin` Nigerian Pidgin. WER is total errors over total words, so a long sentence counts for its length. A recording the gateway fails on counts as every word wrong
and is listed as failed.

## Collect recordings (the owner)

1. Ask volunteers who speak each way. **Ask first, in plain words**: their voice is recorded for this test, kept by you, and never published. Do not use anyone's voice without a yes.
2. On the phone you want to measure (Chrome on Android, Safari on an iPhone; on mobile data for the real delay), open `scripts/stt-bench/collect.html` (send the file to the phone, or serve the
   folder on your computer: `npx serve scripts/stt-bench` — the page needs `https` or `localhost` for the microphone).
3. The volunteer ticks the consent box, picks their way of speaking, then **holds the button and reads each sentence**, lets go, checks the line under the button, and taps "Save and next". Twenty
   sentences per person is enough to start; several people per group is better than many sentences from one person.
4. The phone saves `ng-001.wav`, `ng-001.txt` (the sentence) and `ng-001.browser.json` (what the browser's own recognition heard and the delay) to Downloads. Put them in one folder
   on your computer, outside the repository (for example `~/stt-samples/`), one subfolder per group or just keep the file name prefix (`ng-`, `gh-`, `ke-`, `gb-`, `pidgin-`).
5. Recordings you already have work too: `<folder>/<group>/<id>.wav` (or `.mp3`, `.flac`, `.ogg`; not WebM or MP4, which the model rejects: convert with `ffmpeg -i in.m4a -ar 16000 -ac 1 out.wav`)
   with `<id>.txt` holding the words said. A recording with no `.txt` is skipped.

**Never commit recordings, reference texts of real people or the results file.** `~/stt-samples/` is outside the repository on purpose. Only the numbers go into docs/CALLS.md.

## Run

```sh
# The browser's results are read from the .browser.json files; add --gateway to run the gateway too (needs AI_GATEWAY_API_KEY; about US$0.10 per hour of audio, so a few cents).
AI_GATEWAY_API_KEY=... node --experimental-strip-types scripts/stt-bench.ts ~/stt-samples --gateway --json ~/stt-samples/rows.json
```

It prints a Markdown table (words wrong and delay per group and way). Paste it into docs/CALLS.md "Measurements" with the date, the phone and the network, and set `agentCallStt` on the
admin page to the way that wins. `--model` tries another transcription model, but only models on the no-training list in `server/models/transcribe.ts` are accepted (a person's voice is
their words). The gateway delay here is the round trip from the machine running the script; on a phone on mobile data the call also pays for the upload (about 32 KB a second of speech)
and our server's hop. Measure that too by timing a real call on the phone if the two ways are close.

## The tests

`bench.test.ts` checks the WER arithmetic, the grouping, the table and the gateway request on a made-up folder and a fake gateway. No real recording is in the repository.
