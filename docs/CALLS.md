# One-to-one voice calls

How a call connects, what the host needs for it to work on mobile data, the limits, and how to check that it does.
Rooms' voice circles are separate (`GET /api/voice-config`) and are not described here.

## How a call connects

1. The caller taps Call. The invite goes out and the microphone is asked for at once, so the permission prompt appears
   while the phone rings. The microphone track stays **disabled** until the audio is connected (and while muted).
2. The callee taps Answer, which asks for their microphone, and only then accepts. Nothing is gathered, sent or revealed
   before the accept: no connection object exists, no candidate is sent.
3. After `accepted`, each side asks the host for its connection servers over the social socket (`call-ice`). The answer
   (`call-ice`) is STUN plus, when the relay is on and a limit allows, **relay servers (UDP, TCP and TLS on 443) with
   credentials made for this call and this player**, valid one hour. The API token never leaves the host.
4. The caller offers, the callee answers, candidates trickle over the socket. Direct paths win; the relay is the automatic
   fallback (`iceTransportPolicy: all`).
5. `disconnected` or `failed` shows "Reconnecting…" and the caller restarts ICE (after 3 s, then every 6 s, at most 4
   times). Waits are bounded: 20 s to connect, 30 s to recover.
6. When connected, each side reads `getStats` every 2 s: the route (direct or relay), packet loss, round trip. The route
   is reported once per call to the host (`call-report`), which only counts it.

Why a call on mobile data needs the relay: carrier networks often put many phones behind one address and refuse
unsolicited inbound packets, so two devices cannot reach each other directly. Only a relay both can reach connects them.

## Settings (both hosts)

| Setting | Meaning | Default |
|---|---|---|
| `TURN_KEY_ID`, `TURN_API_TOKEN` | the relay provider's key (Cloudflare Realtime TURN). Both present = relay on | unset = off, STUN only |
| `CALL_RELAY_PER_PLAYER_DAY` | credentials one player may be given per UTC day | 30 |
| `CALL_RELAY_PER_ADDRESS_HOUR` | credentials one network address may be given per hour | 120 |
| `CALL_RELAY_DAILY_CEILING` | credentials the whole host gives out per UTC day | 3000 |

A call takes two credentials (one per side); a restart that needs fresh servers takes one more, at most three per side per
call. When a limit is reached the call is not refused: it carries on with STUN only and, if it then cannot connect, the
player is told "Could not connect — your networks need a relay that is not available right now." The old
`TURN_TEST_PUBLIC_IDS` / eight-a-day cap now belongs only to the room-voice test endpoint.

**Room voice uses the same relay.** Voice in a room (a venue, a home with guests, the Square, a group's room) is peer to peer too, so on mobile data it needs the relay as much as a call does. `GET /api/voice-config` asks this relay, under these limits and this daily ceiling, for a player who stands in a room: one credential when the page joins voice, good for an hour (`server/voice-relay.ts`). A limit reached is not an error: voice goes on with STUN only, as before.

On the Worker the daily count is kept in the Durable Object's own storage (table `call_relay_budget`), so the ceiling
holds across restarts; the per-player and per-address counts are in memory. On Node everything is in memory.

### Cost

Audio is Opus at about 32-40 kbit/s each way, roughly 0.6 MB per minute of relayed call for both directions together.
At Cloudflare's published rate (1000 GB a month free, then about 0.05 USD per GB; check the current price list, this is
from memory) the defaults bound the host to 1500 relayed calls a day. Ten minutes each would be about 9 GB a day:
inside the free allowance for 100+ days a month and under 0.50 USD a day beyond it. Not every credential becomes relayed
traffic: calls that connect directly use none.

## How to check that the relay is on

`curl https://<origin>/api/health` and read the boolean `relay`. `true` means both `TURN_KEY_ID` and `TURN_API_TOKEN` are
set on that host. It cannot say the key is valid; for that read the operator overview
(`GET /api/mod/overview`, bearer token), field `calls`:

```
calls: { relay, placed, connectedDirect, connectedViaRelay, failedToConnect, relayMintsToday, relayLimits }
```

All counts are for the current UTC day, with no names or ids. Many `failedToConnect` and no `connectedViaRelay` with
`relay: true` means the key is wrong or the provider is refusing; `relayMintsToday` near the ceiling means the limit is
what players are hitting.

## Sounds

Synthesised with the Web Audio API (no audio files): ringback for the caller, a different ring (and vibration on phones)
for the callee, short tones for connected, ended, declined and failed. The level is the shared `calls` sound level
(`src/audio/settings.ts`; the speaker button and Settings change it). Sound starts only after a tap on the page; a ring
that arrives earlier waits for the first touch and the card says so. A notification is shown for a hidden page only if the
player already allowed notifications. The call state is also announced to the game's sound system through the window
event `jaw:call-active` (`detail`: boolean).

## Screens

Call card (ringing, incoming, connecting), a draggable pill during the call, a summary for three seconds (eight when a
call failed), and one quiet line on devices that do not carry the call (docs/DEVICES.md). A missed call leaves a line in
Messages, Updates ("Missed call from …").

# Calls with AI characters, and AI characters in room voice (Phase 15)

A different kind of call from the one above: there is no second phone, no connection between devices and no relay. A person talks to one of the game's own AI-played characters (the house
agents of docs/HOUSE-AGENTS.md) by holding a button; their words go to the server as **text**; the character's answer comes back as **text** and the person's phone speaks it. Code:
`server/house/call-routes.ts` (routes), `server/house/call-limits.ts` (minutes and break reminder), `server/models/transcribe.ts` (speech to text through the gateway),
`src/app/features/calls/agentCall.ts` (the call as logic), `AgentCallScreen.vue` and `AgentCallList.vue` (screens, lazy), `stt.ts` and `sttBrowser.ts` (the two ways to turn speech into words).

## How a call with an AI character goes

1. **Starting.** Settings → AI characters → "Call an AI character" lists the characters standing in a place now (and each character you have talked to has a Call button on its card). The call
   screen opens with the **AI-played** mark, "An AI plays this character", the minutes left today, and the music fades (`jaw:call-active`, as for any call).
2. **Push-to-talk.** Hold the big button and speak (at most 15 seconds), let go. The words appear on the screen as yours, the character answers, and the answer is spoken. A text box is always there too, and is
   the only way on a phone with no recognition and no recorder. Space or Enter works as the button on a keyboard.
3. **The character's voice.** The server sends only text and a `voiceSeed` (the same number its lines have in a place, `server/voice-seed.ts`). The phone speaks it with the voice layer it already has for lines
   (`src/audio/voice/speech.ts`: only a voice that runs on the device is used, pitch and speed from the seed), so **no audio of the character crosses the network** and it costs nothing. A phone with no voice shows the words.
4. **What the character says** is the venue brain (`houseOf(...).answerCall` in `server/house/runner.ts`): written lines first, a paid model (purpose `agent-talk`, 220 tokens, only for what a written line cannot give)
   for the rest, the same `cleanReply` and `agentWords` checks as in a place, always as to a person who may be under 18 (no flirting on a call). Haggling and tasks stay in the place: on the phone an offer is answered with the
   list price. What it remembers of the person and the closeness are read as in a place (docs/AGENT-MEMORY.md); a call does not add new facts.
5. **Before the character sees a line** the game reads it: words of danger get the help lines of the character's country and the character is not told (`crisisWords`); a sincere "are you an AI?" is answered by the game
   ("... is an AI agent"). Both are shown on the call screen as the game's words, not the character's.
6. **Limits.** Minutes with AI characters per person per day and in total (below). Over either, the character says it will call back ("I will call you back tomorrow. You can still write to me in the place") and the call ends;
   starting a call over the limit plays the same line without opening a call. A **break reminder** (the game's words) shows every 10 minutes of a session of calls.

## Speech to text: both ways, behind one interface

| | Browser | Gateway |
| --- | --- | --- |
| What | the browser's own recognition (Web Speech API, `en-NG`) | a recording sent to `POST /api/agents/call/transcribe`, passed to `microsoft/mai-transcribe-2` |
| Cost | none | about US$0.10 an hour of audio (US$0.00002778 a second; checked on the gateway's model list, 15 Oct 2026) |
| Where audio goes | on most phones the **browser sends it to its maker**; the screen says so | to our server in memory, on to the gateway, **never stored**, not trained on (`no_training: all` on the model list) |
| Words while speaking | yes | no: after you let go |
| Where it exists | Chrome, Android, Safari | any browser with a recorder (it sends 16 kHz mono WAV: the model takes WAV, MP3, FLAC and Ogg but **not** WebM or MP4, which phones record) |

`src/app/features/calls/stt.ts` is the interface (`SttEngine`: `available()`, `begin()` → `Capture.stop()` → words and delay). `begin()` tries the chosen way and hands over to the other when the first is missing or fails to start;
a refused microphone is the person's answer and is not retried. A way that fails after the button is released is not used again in that call. The **person's choice** (Settings → AI characters, and on the call screen) is
kept on the phone: *Automatic* (the default), *My browser's own*, *Allworld's service*. *Automatic* follows the server's default, the admin setting `agentCallStt` (`browser` or `gateway`), which is set to the winner of the
measurements below. Until they exist it is `browser`: free, and nothing of the voice reaches us.

### The gateway route

`POST /api/agents/call/transcribe { call, audio (base64), mediaType, csrf }` → `{ text }`. API as the gateway documents it (https://vercel.com/docs/ai-gateway/modalities/speech-to-text): `POST {gateway}/v4/ai/transcription-model`,
headers `Authorization`, `ai-gateway-protocol-version: 0.0.1`, `ai-transcription-model-specification-version: 4`, `ai-model-id`, JSON body `{ audio, mediaType }`, answer `{ text, durationInSeconds, ... }`; no multipart.

- **Size**: the request body is at most 1 MB, the audio at most 720,000 bytes and 20 seconds (a 15-second hold is 480 KB of WAV); a bigger one is refused with 413 `audio_too_big` before anything is sent on.
- **Not stored**: the recording and its words live in the request's memory. The ledger keeps only the cost and a count; a test searches the whole stored document for the audio. Nothing is logged.
- **A person's voice is their words**: only models the gateway lists as `no_training: all` are used (`NO_TRAINING` in `server/models/transcribe.ts`); the admin setting `agentCallSttModel` naming any other is ignored.
- **Budget**: through the model router (`router.spend`): the worst case of the longest recording is reserved against the day's US$2.00 cap and the person's own caps before the request is sent, and the real cost (seconds the
  provider reported times the price) is booked after. Parallel recordings cannot all pass the same check. At the cap the route answers 503 `transcription_resting` ("Type, or use your browser's own") and the page falls
  back. A failed provider books nothing.
- **Off**: `agentCallGatewayStt` off, or no gateway key, answers 503 `transcription_off`, and `GET /api/agents/call/config` tells the page, which then offers only the browser's way.

## Limits (settings on the admin page, no release needed)

| Setting | Meaning | Default |
| --- | --- | --- |
| `agentCallsOn` | calls with AI characters on | on |
| `agentCallPlayerMinutes` | minutes per person per UTC day (0 turns calls off) | 20 |
| `agentCallTotalMinutes` | minutes for everyone together per UTC day | 300 |
| `agentCallBreakMinutes` | a session of calls (gaps under 15 minutes) gets a break reminder every this many minutes; 0 is off | 10 |
| `agentCallStt` | the default way: `browser` or `gateway` | `browser` |
| `agentCallGatewayStt` / `agentCallSttModel` | gateway transcription on; the model (no-training list only) | on / `microsoft/mai-transcribe-2` |

Time is the call's wall time: every request of a call charges the time since the one before, at most 90 seconds at a time (a phone put down without hanging up costs a minute and a half, not an hour); a call with nothing for
three minutes is over. The ledger (`server/house/call-limits.ts`, collection `agentCalls`, written lazily) holds seconds per one-way person key per day, kept three days. The operator page shows minutes used, people who called
and calls open ("Calls with AI characters"). Cost at the defaults, worst case: 300 minutes of transcription is US$0.50 a day, inside the model budget the router enforces anyway; a text model reply is about a tenth of a cent.

## Measurements

The two ways are measured on recordings of Nigerian, Ghanaian, Kenyan and British English and Pidgin: **words wrong** and **delay**. The harness is `scripts/stt-bench.ts`; how to record or obtain samples, and the rules
(consent, never commit a recording), are in [scripts/stt-bench/README.md](../scripts/stt-bench/README.md). **No recordings were available when this was built, so nothing has been measured. The owner collects them.**

| Accent group | Recordings | Browser: words wrong | Browser: delay (median / 90th) | Gateway: words wrong | Gateway: delay (median / 90th) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Nigerian English | 0 | not yet measured | not yet measured | not yet measured | not yet measured |
| Ghanaian English | 0 | not yet measured | not yet measured | not yet measured | not yet measured |
| Kenyan English | 0 | not yet measured | not yet measured | not yet measured | not yet measured |
| British English | 0 | not yet measured | not yet measured | not yet measured | not yet measured |
| Nigerian Pidgin | 0 | not yet measured | not yet measured | not yet measured | not yet measured |

Background (docs/agent-plans/world-alive/FEATURES.md rule 5): standard recognition makes 3 to 10 times more mistakes on African-accented English, and the best Nigerian Pidgin result found was 29.6% of words wrong. When the
table is filled, set `agentCallStt` to the way that wins on both columns (if one wins words and the other delay, prefer words), and write the date, phone and network under it.

## AI characters in room voice

A venue's voice circle (`GET /api/voice-config`, above) is people speaking to each other. An AI character in the place speaks into it **as text only**:

- When a house agent or an agent character says a line in a place (`agentRoom.say`, `server/ws/rooms.ts`), the line goes to everyone as the usual `chat` frame, and **also** to the people in that place's voice circle as a
  `voice-text` frame (`VoiceTextFrame` in `src/types/protocol.ts`): the same id, the text, the AI-played mark, the character's `voiceSeed` and where it stands (`x`, `z`). People who are not in voice get the chat line only.
- The listener's page (`src/community.ts`) speaks it with the phone's own voice for that seed (the voice layer's `speakable` line: spoken wherever the character stands, **quieter the farther it is**, like a person's voice
  heard near or far), and does not also speak the chat line.
- **AI characters do not listen to room voice.** They are not connections of the room, so they are sent no `voice-text`, no `signal` and no audio; people talk to them by writing in the place or by calling them.

## What to check by hand on a phone on mobile data

See the end of the Phase 15 report (docs/agent-plans/world-alive/STATUS.md): turn Wi-Fi off, hold, speak, let go; the answer is heard in the character's voice within a few seconds; the browser way and the gateway way
both work and the line under the button names the one used; airplane mode on mid-call shows a plain error and the call can go on; the minutes shown go down; the break reminder shows after ten minutes; a place with an AI character
and someone in voice speaks its lines on that phone.
